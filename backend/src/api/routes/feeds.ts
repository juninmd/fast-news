import { Request, Response, Router } from "express";
import { config } from "../../config/env.js";
import { query } from "../../database/client.js";
import { cacheGet, cacheSet } from "../../services/cache.js";
import {
	DIGEST_PERIODS,
	type DigestPeriod,
	isDigestPeriod,
	renderDigestMarkdown,
	renderDigestScript,
	renderDigestText,
} from "../../services/digestBuilder.js";
import { getDigest } from "../../services/digestData.js";
import {
	buildJsonFeed,
	buildRss,
	type FeedItem,
	type FeedMeta,
} from "../../services/feedOutput.js";
import { scriptHash, synthesize, ttsEnabled } from "../../services/tts.js";

export const feedsRouter: Router = Router();

const base = () => config.publicUrl.replace(/\/$/, "");

function meta(req: Request, kind: "xml" | "json"): FeedMeta {
	const scope = req.query["scope"] === "ai" ? "ai" : "all";
	const qs = new URLSearchParams(
		Object.entries(req.query).filter(
			([, v]) => typeof v === "string" && v.length > 0,
		) as [string, string][],
	).toString();
	return {
		title: scope === "ai" ? "Fast News — IA" : "Fast News",
		description:
			scope === "ai"
				? "Notícias de inteligência artificial curadas pelo Fast News"
				: "Notícias curadas pelo Fast News",
		homeUrl: base(),
		selfUrl: `${base()}/api/feed.${kind}${qs ? `?${qs}` : ""}`,
		...(config.websub.hubUrl ? { hubUrl: config.websub.hubUrl } : {}),
	};
}

function clamp(raw: unknown, fallback: number, max: number): number {
	const n = Number.parseInt(String(raw ?? ""), 10);
	return Number.isFinite(n) && n >= 1 ? Math.min(n, max) : fallback;
}

function snippet(s: string | null): string | null {
	if (!s) return null;
	const t = s
		.replace(/<[^>]*>/g, " ")
		.replace(/\s+/g, " ")
		.trim();
	return t ? t.slice(0, 300) : null;
}

async function loadItems(req: Request): Promise<FeedItem[]> {
	const limit = clamp(req.query["limit"], 50, 100);
	const category = req.query["category"] as string | undefined;
	const ai = req.query["scope"] === "ai";
	const minScore = clamp(req.query["minScore"], 1, 10);
	const key = `feed:${limit}:${category ?? "all"}:${ai}:${minScore}`;
	const cached = await cacheGet<FeedItem[]>(key);
	if (cached) return cached;

	const params: unknown[] = [limit, minScore];
	const where = [
		"COALESCE(is_spam_or_promo, FALSE) = FALSE",
		"published_at <= NOW()",
		"COALESCE(relevance_score, $2) >= $2",
	];
	if (category) {
		params.push(category);
		where.push(
			`(category = $${params.length} OR theme_category = $${params.length})`,
		);
	}
	if (ai) where.push("is_ai = TRUE");
	const res = await query<{
		id: string;
		title: string;
		url: string;
		source: string;
		category: string;
		summary: string | null;
		content: string | null;
		published_at: string;
		image_url: string | null;
	}>(
		`SELECT id, title, url, source, category, summary, LEFT(content, 600) AS content,
		        published_at, image_url
		 FROM news_articles
		 WHERE ${where.join(" AND ")}
		 ORDER BY published_at DESC NULLS LAST
		 LIMIT $1`,
		params,
	);
	const items = res.rows.map((r) => ({
		id: r.id,
		title: r.title,
		url: r.url,
		source: r.source,
		category: r.category,
		summary: snippet(r.summary ?? r.content),
		publishedAt: r.published_at,
		imageUrl: r.image_url,
	}));
	await cacheSet(key, items, 300);
	return items;
}

// GET /api/feed.xml — RSS 2.0 of the (filterable) stream. ?scope=ai&category=&minScore=&limit=
feedsRouter.get("/feed.xml", async (req: Request, res: Response) => {
	const items = await loadItems(req);
	res
		.type("application/rss+xml; charset=utf-8")
		.set("Cache-Control", "public, max-age=300")
		.send(buildRss(items, meta(req, "xml")));
});

