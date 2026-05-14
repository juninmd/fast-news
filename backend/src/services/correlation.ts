import { generateText, generateObject } from 'ai';
import { z } from 'zod';
import { query } from '../database/client.js';
import { embedDocument, vectorToSQL } from './embeddings.js';
import { getLanguageModel, getFastModel } from './aiProvider.js';
import { cacheGet, cacheSet } from './cache.js';

const SIMILARITY_THRESHOLD = 0.75;
const STORY_MERGE_THRESHOLD = 0.80;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StoryNode {
  id: string;
  title: string;
  summary: string | null;
  category: string;
  status: string;
  impactLevel: string;
  worldImpact: string | null;
  financialSignal: string | null;
  affectedAssets: string[];
  firstSeenAt: string;
  lastUpdatedAt: string;
  articleCount: number;
}

export interface ArticleNode {
  id: string;
  title: string;
  source: string;
  category: string;
  publishedAt: string | null;
  url: string;
  sentiment: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  similarity: number;
  relationType: string;
}

export interface StoryGraph {
  story: StoryNode;
  articles: ArticleNode[];
  edges: GraphEdge[];
  timeline: TimelineEvent[];
}

export interface TimelineEvent {
  id: string;
  eventType: string;
  headline: string;
  whatChanged: string | null;
  occurredAt: string;
  articleId: string | null;
}

// ─── Story classification prompt ─────────────────────────────────────────────

const STORY_CLASSIFY_PROMPT = `Você é um editor de notícias que agrupa artigos em histórias contínuas.

ARTIGO NOVO:
Título: {title}
Categoria: {category}
Conteúdo: {content}

HISTÓRIAS ATIVAS (últimas 72h):
{activeStories}

Decida se este artigo:
1. Pertence a uma história existente (retorne seu ID)
2. Inicia uma nova história (retorne "new")

Responda APENAS com o UUID da história ou "new".`;

const StorySchema = z.object({
  title: z.string().describe('Título conciso da história (max 80 chars)'),
  summary: z.string().describe('Resumo em 2-3 frases do que aconteceu'),
  impactLevel: z.enum(['low', 'medium', 'high', 'critical']),
  worldImpact: z.string().describe('Impactos no mundo em 3-4 frases'),
  financialSignal: z.enum(['bullish', 'bearish', 'neutral']),
  affectedAssets: z.array(z.string()).describe('Ativos afetados: tickers BR e globais, crypto, commodities'),
  eventType: z.enum(['new_development', 'contradiction', 'resolution', 'escalation', 'impact_update']),
  whatChanged: z.string().describe('O que mudou nesta notícia vs estado anterior da história'),
});

// ─── Core functions ────────────────────────────────────────────────────────────

export async function buildArticleRelations(articleId: string): Promise<void> {
  const res = await query<{ id: string; embedding: string }>(
    `SELECT id, embedding FROM news_articles WHERE id = $1 AND embedding IS NOT NULL`,
    [articleId]
  );
  if (!res.rows[0]) return;

  const candidates = await query<{ id: string; similarity: string }>(
    `SELECT id, 1 - (embedding <=> $1::vector) AS similarity
     FROM news_articles
     WHERE id != $2
       AND embedding IS NOT NULL
       AND published_at > NOW() - INTERVAL '7 days'
     ORDER BY embedding <=> $1::vector
     LIMIT 20`,
    [res.rows[0].embedding, articleId]
  );

  for (const c of candidates.rows) {
    const sim = parseFloat(c.similarity);
    if (sim < SIMILARITY_THRESHOLD) continue;
    const [a, b] = articleId < c.id ? [articleId, c.id] : [c.id, articleId];
    await query(
      `INSERT INTO article_relations (article_a, article_b, similarity)
       VALUES ($1, $2, $3) ON CONFLICT (article_a, article_b) DO UPDATE SET similarity = $3`,
      [a, b, sim]
    );
  }
}

export async function assignArticleToStory(articleId: string): Promise<string | null> {
  const artRes = await query<{ id: string; title: string; content: string; category: string; embedding: string }>(
    `SELECT id, title, content, category, embedding FROM news_articles WHERE id = $1`,
    [articleId]
  );
  const article = artRes.rows[0];
  if (!article || !article.embedding) return null;

  // Find stories whose recent articles are similar
  const storyRes = await query<{ story_id: string; avg_sim: string }>(
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
    [article.embedding, STORY_MERGE_THRESHOLD]
  );

  let targetStoryId: string | null = null;

  if (storyRes.rows.length > 0) {
    targetStoryId = storyRes.rows[0].story_id;
  } else {
    // Create new story
    const newStory = await query<{ id: string }>(
      `INSERT INTO news_stories (title, category, article_count)
       VALUES ($1, $2, 0) RETURNING id`,
      [article.title.slice(0, 80), article.category]
    );
    targetStoryId = newStory.rows[0].id;
  }

  // Link article to story
  await query(
    `INSERT INTO story_articles (story_id, article_id, role)
     VALUES ($1, $2, $3) ON CONFLICT DO NOTHING`,
    [targetStoryId, articleId, storyRes.rows.length > 0 ? 'update' : 'origin']
  );

  // Update story metadata
  await enrichStory(targetStoryId, articleId, article);

  return targetStoryId;
}

