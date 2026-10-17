import { createHash } from "crypto";
import { Request, Response, Router } from "express";
import { query } from "../../database/client.js";
import { exportForRAG, getSqliteStats } from "../../database/sqliteStore.js";
import { searchArticles } from "../../services/articleSearch.js";
import { cacheGet, cacheSet } from "../../services/cache.js";

export const ragRouter: Router = Router();

ragRouter.get("/search", async (req: Request, res: Response) => {
	const q = (req.query["q"] as string)?.trim();
	const limit = Math.min(
		parseInt((req.query["limit"] as string) ?? "10", 10),
		50,
	);

	if (!q || q.length < 3)
		return res.status(400).json({ error: "Query muito curta (min 3 chars)" });

	try {
		// Semantic when the embedding model answers, keyword when it is in cooldown;
		// `mode` is what tells the client which ranking it is looking at.
		const { mode, items } = await searchArticles(q, { limit, daysBack: 90 });
		const graph = await buildSearchGraph(items.map((item) => item.id));
		return res.json({
			query: q,
			total: items.length,
			results: items,
			graph,
			mode,
		});
	} catch (err) {
		const msg = err instanceof Error ? err.message : "Erro ao buscar";
		return res.status(500).json({ error: msg });
	}
});

type SearchGraphData = {
	nodes: Array<{
		id: string;
		title: string;
		source: string;
		category: string;
		publishedAt: string | null;
		url: string;
		sentiment: number;
	}>;
	edges: Array<{
		source: string;
		target: string;
		similarity: number;
		relationType: string;
	}>;
};

async function buildSearchGraph(
	articleIds: string[],
): Promise<SearchGraphData> {
	if (articleIds.length === 0) return { nodes: [], edges: [] };

	const sortedIds = [...articleIds].sort().join(",");
	const cacheKey = `rag:graph:${createHash("sha256").update(sortedIds).digest("hex").slice(0, 32)}`;
	const cached = await cacheGet<SearchGraphData>(cacheKey);
	if (cached) return cached;

	const nodes = await query<{
		id: string;
		title: string;
		source: string;
		category: string;
		publishedAt: string | null;
		url: string;
		sentiment: number;
	}>(
		`SELECT id, title, source, category, published_at AS "publishedAt", url, sentiment
     FROM news_articles WHERE id = ANY($1::uuid[])`,
		[articleIds],
	);
	const edges =
		articleIds.length >= 2
			? await query<{
					article_a: string;
					article_b: string;
					similarity: number;
					relationType: string;
				}>(
					`SELECT article_a, article_b, similarity, relation_type AS "relationType"
         FROM article_relations
         WHERE article_a = ANY($1::uuid[]) AND article_b = ANY($1::uuid[])
         ORDER BY similarity DESC`,
					[articleIds],
				)
			: { rows: [] };
	const graphData = {
		nodes: nodes.rows,
		edges: edges.rows.map((edge) => ({
			source: edge.article_a,
			target: edge.article_b,
			similarity: edge.similarity,
			relationType: edge.relationType,
		})),
	};
	await cacheSet(cacheKey, graphData, 300); // 5 minutes cache
	return graphData;
}

ragRouter.get("/stats", (_req: Request, res: Response) => {
	const stats = getSqliteStats();
	return res.json(stats);
});

ragRouter.get("/export", (req: Request, res: Response) => {
	const limit = Math.min(
		parseInt((req.query["limit"] as string) ?? "5000", 10),
		10000,
	);
	const format = (req.query["format"] as string) ?? "json";

	const data = exportForRAG(limit);

	if (format === "jsonl") {
		res.setHeader("Content-Type", "application/x-ndjson");
		res.setHeader(
			"Content-Disposition",
			'attachment; filename="news_embeddings.jsonl"',
		);
		data.forEach((item) => res.write(JSON.stringify(item) + "\n"));
		return res.end();
	}

	res.setHeader(
		"Content-Disposition",
		'attachment; filename="news_embeddings.json"',
	);
	return res.json({ total: data.length, articles: data });
});
