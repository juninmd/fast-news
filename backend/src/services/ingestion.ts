import { createHash } from "node:crypto";
import { generateText } from "ai";
import Parser from "rss-parser";
import { config } from "../config/env.js";
import { query } from "../database/client.js";
import { upsertVector } from "../database/vectorStore.js";
import { getFastModel } from "./aiProvider.js";
import { extractImageUrl, fetchOgImage } from "./articleImage.js";
import { sanitizeFeedContent } from "./articleText.js";
import { buildArticleRelations } from "./correlation.js";
import { embedDocument, vectorToSQL } from "./embeddings.js";
import { buildEmbeddingText } from "./embeddingText.js";
import { fetchFullArticle } from "./fullArticle.js";
import { getActiveFeeds } from "./sources.js";

const parser = new Parser({
	customFields: {
		item: [
			["media:content", "mediaContent", { keepArray: true }],
			["media:thumbnail", "mediaThumbnail", { keepArray: true }],
			["media:group", "mediaGroup"],
			["content:encoded", "contentEncoded"],
			["itunes:image", "itunesImage"],
			"image",
			"thumbnail",
			"enclosure",
		],
	},
});

/** Bounds concurrent work per key (host, or a fixed budget for LLM calls) to avoid rate limits. */
class KeyedSemaphore {
	private active = new Map<string, number>();
	private queues = new Map<string, Array<() => void>>();
	constructor(private limit: number) {}

	async run<T>(key: string, fn: () => Promise<T>): Promise<T> {
		await this.acquire(key);
		try {
			return await fn();
		} finally {
			this.release(key);
		}
	}

	private acquire(key: string): Promise<void> {
		const active = this.active.get(key) ?? 0;
		if (active < this.limit) {
			this.active.set(key, active + 1);
			return Promise.resolve();
		}
		return new Promise((resolve) => {
			const q = this.queues.get(key) ?? [];
			q.push(resolve);
			this.queues.set(key, q);
		});
	}

	private release(key: string): void {
		const q = this.queues.get(key);
		if (q && q.length > 0) {
			q.shift()?.();
			return;
		}
		this.active.set(key, Math.max(0, (this.active.get(key) ?? 1) - 1));
	}
}

// Max 1 concurrent request per news portal host — avoids hammering a single portal's rate limit.
const hostGate = new KeyedSemaphore(1);