async function enrichStory(
  storyId: string,
  newArticleId: string,
  article: { title: string; content: string; category: string }
): Promise<void> {
  try {
    // Get previous story state for diff
    const prev = await query<{ title: string; summary: string }>(
      `SELECT title, summary FROM news_stories WHERE id = $1`,
      [storyId]
    );

    const contextPrompt = `Analise este artigo no contexto de uma história de notícias em evolução.

HISTÓRIA ATUAL: ${prev.rows[0]?.title ?? 'Nova história'}
ESTADO ANTERIOR: ${prev.rows[0]?.summary ?? 'Primeira notícia desta história'}

NOVO ARTIGO:
Título: ${article.title}
Conteúdo: ${(article.content ?? '').slice(0, 1500)}`;

    const model = await getFastModel();
    const { object } = await generateObject({
      model,
      schema: StorySchema,
      prompt: contextPrompt,
    });

    await query(
      `UPDATE news_stories SET
         title = $1, summary = $2, impact_level = $3, world_impact = $4,
         financial_signal = $5, affected_assets = $6, last_updated_at = NOW(),
         article_count = (SELECT COUNT(*) FROM story_articles WHERE story_id = $7)
       WHERE id = $7`,
      [
        object.title, object.summary, object.impactLevel, object.worldImpact,
        object.financialSignal, object.affectedAssets, storyId,
      ]
    );

    // Add timeline event
    const artPublished = await query<{ published_at: string }>(
      `SELECT published_at FROM news_articles WHERE id = $1`,
      [newArticleId]
    );

    await query(
      `INSERT INTO story_timeline (story_id, article_id, event_type, headline, what_changed, occurred_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        storyId, newArticleId, object.eventType, article.title,
        object.whatChanged, artPublished.rows[0]?.published_at ?? new Date().toISOString(),
      ]
    );
  } catch (err) {
    console.error('[correlation] enrichStory failed:', err);
  }
}

// ─── Query functions ───────────────────────────────────────────────────────────

export async function getStoryGraph(storyId: string): Promise<StoryGraph | null> {
  const cacheKey = `story:graph:${storyId}`;
  const cached = await cacheGet<StoryGraph>(cacheKey);
  if (cached) return cached;

  const storyRes = await query<StoryNode & { affected_assets: string[]; impact_level: string; world_impact: string; financial_signal: string; first_seen_at: string; last_updated_at: string; article_count: number }>(
    `SELECT id, title, summary, category, status, impact_level AS "impactLevel",
            world_impact AS "worldImpact", financial_signal AS "financialSignal",
            affected_assets AS "affectedAssets", first_seen_at AS "firstSeenAt",
            last_updated_at AS "lastUpdatedAt", article_count AS "articleCount"
     FROM news_stories WHERE id = $1`,
    [storyId]
  );
  if (!storyRes.rows[0]) return null;

  const articlesRes = await query<ArticleNode & { published_at: string; importance_score: number }>(
    `SELECT na.id, na.title, na.source, na.category, na.published_at AS "publishedAt",
            na.url, na.sentiment
     FROM news_articles na
     JOIN story_articles sa ON sa.article_id = na.id
     WHERE sa.story_id = $1
     ORDER BY na.published_at ASC`,
    [storyId]
  );

  const articleIds = articlesRes.rows.map((a) => a.id);
  const edgesRes = articleIds.length >= 2
    ? await query<{ article_a: string; article_b: string; similarity: number; relationType: string }>(
        `SELECT article_a, article_b, similarity, relation_type AS "relationType"
         FROM article_relations
         WHERE article_a = ANY($1) AND article_b = ANY($1)
         ORDER BY similarity DESC`,
        [articleIds]
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

export async function getStoryTimeline(storyId: string): Promise<TimelineEvent[]> {
  const res = await query<TimelineEvent>(
    `SELECT id, event_type AS "eventType", headline, what_changed AS "whatChanged",
            occurred_at AS "occurredAt", article_id AS "articleId"
     FROM story_timeline
     WHERE story_id = $1
     ORDER BY occurred_at ASC`,
    [storyId]
  );
  return res.rows;
}

export async function listActiveStories(limit = 20, category?: string): Promise<StoryNode[]> {
  const cacheKey = `stories:active:${category ?? 'all'}:${limit}`;
  const cached = await cacheGet<StoryNode[]>(cacheKey);
  if (cached) return cached;

  const params: unknown[] = [limit];
  let categoryClause = '';
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
    params
  );

  await cacheSet(cacheKey, res.rows, 120);
  return res.rows;
}

export async function getGlobalGraph(category?: string): Promise<{ nodes: ArticleNode[]; edges: GraphEdge[]; stories: StoryNode[] }> {
  const cacheKey = `graph:global:${category ?? 'all'}`;
  const cached = await cacheGet<{ nodes: ArticleNode[]; edges: GraphEdge[]; stories: StoryNode[] }>(cacheKey);
  if (cached) return cached;

  const params: unknown[] = [];
  let categoryClause = '';
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
    params
  );

  const nodeIds = nodes.rows.map((n) => n.id);
  const edges = nodeIds.length >= 2
    ? await query<{ article_a: string; article_b: string; similarity: number; relationType: string }>(
        `SELECT article_a, article_b, similarity, relation_type AS "relationType"
         FROM article_relations
         WHERE article_a = ANY($1) AND article_b = ANY($1) AND similarity >= $2
         ORDER BY similarity DESC LIMIT 200`,
        [nodeIds, SIMILARITY_THRESHOLD]
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