// GET /api/feed.json — JSON Feed 1.1, same filters.
feedsRouter.get("/feed.json", async (req: Request, res: Response) => {
	const items = await loadItems(req);
	res
		.type("application/feed+json; charset=utf-8")
		.set("Cache-Control", "public, max-age=300")
		.send(JSON.stringify(buildJsonFeed(items, meta(req, "json"))));
});

function periodParam(req: Request, res: Response): DigestPeriod | null {
	const p = req.params["period"];
	if (!isDigestPeriod(p)) {
		res.status(400).json({
			error: `period must be one of: ${Object.keys(DIGEST_PERIODS).join(", ")}`,
		});
		return null;
	}
	return p;
}

// GET /api/digests/:period — 4h | daily | weekly | monthly. ?format=json|md|txt|script &scope=ai
// Built from stored relevance scores and story coverage: no model call.
feedsRouter.get("/digests/:period", async (req: Request, res: Response) => {
	const period = periodParam(req, res);
	if (!period) return;
	const items = await getDigest(period, { ai: req.query["scope"] === "ai" });
	const format = (req.query["format"] as string | undefined) ?? "json";
	const now = new Date();
	switch (format) {
		case "md":
			return res
				.type("text/markdown; charset=utf-8")
				.send(renderDigestMarkdown(items, period, now));
		case "txt":
			return res
				.type("text/plain; charset=utf-8")
				.send(renderDigestText(items, period, now));
		case "script":
			return res
				.type("text/plain; charset=utf-8")
				.send(renderDigestScript(items, period, now));
		default:
			return res.json({
				period,
				label: DIGEST_PERIODS[period].label,
				generatedAt: now.toISOString(),
				data: items,
			});
	}
});

// GET /api/digests/:period/audio.mp3?h=<script hash> — TTS of the digest script (opt-in, cached, capped).
feedsRouter.get(
	"/digests/:period/audio.mp3",
	async (req: Request, res: Response) => {
		const period = periodParam(req, res);
		if (!period) return;
		if (!ttsEnabled())
			return res.status(404).json({ error: "TTS is not configured" });
		const items = await getDigest(period, { ai: req.query["scope"] === "ai" });
		const script = renderDigestScript(items, period);
		// Only the current script can be synthesized: clients cannot make us speak arbitrary text.
		if (req.query["h"] && req.query["h"] !== scriptHash(script))
			return res
				.status(410)
				.json({ error: "Digest changed; refresh the podcast feed" });
		const audio = await synthesize(script);
		if (!audio)
			return res
				.status(503)
				.json({ error: "TTS unavailable or daily limit reached" });
		res
			.type("audio/mpeg")
			.set("Cache-Control", "public, max-age=86400")
			.send(audio);
	},
);

// GET /api/podcast.xml?period=daily — podcast feed whose episode is the current digest. Empty when TTS is off.
feedsRouter.get("/podcast.xml", async (req: Request, res: Response) => {
	const p = req.query["period"] ?? "daily";
	const period: DigestPeriod = isDigestPeriod(p) ? p : "daily";
	const ai = req.query["scope"] === "ai";
	const esc = (s: string) =>
		s
			.replace(/&/g, "&amp;")
			.replace(/</g, "&lt;")
			.replace(/>/g, "&gt;")
			.replace(/"/g, "&quot;");
	let item = "";
	if (ttsEnabled()) {
		const items = await getDigest(period, { ai });
		if (items.length) {
			const now = new Date();
			const hash = scriptHash(renderDigestScript(items, period));
			const url = `${base()}/api/digests/${period}/audio.mp3?h=${hash}${ai ? "&scope=ai" : ""}`;
			item = `    <item>
      <title>${esc(`${DIGEST_PERIODS[period].label} — ${now.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}`)}</title>
      <guid isPermaLink="false">${period}-${hash}</guid>
      <pubDate>${now.toUTCString()}</pubDate>
      <description>${esc(renderDigestText(items, period, now))}</description>
      <enclosure url="${esc(url)}" type="audio/mpeg" length="0"/>
    </item>
`;
		}
	}
	res
		.type("application/rss+xml; charset=utf-8")
		.send(`<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Fast News — ${esc(DIGEST_PERIODS[period].label)}</title>
    <link>${esc(base())}</link>
    <description>Áudio do resumo de notícias do Fast News</description>
    <language>pt-BR</language>
${item}  </channel>
</rss>
`);
});
