import { QdrantClient } from "@qdrant/js-client-rest";
import { createHash } from "crypto";
import { config } from "../config/env.js";
import { cacheGet, cacheSet } from "../services/cache.js";
import { query } from "./client.js";
import { searchSimilarInSqlite, upsertArticleToSqlite } from "./sqliteStore.js";

const COLLECTION_NAME = "news_articles";
const INSIGHTS_COLLECTION_NAME = "knowledge_insights";

export interface VectorArticle {
	id: string;
	title: string;
	content: string;
	url: string;
	source: string;
	category: string;
	publishedAt: Date | null;
	imageUrl?: string | null;
}

export interface VectorSearchResult {
	id: string;
	similarity: number;
	metadata?: {
		title: string;
		content: string;
		url: string;
		source: string;
		category: string;
		publishedAt: string;
		imageUrl?: string | null;
	};
}

let qdrantClient: QdrantClient | null = null;

function getQdrantClient(): QdrantClient {
	if (!qdrantClient) {
		qdrantClient = new QdrantClient({
			url: config.qdrant.url,
			apiKey: config.qdrant.apiKey || undefined,
		});
	}
	return qdrantClient;
}

export async function initVectorStore(): Promise<void> {
	const provider = config.vectorStore;
	console.log(`[vectorStore] Initializing vector store provider: ${provider}`);

	if (provider === "qdrant") {
		try {
			const client = getQdrantClient();
			const response = await client.getCollections();

			// 1. Articles collection
			const exists = response.collections.some(
				(c) => c.name === COLLECTION_NAME,
			);
			if (!exists) {
				console.log(
					`[vectorStore] Creating Qdrant collection: ${COLLECTION_NAME}`,
				);
				await client.createCollection(COLLECTION_NAME, {
					vectors: {
						size: config.rag.embeddingDimensions,
						distance: "Cosine",
					},
				});
				console.log(
					`[vectorStore] Qdrant collection ${COLLECTION_NAME} created`,
				);
			} else {
				console.log(
					`[vectorStore] Qdrant collection ${COLLECTION_NAME} already exists`,
				);
			}

			// 2. Insights collection
			const existsInsights = response.collections.some(
				(c) => c.name === INSIGHTS_COLLECTION_NAME,
			);
			if (!existsInsights) {
				console.log(
					`[vectorStore] Creating Qdrant collection: ${INSIGHTS_COLLECTION_NAME}`,
				);
				await client.createCollection(INSIGHTS_COLLECTION_NAME, {
					vectors: {
						size: config.rag.embeddingDimensions,
						distance: "Cosine",
					},
				});
				console.log(
					`[vectorStore] Qdrant collection ${INSIGHTS_COLLECTION_NAME} created`,
				);
			} else {
				console.log(
					`[vectorStore] Qdrant collection ${INSIGHTS_COLLECTION_NAME} already exists`,
				);
			}
		} catch (err) {
			console.error(
				"[vectorStore] Failed to initialize Qdrant. Falling back to SQLite/PG.",
				(err as Error).message,
			);
		}
	} else if (provider === "postgres") {
		// Postgres runs migration from schema.sql which creates the extension and table
		console.log(
			"[vectorStore] Postgres vector store relies on schema.sql migrations.",
		);
	} else {
		console.log("[vectorStore] SQLite vector store active.");
	}
}

export async function upsertVector(
	id: string,
	embedding: number[],
	article: VectorArticle,
): Promise<void> {
	const provider = config.vectorStore;
	const failedStores: string[] = [];

	// 1. Dual-write to primary SQL stores (Postgres & SQLite) for metadata & local search
	// (SQLite store keeps its own embedding representation inside JSON)
	try {
		upsertArticleToSqlite(
			{
				id,
				guid: id,
				title: article.title,
				content: article.content,
				url: article.url,
				source: article.source,
				category: article.category,
				publishedAt: article.publishedAt?.toISOString(),
				imageUrl: article.imageUrl || undefined,
			},
			embedding,
		);
	} catch (e) {
		failedStores.push("sqlite");
		console.warn(
			"[vectorStore] SQLite upsert failed during vector store write:",
			(e as Error).message,
		);
	}

	// 2. Write embedding to the configured vector index provider
	if (provider === "qdrant") {
		try {
			const client = getQdrantClient();
			await client.upsert(COLLECTION_NAME, {
				wait: true,
				points: [
					{
						id: id, // Must be valid UUID format
						vector: embedding,
						payload: {
							title: article.title,
							content: article.content,
							url: article.url,
							source: article.source,
							category: article.category,
							publishedAt:
								article.publishedAt?.toISOString() || new Date().toISOString(),
							imageUrl: article.imageUrl || null,
						},
					},
				],
			});
		} catch (err) {
			failedStores.push("qdrant");
			console.error(
				"[vectorStore] Qdrant upsert failed:",
				(err as Error).message,
			);
		}
	}

	// Always write to pgvector to ensure relational SQL-based features (stories, relations) work correctly
	try {
		await upsertPgvector(id, embedding);
	} catch (err) {
		failedStores.push("pgvector");
		console.warn(
			"[vectorStore] Failed to update pgvector embedding:",
			(err as Error).message,
		);
	}

	if (failedStores.length > 1) {
		console.error(
			`[vectorStore] Embedding write diverged for article ${id}: failed stores [${failedStores.join(", ")}]. Data is now inconsistent across vector stores.`,
		);
	}
}

