import { query } from "../database/client.js";
import { cacheGet, cacheSet } from "./cache.js";
import { SIMILARITY_THRESHOLD } from "./correlation_logic.js";
import type {
	ArticleNode,
	GraphEdge,
	StoryGraph,
	StoryNode,
	TimelineEvent,
} from "./correlation_types.js";

export async function getStoryGraph(
	storyId: string,
): Promise<StoryGraph | null> {
	const cacheKey = `story:graph:${storyId}`;
	const cached = await cacheGet<StoryGraph>(cacheKey);
	if (cached) return cached;

	const storyRes = await query<
		StoryNode & {
			affected_assets: string[];
			impact_level: string;
			world_impact: string;
			financial_signal: string;
			first_seen_at: string;
			last_updated_at: string;
			article_count: number;
		}
	>(
		`SELECT id, title, summary, category, status, impact_level AS "impactLevel",
            world_impact AS "worldImpact", financial_signal AS "financialSignal",
            affected_assets AS "affectedAssets", first_seen_at AS "firstSeenAt",
            last_updated_at AS "lastUpdatedAt", article_count AS "articleCount"
     FROM news_stories WHERE id = $1`,
		[storyId],
	);
	if (!storyRes.rows[0]) return null;

	const articlesRes = await query<
		ArticleNode & { published_at: string; importance_score: number }
	>(
		`SELECT na.id, na.title, na.source, na.category, na.published_at AS "publishedAt",
            na.url, na.sentiment
     FROM news_articles na
     JOIN story_articles sa ON sa.article_id = na.id
     WHERE sa.story_id = $1
     ORDER BY na.published_at ASC`,
		[storyId],
	);

	const articleIds = articlesRes.rows.map((a) => a.id);
	const edgesRes =
		articleIds.length >= 2
			? await query<{
					article_a: string;
					article_b: string;
					similarity: number;
					relationType: string;
				}>(
					`SELECT article_a, article_b, similarity, relation_type AS "relationType"
         FROM article_relations
         WHERE article_a = ANY($1) AND article_b = ANY($1)
         ORDER BY similarity DESC`,
					[articleIds],
				)
			: { rows: [] };

	const timeline = await getStoryTimeline(storyId);

	const graph: StoryGraph = {
		story: storyRes.rows[0] as unknown as StoryNode,
		articles: articlesRes.rows,
		edges: edgesRes.rows.map((e) => ({
			source: e.article_a,
			target: e.article_b,
			similarity: e.similarity,
			relationType: e.relationType,
		})),
		timeline,
	};

	await cacheSet(cacheKey, graph, 300);
	return graph;
}

export async function getStoryTimeline(
	storyId: string,
): Promise<TimelineEvent[]> {
	const res = await query<TimelineEvent>(
		`SELECT id, event_type AS "eventType", headline, what_changed AS "whatChanged",
            occurred_at AS "occurredAt", article_id AS "articleId"
     FROM story_timeline
     WHERE story_id = $1
     ORDER BY occurred_at ASC`,
		[storyId],
	);
	return res.rows;
}

export async function listActiveStories(
	limit = 20,
	category?: string,
): Promise<StoryNode[]> {
	const cacheKey = `stories:active:${category ?? "all"}:${limit}`;
	const cached = await cacheGet<StoryNode[]>(cacheKey);
	if (cached) return cached;

	const params: unknown[] = [limit];
	let categoryClause = "";
	if (category) {
		params.push(category);
		categoryClause = `AND category = $${params.length}`;
	}

	const res = await query<StoryNode>(
		`SELECT id, title, summary, category, status,
            impact_level AS "impactLevel", world_impact AS "worldImpact",
            financial_signal AS "financialSignal", affected_assets AS "affectedAssets",
            first_seen_at AS "firstSeenAt", last_updated_at AS "lastUpdatedAt",
            article_count AS "articleCount"
     FROM news_stories
     WHERE status = 'active' ${categoryClause}
     ORDER BY last_updated_at DESC
     LIMIT $1`,
		params,
	);

	await cacheSet(cacheKey, res.rows, 120);
	return res.rows;
}

export async function getGlobalGraph(
	category?: string,
): Promise<{ nodes: ArticleNode[]; edges: GraphEdge[]; stories: StoryNode[] }> {
	const cacheKey = `graph:global:${category ?? "all"}`;
	const cached = await cacheGet<{
		nodes: ArticleNode[];
		edges: GraphEdge[];
		stories: StoryNode[];
	}>(cacheKey);
	if (cached) return cached;

	const params: unknown[] = [];
	let categoryClause = "";
	if (category) {
		params.push(category);
		categoryClause = `AND category = $${params.length}`;
	}

	const nodes = await query<ArticleNode>(
		`SELECT id, title, source, category, published_at AS "publishedAt", url, sentiment
     FROM news_articles
     WHERE published_at > NOW() - INTERVAL '48 hours' ${categoryClause}
     ORDER BY published_at DESC
     LIMIT 100`,
		params,
	);

	const nodeIds = nodes.rows.map((n) => n.id);
	const edges =
		nodeIds.length >= 2
			? await query<{
					article_a: string;
					article_b: string;
					similarity: number;
					relationType: string;
				}>(
					`SELECT article_a, article_b, similarity, relation_type AS "relationType"
         FROM article_relations
         WHERE article_a = ANY($1) AND article_b = ANY($1) AND similarity >= $2
         ORDER BY similarity DESC LIMIT 200`,
					[nodeIds, SIMILARITY_THRESHOLD],
				)
			: { rows: [] };

	const stories = await listActiveStories(20, category);

	const result = {
		nodes: nodes.rows,
		edges: edges.rows.map((e) => ({
			source: e.article_a,
			target: e.article_b,
			similarity: e.similarity,
			relationType: e.relationType,
		})),
		stories,
	};

	await cacheSet(cacheKey, result, 180);
	return result;
}
