import { Request, Response, Router } from "express";
import { query } from "../../database/client.js";
import {
	exportForRAG,
	getSqliteStats,
	searchSimilarInSqlite,
} from "../../database/sqliteStore.js";
import { embedQuery } from "../../services/embeddings.js";
import { searchSimilarArticles } from "../../services/rag.js";

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
		const results = await searchSimilarArticles(q, 90, limit);
		const graph = await buildSearchGraph(results.map((item) => item.id));
		return res.json({ query: q, total: results.length, results, graph });
	} catch (err) {
		try {
			const queryEmbedding = await embedQuery(q);
			const results = searchSimilarInSqlite(queryEmbedding, limit);
			return res.json({
				query: q,
				total: results.length,
				results,
				graph: { nodes: [], edges: [] },
			});
		} catch {
			const msg = err instanceof Error ? err.message : "Erro ao buscar";
			return res.status(500).json({ error: msg });
		}
	}
});

async function buildSearchGraph(articleIds: string[]): Promise<{
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
}> {
	if (articleIds.length === 0) return { nodes: [], edges: [] };
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
	return {
		nodes: nodes.rows,
		edges: edges.rows.map((edge) => ({
			source: edge.article_a,
			target: edge.article_b,
			similarity: edge.similarity,
			relationType: edge.relationType,
		})),
	};
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
