import { Request, Response, Router } from "express";
import { query } from "../../database/client.js";
import { searchArticles } from "../../services/articleSearch.js";
import {
	cacheGet,
	cacheSet,
	cacheWrap,
	hashKey,
} from "../../services/cache.js";
import { analyzeCredibility } from "../../services/credibility.js";
import { fetchFullArticle } from "../../services/fullArticle.js";
import {
	composeTopStories,
	type MemberRow,
	type StoryRow,
	toExcerpt,
} from "../../services/topStories.js";
import { getTrends } from "../../services/trendsStore.js";

export const newsRouter: Router = Router();

interface FeedMember {
	id: string;
	source: string;
	outlet?: string | null;
	title: string;
	url: string;
	published_at: string;
}

/** Other outlets covering the same story: one entry per outlet, newest first. */
function alsoIn(
	members: FeedMember[] | null,
	self: { id: string; source: string; outlet?: string | null },
) {
	// One entry per outlet: Folha's "Poder" and "Mercado" feeds are the same source.
	const seen = new Set<string>([self.outlet ?? self.source]);
	const out: Array<{
		id: string;
		source: string;
		title: string;
		url: string;
		publishedAt: string;
	}> = [];
	for (const m of members ?? []) {
		const outlet = m.outlet ?? m.source;
		if (m.id === self.id || seen.has(outlet)) continue;
		seen.add(outlet);
		out.push({
			id: m.id,
			source: m.source,
			title: m.title,
			url: m.url,
			publishedAt: m.published_at,
		});
		if (out.length >= 6) break;
	}
	return out;
}

