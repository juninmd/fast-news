import { Request, Response, Router } from "express";
import { query } from "../../database/client.js";
import { cacheGet, cacheSet } from "../../services/cache.js";
import { analyzeCredibility } from "../../services/credibility.js";
import { fetchFullArticle } from "../../services/fullArticle.js";
import { searchSimilarArticles } from "../../services/rag.js";

export const newsRouter: Router = Router();

newsRouter.get("/", async (req: Request, res: Response) => {
	const page = parseInt((req.query["page"] as string) ?? "1", 10);
	const limit = Math.min(
		parseInt((req.query["limit"] as string) ?? "20", 10),
		50,
	);
	const category = req.query["category"] as string | undefined;
	const minCredibility = req.query["minCredibility"] as string | undefined;
	const politicalBias = req.query["politicalBias"] as string | undefined;
	const excludeMilitant = req.query["excludeMilitant"] === "true";
	const offset = (page - 1) * limit;

	const cacheKey = `news:list:${page}:${limit}:${category ?? "all"}:${minCredibility ?? "all"}:${politicalBias ?? "all"}:${excludeMilitant}`;
	const cached = await cacheGet(cacheKey);
	if (cached) return res.json(cached);

	const whereClauses: string[] = [];
	const params: unknown[] = [limit, offset];

	if (category) {
		whereClauses.push(`category = $${params.length + 1}`);
		params.push(category);
	}
	if (minCredibility) {
		const val = parseInt(minCredibility, 10);
		if (!isNaN(val)) {
			whereClauses.push(
				`(fake_news_score IS NULL OR fake_news_score <= $${params.length + 1})`,
			);
			params.push(11 - val);
		}
	}
	if (politicalBias && politicalBias !== "all") {
		whereClauses.push(`political_bias = $${params.length + 1}`);
		params.push(politicalBias);
	}
	if (excludeMilitant) {
		whereClauses.push(`is_militant = false`);
	}

	const where = whereClauses.length
		? `WHERE ${whereClauses.join(" AND ")}`
		: "";
	const result = await query<{
		id: string;
		title: string;
		summary: string;
		url: string;
		source: string;
		category: string;
		published_at: string;
		image_url: string | null;
		sentiment: string;
		importance_score: number;
		fake_news_score: number | null;
		political_bias: string | null;
		is_militant: boolean;
		has_incoherence: boolean;
		total_count: string;
	}>(
		`SELECT id, title, summary, url, source, category, published_at, image_url, sentiment, importance_score,
            COUNT(*) OVER() AS total_count
     FROM news_articles ${where}
     ORDER BY published_at DESC NULLS LAST
     LIMIT $1 OFFSET $2`,
		params,
	);

	const total = result.rows[0]?.total_count
		? parseInt(result.rows[0].total_count, 10)
		: 0;
	const hasMore = offset + limit < total;

	const response = {
		data: result.rows,
		articles: result.rows,
		page,
		limit,
		total,
		hasMore,
	};

	await cacheSet(cacheKey, response, 300);
	return res.json(response);
});

newsRouter.get("/search", async (req: Request, res: Response) => {
	const q = req.query["q"] as string;
	if (!q || q.trim().length < 3)
		return res.status(400).json({ error: "Query too short" });

	const cacheKey = `news:search:${q.toLowerCase().trim()}`;
	const cached = await cacheGet(cacheKey);
	if (cached) return res.json(cached);

	const results = await searchSimilarArticles(q, 30, 10);
	const response = { data: results, query: q };
	await cacheSet(cacheKey, response, 300);
	return res.json(response);
});

newsRouter.get("/top", async (_req: Request, res: Response) => {
	const cached = await cacheGet("news:top");
	if (cached) return res.json(cached);

	const result = await query<{
		id: string;
		title: string;
		summary: string;
		url: string;
		source: string;
		category: string;
		company: string | null;
		published_at: string;
		image_url: string | null;
		importance_score: number;
		fake_news_score: number | null;
		political_bias: string | null;
		is_militant: boolean;
	}>(
		`SELECT id, title, summary, url, source, category, company,
            published_at, image_url, importance_score,
            fake_news_score, political_bias, is_militant
     FROM news_articles
     WHERE published_at > NOW() - INTERVAL '48 hours'
       AND importance_score IS NOT NULL
     ORDER BY importance_score DESC NULLS LAST, published_at DESC
     LIMIT 10`,
	);

	const response = { data: result.rows };
	await cacheSet("news:top", response, 300);
	return res.json(response);
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
	const { id } = req.params;

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
		sentiment: string;
		importance_score: number;
		fake_news_score: number | null;
		political_bias: string | null;
		is_militant: boolean;
		has_incoherence: boolean;
		credibility_flags: string[];
	}>(
		`SELECT id, title, summary, content, url, source, category, company, published_at,
            image_url, sentiment, importance_score, fake_news_score, political_bias,
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
	const { id } = req.params;

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
	const related = await searchSimilarArticles(`${title} ${content}`, 30, 8);
	const response = { data: related.filter((a) => a.id !== id) };
	await cacheSet(cacheKey, response, 900);
	return res.json(response);
});

newsRouter.post("/:id/credibility", async (req: Request, res: Response) => {
	const { id } = req.params;

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