/** Fetch feed XML with proper charset decoding (handles ISO-8859-1 / Windows-1252 Brazilian feeds) */
async function fetchXml(url: string): Promise<string> {
	const ac = new AbortController();
	const t = setTimeout(() => ac.abort(), config.ingestion.feedFetchTimeoutMs);
	try {
		const resp = await fetch(url, {
			signal: ac.signal,
			headers: { "User-Agent": "FastNews/1.0" },
		});
		if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
		const buf = await resp.arrayBuffer();
		const contentType = resp.headers.get("content-type") ?? "";
		const headerCharset = contentType.match(/charset=([^\s;'"]+)/i)?.[1];
		// XML prolog encoding wins over a generic/absent HTTP charset — BR feeds
		// often serve ISO-8859-1 bodies while declaring utf-8 (or nothing) in HTTP.
		const prolog = new TextDecoder("ascii").decode(buf.slice(0, 200));
		const prologCharset = prolog.match(/encoding=["']([^"']+)["']/i)?.[1];
		let charset = (prologCharset ?? headerCharset ?? "utf-8").toLowerCase();
		// Normalize: TextDecoder accepts 'windows-1252' as alias for latin-1 variants
		if (["iso-8859-1", "latin1", "latin-1", "cp1252"].includes(charset))
			charset = "windows-1252";
		let decoded: string;
		try {
			decoded = new TextDecoder(charset, { fatal: false }).decode(buf);
		} catch {
			decoded = new TextDecoder("utf-8").decode(buf);
		}
		// Safety net: U+FFFD means the charset guess was wrong (e.g. utf-8 header on a
		// latin-1 body with no prolog). windows-1252 maps every byte, so it never
		// yields U+FFFD — retry there before persisting irrecoverable mojibake.
		if (charset !== "windows-1252" && decoded.includes("�")) {
			decoded = new TextDecoder("windows-1252").decode(buf);
		}
		return decoded;
	} finally {
		clearTimeout(t);
	}
}

function timeoutSignal(ms: number): AbortSignal {
	return AbortSignal.timeout(ms);
}

function runBackground(label: string, task: () => Promise<unknown>): void {
	task().catch((err: Error) => {
		console.error(`[ingestion] ${label} failed:`, err.message);
	});
}

async function withRetry<T>(
	fn: () => Promise<T>,
	retries = 3,
	delayMs = 1000,
): Promise<T> {
	let lastErr: unknown;
	for (let attempt = 1; attempt <= retries; attempt++) {
		try {
			return await fn();
		} catch (err) {
			lastErr = err;
			if (attempt < retries)
				await new Promise((r) => setTimeout(r, delayMs * attempt));
		}
	}
	throw lastErr;
}

export interface RawArticle {
	guid: string;
	title: string;
	content: string;
	url: string;
	source: string;
	category: string;
	company?: string;
	publishedAt: Date | null;
	imageUrl?: string;
}

async function fetchFeed(source: {
	url: string;
	category: string;
	company?: string;
}): Promise<RawArticle[]> {
	try {
		const host = new URL(source.url).hostname;
		const xml = await hostGate.run(host, () =>
			withRetry(() => fetchXml(source.url)),
		);
		const feed = await parser.parseString(xml);
		return (feed.items ?? [])
			.slice(0, config.ingestion.maxArticlesPerFeed)
			.map((item) => {
				// Robust date parsing
				const dateStr = item.isoDate ?? item.pubDate;
				const publishedAt = dateStr ? new Date(dateStr) : null;

				const stableGuid =
					item.guid ??
					item.link ??
					(item.title
						? createHash("sha1")
								.update(`${item.title}|${source.url}|${dateStr ?? ""}`)
								.digest("hex")
						: undefined);

				const record = item as unknown as Record<string, unknown>;
				const link = item.link ?? "";
				// Prefer the richest body the feed offers, then strip markup and the
				// feed's own trailer ("O post ... apareceu primeiro em ...").
				const rawContent =
					(record["contentEncoded"] as string | undefined) ||
					item.content ||
					item.summary ||
					item.contentSnippet ||
					"";

				return {
					guid:
						stableGuid ?? createHash("sha1").update(source.url).digest("hex"),
					title: sanitizeFeedContent(item.title ?? "", 300) || "Sem título",
					content: sanitizeFeedContent(rawContent),
					url: link,
					source: feed.title?.trim() || source.company || source.url,
					category: source.category,
					company: source.company,
					publishedAt:
						publishedAt && !isNaN(publishedAt.getTime()) ? publishedAt : null,
					imageUrl: extractImageUrl(record, link || undefined),
				};
			});
	} catch (err) {
		console.warn(
			"[ingestion] feed failed:",
			source.url,
			(err as Error).message,
		);
		return [];
	}
}

/**
 * Optional LLM pass that distills entities/keywords. It *augments* the
 * deterministic embedding text instead of replacing it, so a model hiccup
 * degrades recall slightly rather than losing the article's own words.
 */
async function extractEmbeddingKeywords(
	title: string,
	content: string,
): Promise<string | undefined> {
	if (!config.ingestion.llmEmbeddingKeywords) return undefined;
	try {
		const model = await getFastModel();
		const prompt = `Liste apenas as entidades e palavras-chave desta notícia para busca vetorial: nomes de pessoas, empresas, instituições, locais, produtos e o evento central. Sem introduções, sem jargão genérico, sem HTML. Máximo 40 palavras separadas por vírgula.

Título: ${title}

Conteúdo: ${content.slice(0, 4000)}`;
		const { text } = await generateText({ model, prompt, maxTokens: 120 });
		return text.trim() || undefined;
	} catch (e) {
		console.warn(
			"[ingestion] keyword extraction failed, using deterministic text only:",
			(e as Error).message.slice(0, 80),
		);
		return undefined;
	}
}

/** Per-run budgets for the optional network enrichments. */
interface EnrichmentBudget {
	fullText: number;
	image: number;
}

/**
 * Fills in what the feed left out: a real body when the summary is too thin to
 * embed, and a lead image when no feed slot carried one. Both are budgeted per
 * run and host-gated, and both fail soft — enrichment never blocks ingestion.
 */
async function enrichArticle(
	article: RawArticle,
	budget: EnrichmentBudget,
): Promise<RawArticle> {
	const enriched = { ...article };
	const host = article.url ? safeHost(article.url) : "";

	if (
		config.ingestion.fullTextEnabled &&
		budget.fullText > 0 &&
		host &&
		enriched.content.length < config.ingestion.fullTextMinChars
	) {
		budget.fullText--;
		const full = await hostGate
			.run(host, () =>
				fetchFullArticle(article.url, {
					title: article.title,
					fallback: article.content,
				}),
			)
			.catch(() => "");
		if (full.length > enriched.content.length) enriched.content = full;
	}

	if (
		config.ingestion.imageFallbackEnabled &&
		budget.image > 0 &&
		host &&
		!enriched.imageUrl
	) {
		budget.image--;
		const image = await hostGate
			.run(host, () => fetchOgImage(article.url))
			.catch(() => undefined);
		if (image) enriched.imageUrl = image;
	}

	return enriched;
}

function safeHost(url: string): string {
	try {
		return new URL(url).hostname;
	} catch {
		return "";
	}
}

/** Cheap existence check — runs before enrichment so re-seen feed items cost nothing. */
async function isAlreadyStored(article: RawArticle): Promise<boolean> {
	const existing = await query<{ id: string }>(
		"SELECT id FROM news_articles WHERE guid = $1 OR url = $2 LIMIT 1",
		[article.guid, article.url],
	);
	return (existing.rowCount ?? 0) > 0;
}

async function upsertArticle(
	article: RawArticle,
	ollamaUp: boolean,
): Promise<string | null> {
	if (!article.guid || !article.title || !article.url) return null;
	if (await isAlreadyStored(article)) return null;

	const keywords = await extractEmbeddingKeywords(
		article.title,
		article.content || "",
	);
	const textToEmbed = buildEmbeddingText({
		title: article.title,
		content: article.content,
		source: article.source,
		category: article.category,
		keywords,
		maxChars: config.ingestion.embedTruncateChars,
	});

	// Embedding is best-effort — if the embedding backend is down, store without vector
	let embedding: number[] | null = null;
	if (ollamaUp) {
		try {
			embedding = await embedDocument(
				textToEmbed,
				timeoutSignal(config.ai.embeddingTimeoutMs),
			);
		} catch (e) {
			console.warn(
				"[ingestion] embed failed, storing without vector:",
				(e as Error).message.slice(0, 80),
			);
		}
	}

	// Skip near-duplicates already stored. Bounded to a recent window so the scan
	// can use the ivfflat index and a story is not blocked by old coverage.
	if (embedding) {
		const similar = await query<{
			id: string;
			title: string;
			similarity: number;
		}>(
			`SELECT id, title, 1 - (embedding <=> $1::vector) AS similarity
			 FROM news_articles
			 WHERE embedding IS NOT NULL
			   AND created_at > NOW() - ($2::text || ' days')::interval
			 ORDER BY embedding <=> $1::vector
			 LIMIT 1`,
			[vectorToSQL(embedding), config.ingestion.dedupWindowDays],
		);
		const nearest = similar.rows[0];
		if (nearest && nearest.similarity >= config.telegram.similarThreshold) {
			console.log(
				`[ingestion] Skipping "${article.title}" — similar to "${nearest.title}" (${nearest.similarity.toFixed(3)} >= ${config.telegram.similarThreshold})`,
			);
			return null;
		}
	}

	const result = await query<{ id: string }>(
		`INSERT INTO news_articles (guid, title, content, url, source, category, company, published_at, embedding, image_url)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     ON CONFLICT (guid) DO NOTHING
     RETURNING id`,
		[
			article.guid,
			article.title,
			article.content,
			article.url,
			article.source,
			article.category,
			article.company ?? null,
			article.publishedAt,
			embedding ? vectorToSQL(embedding) : null,
			article.imageUrl ?? null,
		],
	);

	const newId = result.rows[0]?.id ?? null;
	if (newId && embedding) {
		try {
			await upsertVector(newId, embedding, {
				id: newId,
				title: article.title,
				content: article.content,
				url: article.url,
				source: article.source,
				category: article.category,
				publishedAt: article.publishedAt,
				imageUrl: article.imageUrl,
			});
		} catch (e) {
			console.warn("[vectorStore] upsert failed:", (e as Error).message);
		}
	}

	return newId;
}

export interface IngestionResult {
	fetched: number;
	stored: number;
	newArticles: Array<{
		id: string;
		title: string;
		url: string;
		source: string;
		category: string;
		company?: string;
		content: string;
		imageUrl?: string;
		publishedAt?: Date | null;
	}>;
}

async function isOllamaAvailable(): Promise<boolean> {
	const base = config.ollama.baseUrl;
	const embeddingBase = config.ollama.embeddingBaseUrl;
	if (
		embeddingBase.includes("/v1") ||
		(base.includes("/v1") && !embeddingBase)
	) {
		console.warn(
			"[ingestion] Native OLLAMA_EMBEDDING_BASE_URL is not configured; embeddings will be skipped",
		);
		return false;
	}
	// LiteLLM / OpenAI-compatible proxy exposes /v1/models; native Ollama exposes /api/tags
	const probeUrl = base.includes("/v1")
		? `${base.replace(/\/v1\/?$/, "")}/v1/models`
		: `${base.replace(/\/v1\/?$/, "")}/api/tags`;
	try {
		const ac = new AbortController();
		const t = setTimeout(
			() => ac.abort(),
			config.ingestion.ollamaProbeTimeoutMs,
		);
		const apiKey =
			process.env["OLLAMA_API_KEY"] || process.env["OPENAI_API_KEY"] || "";
		const res = await fetch(probeUrl, {
			signal: ac.signal,
			headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : {},
		});
		clearTimeout(t);
		return res.ok;
	} catch {
		return false;
	}
}

export async function runIngestion(): Promise<IngestionResult> {
	console.log("[ingestion] Starting news ingestion...");
	const feeds = await getActiveFeeds();
	const ollamaUp = await isOllamaAvailable();
	if (!ollamaUp)
		console.warn("[ingestion] Ollama unavailable — embeddings will be skipped");
	let fetched = 0;
	const newArticles: IngestionResult["newArticles"] = [];
	const budget: EnrichmentBudget = {
		fullText: config.ingestion.fullTextMaxPerRun,
		image: config.ingestion.imageFallbackMaxPerRun,
	};

	for (let i = 0; i < feeds.length; i += config.ingestion.batchSize) {
		const batch = feeds.slice(i, i + config.ingestion.batchSize);
		const results = await Promise.allSettled(batch.map(fetchFeed));

		for (const result of results) {
			if (result.status !== "fulfilled") continue;
			fetched += result.value.length;
			for (const raw of result.value) {
				try {
					// Feeds repeat the same items every run — skip before spending any
					// network budget on enrichment.
					if (!raw.guid || !raw.title || !raw.url) continue;
					if (await isAlreadyStored(raw)) continue;
					const article = await enrichArticle(raw, budget);
					const id = await upsertArticle(article, ollamaUp);
					if (id) {
						const newArticle = {
							id,
							title: article.title,
							url: article.url,
							source: article.source,
							category: article.category,
							company: article.company,
							content: article.content,
							imageUrl: article.imageUrl,
							publishedAt: article.publishedAt,
						};
						newArticles.push(newArticle);
						runBackground("buildArticleRelations", () =>
							buildArticleRelations(id),
						);
					}
				} catch (err) {
					console.error("[ingestion] article failed:", (err as Error).message, {
						url: raw.url,
					});
				}
			}
		}
	}

	console.log(
		`[ingestion] Done. Fetched: ${fetched}, Stored: ${newArticles.length}`,
	);
	return { fetched, stored: newArticles.length, newArticles };
}