async function upsertPgvector(id: string, embedding: number[]): Promise<void> {
	const vectorString = `[${embedding.join(",")}]`;
	await query("UPDATE news_articles SET embedding = $1::vector WHERE id = $2", [
		vectorString,
		id,
	]);
}

export async function searchVectors(
	embedding: number[],
	limit: number,
	options?: {
		daysBack?: number;
		minSimilarity?: number;
		category?: string;
	},
): Promise<VectorSearchResult[]> {
	const provider = config.vectorStore;
	const minSim = options?.minSimilarity ?? 0.55;

	if (provider === "qdrant") {
		try {
			const client = getQdrantClient();
			const filter: any = { must: [] };

			if (options?.daysBack) {
				const cutoff = new Date(
					Date.now() - options.daysBack * 24 * 60 * 60 * 1000,
				).toISOString();
				filter.must.push({
					key: "publishedAt",
					range: { gte: cutoff },
				});
			}

			if (options?.category && options.category !== "Todas") {
				filter.must.push({
					key: "category",
					match: { value: options.category },
				});
			}

			const searchResult = await client.search(COLLECTION_NAME, {
				vector: embedding,
				limit: limit,
				with_payload: true,
				filter: filter.must.length > 0 ? filter : undefined,
				score_threshold: minSim,
			});

			return searchResult.map((hit) => ({
				id: hit.id as string,
				similarity: hit.score,
				metadata: hit.payload as any,
			}));
		} catch (err) {
			console.error(
				"[vectorStore] Qdrant search failed, falling back to pgvector:",
				(err as Error).message,
			);
			return searchPgvector(embedding, limit, options);
		}
	} else if (provider === "postgres") {
		return searchPgvector(embedding, limit, options);
	} else {
		// SQLite fallback
		const results = searchSimilarInSqlite(embedding, limit);
		return results
			.filter((r) => r.similarity >= minSim)
			.map((r) => ({
				id: r.id,
				similarity: r.similarity,
				metadata: {
					title: r.title,
					content: r.content,
					url: r.url,
					source: r.source,
					category: r.category,
					publishedAt: r.publishedAt || new Date().toISOString(),
					imageUrl: r.imageUrl,
				},
			}));
	}
}

async function searchPgvector(
	embedding: number[],
	limit: number,
	options?: {
		daysBack?: number;
		minSimilarity?: number;
		category?: string;
	},
): Promise<VectorSearchResult[]> {
	const vectorString = `[${embedding.join(",")}]`;
	const days = options?.daysBack ?? 30;
	const minSim = options?.minSimilarity ?? 0.55;
	const category = options?.category;

	let sql = `
		SELECT id, title, content, url, source, category, published_at AS "publishedAt", image_url AS "imageUrl",
		       1 - (embedding <=> $1::vector) AS similarity
		FROM news_articles
		WHERE embedding IS NOT NULL
		  AND 1 - (embedding <=> $1::vector) >= $2
	`;
	const params: any[] = [vectorString, minSim];

	let paramIndex = 3;
	if (days) {
		sql += ` AND published_at > NOW() - ($${paramIndex}::text || ' days')::interval`;
		params.push(days);
		paramIndex++;
	}
	if (category && category !== "Todas") {
		sql += ` AND category = $${paramIndex}`;
		params.push(category);
		paramIndex++;
	}

	sql += ` ORDER BY embedding <=> $1::vector LIMIT $${paramIndex}`;
	params.push(limit);

	const res = await query<{
		id: string;
		title: string;
		content: string;
		url: string;
		source: string;
		category: string;
		publishedAt: string;
		imageUrl: string | null;
		similarity: number;
	}>(sql, params);

	return res.rows.map((row) => ({
		id: row.id,
		similarity: row.similarity,
		metadata: {
			title: row.title,
			content: row.content,
			url: row.url,
			source: row.source,
			category: row.category,
			publishedAt: row.publishedAt,
			imageUrl: row.imageUrl,
		},
	}));
}