/** Query-string integer clamped to 1..max; junk, zero and negatives fall back. */
function positiveInt(raw: unknown, fallback: number, max: number): number {
	const n = Number.parseInt(String(raw ?? ""), 10);
	return Number.isFinite(n) && n >= 1 ? Math.min(n, max) : fallback;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

newsRouter.get("/", async (req: Request, res: Response) => {
	const page = positiveInt(req.query["page"], 1, 1000);
	const limit = positiveInt(req.query["limit"], 20, 50);
	const category = req.query["category"] as string | undefined;
	const minCredibility = req.query["minCredibility"] as string | undefined;
	const politicalBias = req.query["politicalBias"] as string | undefined;
	const excludeMilitant = req.query["excludeMilitant"] === "true";
	// group=true folds the same story from several outlets into one entry (the
	// newest article) that lists the others in `also_in`; nothing is dropped,
	// every member stays reachable and the entry carries the outlet count.
	const group = req.query["group"] === "true";
	// scope=ai keeps only AI-related articles (keyword classification at ingestion).
	const aiOnly = req.query["scope"] === "ai";
	// minScore hides articles the relevance pass rated lower; unscored ones stay.
	const minScore = positiveInt(req.query["minScore"], 0, 10);
	const offset = (page - 1) * limit;

	const cacheKey = hashKey(
		"news:list",
		page,
		limit,
		category,
		minCredibility,
		politicalBias,
		excludeMilitant,
		group,
		aiOnly,
		minScore,
	);

	// Fetch one extra row instead of COUNT(*) OVER() — a window aggregate with no
	// PARTITION BY forces Postgres to materialize the whole matching set before
	// applying LIMIT, turning every page load into a full-table scan (measured:
	// 5.3s on prod's 234k-row table vs <10ms for a plain indexed LIMIT).
	const params: unknown[] = [limit + 1, offset];
	const filters: string[] = [];
	if (category) {
		params.push(category);
		filters.push(
			`(@.category = $${params.length} OR @.theme_category = $${params.length})`,
		);
	}
	if (minCredibility) {
		const val = parseInt(minCredibility, 10);
		if (!isNaN(val)) {
			params.push(11 - val);
			filters.push(
				`(@.fake_news_score IS NULL OR @.fake_news_score <= $${params.length})`,
			);
		}
	}
	if (politicalBias && politicalBias !== "all") {
		params.push(politicalBias);
		filters.push(`@.political_bias = $${params.length}`);
	}
	if (excludeMilitant) filters.push(`@.is_militant = false`);
	if (aiOnly) filters.push(`@.is_ai = TRUE`);
	if (minScore > 0) {
		params.push(minScore);
		filters.push(
			`(@.relevance_score IS NULL OR @.relevance_score >= $${params.length})`,
		);
	}
	const clauses = (alias: string) =>
		filters.map((f) => f.replaceAll("@.", `${alias}.`));

	const pageWhere = clauses("na");
	if (group) {
		// Hide an article only when a newer member of its story is itself listed
		// under the same filters, so no story disappears from a filtered tab.
		const newer = ["nb.id IS NOT NULL", ...clauses("nb")].join(" AND ");
		pageWhere.push(`NOT EXISTS (
        SELECT 1 FROM story_articles sa1
        JOIN story_articles sa2 ON sa2.story_id = sa1.story_id AND sa2.article_id <> sa1.article_id
        JOIN news_articles nb ON nb.id = sa2.article_id
        WHERE sa1.article_id = na.id AND ${newer}
          AND (COALESCE(nb.published_at, nb.created_at), nb.id)
            > (COALESCE(na.published_at, na.created_at), na.id))`);
	}
	const where = pageWhere.length ? `WHERE ${pageWhere.join(" AND ")}` : "";

	try {
		const response = await cacheWrap(cacheKey, 300, async () => {
			const result = await query<{
				id: string;
				title: string;
				summary: string | null;
				content: string | null;
				url: string;
				source: string;
				category: string;
				theme_category: string | null;
				published_at: string;
				image_url: string | null;
				video_url: string | null;
				author: string | null;
				cover_image: string | null;
				sentiment: string;
				importance_score: number;
				story_id: string | null;
				source_count: number | null;
				article_count: number | null;
				members: FeedMember[] | null;
			}>(
				`WITH page AS (
         SELECT na.id, na.title, na.summary, LEFT(na.content, 800) AS content, na.url,
                na.source, COALESCE(na.outlet, na.source) AS outlet, na.category, na.theme_category, na.published_at, na.image_url, na.video_url, na.author,
                na.sentiment, na.importance_score
         FROM news_articles na ${where}
         ORDER BY na.published_at DESC NULLS LAST
         LIMIT $1 OFFSET $2
       )
       SELECT page.*, st.story_id, st.source_count, st.article_count, st.cover_image, st.members
       FROM page
       LEFT JOIN LATERAL (
         SELECT sa.story_id,
                COUNT(DISTINCT COALESCE(nb.outlet, nb.source))::int AS source_count,
                COUNT(*)::int AS article_count,
                (ARRAY_AGG(nb.image_url ORDER BY nb.published_at DESC NULLS LAST)
                   FILTER (WHERE nb.image_url IS NOT NULL))[1] AS cover_image,
                JSON_AGG(JSON_BUILD_OBJECT('id', nb.id, 'source', nb.source, 'outlet', COALESCE(nb.outlet, nb.source), 'title', nb.title,
                                           'url', nb.url, 'published_at', nb.published_at)
                         ORDER BY nb.published_at DESC NULLS LAST) AS members
         FROM story_articles sa0
         JOIN story_articles sa ON sa.story_id = sa0.story_id
         JOIN news_articles nb ON nb.id = sa.article_id
         WHERE sa0.article_id = page.id
         GROUP BY sa.story_id
         ORDER BY COUNT(*) DESC
         LIMIT 1
       ) st ON TRUE
       ORDER BY page.published_at DESC NULLS LAST`,
				params,
			);

			const hasMore = result.rows.length > limit;
			const articles = (
				hasMore ? result.rows.slice(0, limit) : result.rows
			).map(({ members, cover_image, content, summary, ...row }) => ({
				...row,
				excerpt: toExcerpt(summary?.trim() || content),
				image_url: row.image_url ?? cover_image,
				source_count: row.source_count ?? 1,
				article_count: row.article_count ?? 1,
				also_in: alsoIn(members, row),
			}));

			return { data: articles, articles, page, limit, hasMore };
		});
		return res.json(response);
	} catch (err) {
		console.error("[news] list failed:", (err as Error).message);
		return res.status(500).json({ error: "Failed to fetch news" });
	}
});

newsRouter.get("/search", async (req: Request, res: Response) => {
	const q = req.query["q"] as string;
	if (!q || q.trim().length < 3)
		return res.status(400).json({ error: "Query too short" });

	const cacheKey = hashKey("news:search", q.toLowerCase().trim());
	const cached = await cacheGet(cacheKey);
	if (cached) return res.json(cached);

	const results = await searchArticles(q, { limit: 10, daysBack: 30 });
	const response = {
		data: results.items,
		query: q,
		mode: results.mode,
	};
	await cacheSet(cacheKey, response, 300);
	return res.json(response);
});

newsRouter.get("/top", async (_req: Request, res: Response) => {
	const cached = await cacheGet("news:top");
	if (cached) return res.json(cached);

	// "Em alta" ranks story clusters (news_stories / story_articles) by how many
	// distinct outlets cover them, decayed by age, and shows each cluster through
	// its best article, so one story from many portals is a single entry.
	try {
		const stories = await query<StoryRow>(
			`SELECT ns.id AS story_id, ns.title AS story_title, ns.summary AS story_summary,
              ns.last_updated_at, COUNT(*)::int AS article_count,
              COUNT(DISTINCT COALESCE(na.outlet, na.source))::int AS source_count
       FROM news_stories ns
       JOIN story_articles sa ON sa.story_id = ns.id
       JOIN news_articles na ON na.id = sa.article_id
       WHERE ns.status = 'active'
         AND ns.last_updated_at > NOW() - INTERVAL '48 hours'
         AND COALESCE(na.is_spam_or_promo, FALSE) = FALSE
       GROUP BY ns.id
       ORDER BY COUNT(DISTINCT COALESCE(na.outlet, na.source)) DESC, ns.last_updated_at DESC
       LIMIT 40`,
		);
		const ids = stories.rows.map((r) => r.story_id);
		const members = ids.length
			? await query<MemberRow>(
					`SELECT sa.story_id, na.id, na.title, na.summary, LEFT(na.content, 800) AS content,
                  na.url, na.source, COALESCE(na.outlet, na.source) AS outlet, na.category, na.company, na.published_at, na.image_url,
                  COALESCE(na.relevance_score, na.importance_score) AS importance_score,
                  na.fake_news_score, na.political_bias, na.is_militant
           FROM story_articles sa
           JOIN news_articles na ON na.id = sa.article_id
           WHERE sa.story_id = ANY($1::uuid[])
             AND COALESCE(na.is_spam_or_promo, FALSE) = FALSE`,
					[ids],
				)
			: { rows: [] as MemberRow[] };

		const iso = (v: unknown) => new Date(v as string).toISOString();
		const data = composeTopStories(
			stories.rows.map((r) => ({
				...r,
				last_updated_at: iso(r.last_updated_at),
			})),
			members.rows.map((m) => ({ ...m, published_at: iso(m.published_at) })),
		);
		const response = { data };
		await cacheSet("news:top", response, 300);
		return res.json(response);
	} catch (err) {
		console.error("[news] top failed:", (err as Error).message);
		return res.status(500).json({ error: "Failed to fetch top news" });
	}
});

// Trending terms and themes: burst detection over two equal windows.
newsRouter.get("/trends", async (req: Request, res: Response) => {
	const hours = parseInt((req.query["hours"] as string) ?? "24", 10);
	try {
		return res.json(await getTrends(Number.isFinite(hours) ? hours : 24));
	} catch (err) {
		console.error("[news] trends failed:", (err as Error).message);
		return res.status(500).json({ error: "Failed to compute trends" });
	}
});

newsRouter.get("/categories", async (_req: Request, res: Response) => {
	const cached = await cacheGet("news:categories");
	if (cached) return res.json(cached);

	const result = await query<{ category: string; count: string }>(
		"SELECT category, COUNT(*) as count FROM news_articles GROUP BY category ORDER BY count DESC",
	);
	await cacheSet("news:categories", result.rows, 3600);
	return res.json(result.rows);
});

newsRouter.get("/:id", async (req: Request, res: Response) => {
	const id = req.params["id"] as string;
	if (!id || !UUID.test(id))
		return res.status(404).json({ error: "Article not found" });

	const cacheKey = `news:article:${id}`;
	const cached = await cacheGet(cacheKey);
	if (cached) return res.json(cached);

	const result = await query<{
		id: string;
		title: string;
		summary: string;
		content: string;
		url: string;
		source: string;
		category: string;
		company: string | null;
		published_at: string;
		image_url: string | null;
		video_url: string | null;
		media: unknown[] | null;
		author: string | null;
		tags: string[] | null;
		comments_url: string | null;
		language: string | null;
		word_count: number | null;
		sentiment: string;
		importance_score: number;
		fake_news_score: number | null;
		political_bias: string | null;
		is_militant: boolean;
		has_incoherence: boolean;
		credibility_flags: string[];
	}>(
		`SELECT id, title, summary, content, url, source, category, company, published_at,
            image_url, video_url, media, author, tags, comments_url, language, word_count, sentiment, importance_score, fake_news_score, political_bias,
            is_militant, has_incoherence, credibility_flags
     FROM news_articles WHERE id = $1`,
		[id],
	);

	if (!result.rows[0])
		return res.status(404).json({ error: "Article not found" });

	await cacheSet(cacheKey, result.rows[0], 600);
	return res.json(result.rows[0]);
});

newsRouter.get("/:id/related", async (req: Request, res: Response) => {
	const id = req.params["id"] as string;
	if (!id || !UUID.test(id))
		return res.status(404).json({ error: "Article not found" });

	const cacheKey = `news:related:${id}`;
	const cached = await cacheGet(cacheKey);
	if (cached) return res.json(cached);

	const article = await query<{ title: string; content: string }>(
		"SELECT title, content FROM news_articles WHERE id = $1",
		[id],
	);
	if (!article.rows[0])
		return res.status(404).json({ error: "Article not found" });

	const { title, content } = article.rows[0];
	// One extra row so dropping the article itself still fills the list.
	const related = await searchArticles(`${title} ${content}`, {
		limit: 9,
		daysBack: 30,
	});
	const response = {
		data: related.items.filter((a) => a.id !== id).slice(0, 8),
		mode: related.mode,
	};
	await cacheSet(cacheKey, response, 900);
	return res.json(response);
});

newsRouter.post("/:id/credibility", async (req: Request, res: Response) => {
	const id = req.params["id"] as string;
	if (!id || !UUID.test(id))
		return res.status(404).json({ error: "Article not found" });

	const article = await query<{
		title: string;
		content: string;
		url: string;
		source: string;
		category: string;
	}>(
		"SELECT title, content, url, source, category FROM news_articles WHERE id = $1",
		[id],
	);
	if (!article.rows[0])
		return res.status(404).json({ error: "Article not found" });

	const { title, content, url, source, category } = article.rows[0];
	const fullContent =
		(await fetchFullArticle(url).catch(() => null)) || content;

	const result = await analyzeCredibility(
		id as string,
		title,
		fullContent,
		source,
		category,
		AbortSignal.timeout(120_000),
	);
	if (!result)
		return res.status(500).json({ error: "Failed to analyze credibility" });

	return res.json(result);
});

// --- Feed Management Endpoints ---

newsRouter.get("/feeds/list", async (req: Request, res: Response) => {
	try {
		const { syncDefaultFeeds } = await import("../../services/sources.js");
		await syncDefaultFeeds();

		const result = await query(
			'SELECT id, name, url, category, company, is_active AS "isActive", last_fetched AS "lastFetched" FROM source_feeds ORDER BY name ASC',
		);
		return res.json({ data: result.rows });
	} catch (error) {
		console.error("[API] Failed to fetch feeds list:", error);
		return res.status(500).json({ error: "Failed to fetch feeds list" });
	}
});

newsRouter.post("/feeds/toggle", async (req: Request, res: Response) => {
	const { id, isActive } = req.body;
	if (!id) return res.status(400).json({ error: "Missing feed ID" });
	try {
		await query("UPDATE source_feeds SET is_active = $1 WHERE id = $2", [
			isActive,
			id,
		]);
		return res.json({ success: true });
	} catch (error) {
		console.error("[API] Failed to toggle feed:", error);
		return res.status(500).json({ error: "Failed to toggle feed" });
	}
});

newsRouter.post("/feeds/add", async (req: Request, res: Response) => {
	const { name, url, category, company } = req.body;
	if (!name || !url)
		return res.status(400).json({ error: "Missing feed name or URL" });
	try {
		await query(
			"INSERT INTO source_feeds (name, url, category, company, is_active) VALUES ($1, $2, $3, $4, true) ON CONFLICT (url) DO NOTHING",
			[name, url, category || "Tecnologia", company || name],
		);
		return res.json({ success: true });
	} catch (error) {
		console.error("[API] Failed to add feed:", error);
		return res.status(500).json({ error: "Failed to add feed" });
	}
});

newsRouter.delete("/feeds/:id", async (req: Request, res: Response) => {
	const { id } = req.params;
	try {
		await query("DELETE FROM source_feeds WHERE id = $1", [id]);
		return res.json({ success: true });
	} catch (error) {
		console.error("[API] Failed to delete feed:", error);
		return res.status(500).json({ error: "Failed to delete feed" });
	}
});