export async function updateUserPreference(
	userId: string,
	articleEmbedding: number[],
	reaction: "like" | "dislike",
): Promise<void> {
	// Adjust these weights as necessary
	const LEARNING_RATE = reaction === "like" ? 0.2 : -0.2;

	try {
		// Get current preference vector
		const res = await query<{ preference_vector: string }>(
			"SELECT preference_vector::text FROM telegram_user_preferences WHERE user_id = $1",
			[userId],
		);

		let newVector: number[];

		if (res.rowCount && res.rows[0]?.preference_vector) {
			const currentVector: number[] = JSON.parse(res.rows[0].preference_vector);

			// Compute new vector
			newVector = currentVector.map((val, idx) => {
				const diff = (articleEmbedding[idx] || 0) * LEARNING_RATE;
				return val + diff;
			});

			// Optional: Normalize the new vector
			const magnitude = Math.sqrt(
				newVector.reduce((sum, val) => sum + val * val, 0),
			);
			if (magnitude > 0) {
				newVector = newVector.map((val) => val / magnitude);
			}
		} else {
			// If no preference vector exists, initialize it (if like) or use zero-ish vector
			if (reaction === "like") {
				newVector = [...articleEmbedding];
			} else {
				// Initialize with slightly negative article embedding or just ignore
				newVector = articleEmbedding.map((v) => v * -0.1);
			}
		}

		const vectorString = `[${newVector.join(",")}]`;

		await query(
			`INSERT INTO telegram_user_preferences (user_id, preference_vector, updated_at)
			 VALUES ($1, $2::vector, NOW())
			 ON CONFLICT (user_id)
			 DO UPDATE SET preference_vector = EXCLUDED.preference_vector, updated_at = NOW()`,
			[userId, vectorString],
		);
	} catch (err: any) {
		console.error(
			"[vectorStore] Failed to update user preference vector:",
			err.message,
		);
	}
}

export async function getArticleEmbedding(
	id: string,
): Promise<number[] | null> {
	const res = await query<{ embedding: string }>(
		"SELECT embedding::text FROM news_articles WHERE id = $1 AND embedding IS NOT NULL",
		[id],
	);
	if (res.rowCount === 0 || !res.rows[0]?.embedding) {
		return null;
	}

	try {
		return JSON.parse(res.rows[0].embedding);
	} catch {
		return null;
	}
}

export async function getStorySimilarities(
	embedding: number[],
	threshold: number,
): Promise<Array<{ story_id: string; avg_sim: number }>> {
	const vectorString = `[${embedding.join(",")}]`;
	const cacheKey = `story:similarities:${createHash("sha256").update(vectorString).digest("hex").slice(0, 32)}:${threshold}`;
	const cached =
		await cacheGet<Array<{ story_id: string; avg_sim: number }>>(cacheKey);
	if (cached) return cached;

	const provider = config.vectorStore;

	if (provider === "postgres") {
		const res = await query<{ story_id: string; avg_sim: string }>(
			`SELECT sa.story_id, AVG(1 - (na.embedding <=> $1::vector)) AS avg_sim
			 FROM story_articles sa
			 JOIN news_articles na ON na.id = sa.article_id
			 JOIN news_stories ns ON ns.id = sa.story_id
			 WHERE na.embedding IS NOT NULL
			   AND ns.last_updated_at > NOW() - INTERVAL '72 hours'
			   AND ns.status = 'active'
			 GROUP BY sa.story_id
			 HAVING AVG(1 - (na.embedding <=> $1::vector)) >= $2
			 ORDER BY avg_sim DESC
			 LIMIT 5`,
			[vectorString, threshold],
		);
		const finalRes = res.rows.map((r) => ({
			story_id: r.story_id,
			avg_sim: parseFloat(r.avg_sim),
		}));
		await cacheSet(cacheKey, finalRes, 1800);
		return finalRes;
	}

	// For Qdrant or SQLite:
	// 1. Get active stories from the last 72 hours
	const activeStories = await query<{ id: string }>(
		`SELECT id FROM news_stories 
		 WHERE last_updated_at > NOW() - INTERVAL '72 hours' 
		   AND status = 'active'`,
	);
	if (activeStories.rowCount === 0) return [];

	const storyIds = activeStories.rows.map((s) => s.id);

	// 2. Get all articles in these stories
	const storyArticles = await query<{ story_id: string; article_id: string }>(
		`SELECT story_id, article_id FROM story_articles WHERE story_id = ANY($1::uuid[])`,
		[storyIds],
	);
	if (storyArticles.rowCount === 0) return [];

	const articleIds = storyArticles.rows.map((sa) => sa.article_id);
	const articleToStoryMap = new Map<string, string[]>();
	for (const sa of storyArticles.rows) {
		const list = articleToStoryMap.get(sa.article_id) || [];
		list.push(sa.story_id);
		articleToStoryMap.set(sa.article_id, list);
	}

	// 3. Query the similarities for these article IDs
	const similarities = new Map<string, number>();

	if (provider === "qdrant") {
		try {
			const client = getQdrantClient();
			const response = await client.search(COLLECTION_NAME, {
				vector: embedding,
				filter: {
					must: [{ has_id: articleIds }],
				},
				limit: articleIds.length,
				with_payload: false,
			});
			for (const hit of response) {
				similarities.set(hit.id as string, hit.score);
			}
		} catch (err) {
			console.error(
				"[vectorStore] Qdrant story similarity search failed:",
				(err as Error).message,
			);
		}
	} else {
		// SQLite fallback
		const sqliteResults = searchSimilarInSqlite(embedding, 5000);
		for (const r of sqliteResults) {
			if (articleIds.includes(r.id)) {
				similarities.set(r.id, r.similarity);
			}
		}
	}

	// 4. Calculate average similarity per story
	const storyScores = new Map<string, { sum: number; count: number }>();
	for (const articleId of articleIds) {
		const sim = similarities.get(articleId) ?? 0;
		const associatedStories = articleToStoryMap.get(articleId) || [];
		for (const sId of associatedStories) {
			const score = storyScores.get(sId) || { sum: 0, count: 0 };
			score.sum += sim;
			score.count += 1;
			storyScores.set(sId, score);
		}
	}

	const results: Array<{ story_id: string; avg_sim: number }> = [];
	for (const [sId, score] of storyScores.entries()) {
		const avg = score.count > 0 ? score.sum / score.count : 0;
		if (avg >= threshold) {
			results.push({ story_id: sId, avg_sim: avg });
		}
	}

	const finalRes = results.sort((a, b) => b.avg_sim - a.avg_sim).slice(0, 5);
	await cacheSet(cacheKey, finalRes, 1800);
	return finalRes;
}

export interface InsightSearchResult {
	id: string;
	topic: string;
	insight: string;
	confidence: number;
	created_at: string;
	similarity: number;
}

export async function upsertInsight(
	id: string,
	embedding: number[],
	insight: { topic: string; insight: string; confidence: number },
): Promise<void> {
	const provider = config.vectorStore;

	if (provider === "qdrant") {
		try {
			const client = getQdrantClient();
			await client.upsert(INSIGHTS_COLLECTION_NAME, {
				wait: true,
				points: [
					{
						id: id,
						vector: embedding,
						payload: {
							topic: insight.topic,
							insight: insight.insight,
							confidence: insight.confidence,
							createdAt: new Date().toISOString(),
						},
					},
				],
			});
		} catch (err) {
			console.error(
				"[vectorStore] Qdrant insight upsert failed:",
				(err as Error).message,
			);
		}
	}

	try {
		await upsertInsightPgvector(id, embedding);
	} catch (err) {
		console.warn(
			"[vectorStore] Failed to update pgvector insight:",
			(err as Error).message,
		);
	}
}

async function upsertInsightPgvector(
	id: string,
	embedding: number[],
): Promise<void> {
	const vectorString = `[${embedding.join(",")}]`;
	await query(
		"UPDATE knowledge_insights SET embedding = $1::vector WHERE id = $2",
		[vectorString, id],
	);
}

export async function searchInsights(
	embedding: number[],
	limit: number,
	minSimilarity = 0.55,
): Promise<InsightSearchResult[]> {
	const provider = config.vectorStore;

	if (provider === "qdrant") {
		try {
			const client = getQdrantClient();
			const searchResult = await client.search(INSIGHTS_COLLECTION_NAME, {
				vector: embedding,
				limit: limit,
				with_payload: true,
				score_threshold: minSimilarity,
			});

			return searchResult.map((hit) => ({
				id: hit.id as string,
				topic: (hit.payload as any).topic ?? "",
				insight: (hit.payload as any).insight ?? "",
				confidence: (hit.payload as any).confidence ?? 0.7,
				created_at: (hit.payload as any).createdAt ?? new Date().toISOString(),
				similarity: hit.score,
			}));
		} catch (err) {
			console.error(
				"[vectorStore] Qdrant insights search failed, falling back to pgvector:",
				(err as Error).message,
			);
			return searchInsightsPgvector(embedding, limit, minSimilarity);
		}
	} else {
		return searchInsightsPgvector(embedding, limit, minSimilarity);
	}
}

async function searchInsightsPgvector(
	embedding: number[],
	limit: number,
	minSimilarity: number,
): Promise<InsightSearchResult[]> {
	const vectorString = `[${embedding.join(",")}]`;
	const res = await query<InsightSearchResult>(
		`SELECT id, topic, insight, confidence, created_at,
		       1 - (embedding <=> $1::vector) AS similarity
		 FROM knowledge_insights
		 WHERE embedding IS NOT NULL
		   AND 1 - (embedding <=> $1::vector) >= $2
		 ORDER BY embedding <=> $1::vector
		 LIMIT $3`,
		[vectorString, minSimilarity, limit],
	);
	return res.rows;
}
