import { query } from '../database/client.js';
import { embedQuery, vectorToSQL } from './embeddings.js';
import { cacheGet, cacheSet } from './cache.js';
import { config } from '../config/env.js';

export interface ArticleResult {
  id: string;
  title: string;
  content: string;
  url: string;
  source: string;
  category: string;
  published_at: string;
  similarity: number;
}

export interface InsightResult {
  id: string;
  topic: string;
  insight: string;
  confidence: number;
  created_at: string;
  similarity: number;
}

export async function searchSimilarArticles(
  queryText: string,
  daysBack = 30,
  limit = config.rag.topK
): Promise<ArticleResult[]> {
  const cacheKey = `rag:articles:${Buffer.from(queryText).toString('base64').slice(0, 32)}`;
  const cached = await cacheGet<ArticleResult[]>(cacheKey);
  if (cached) return cached;

  const embedding = await embedQuery(queryText);
  const result = await query<ArticleResult>(
    `SELECT id, title, content, url, source, category, published_at,
       1 - (embedding <=> $1::vector) AS similarity
     FROM news_articles
     WHERE published_at > NOW() - INTERVAL '${daysBack} days'
       AND embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vectorToSQL(embedding), limit]
  );

  await cacheSet(cacheKey, result.rows, 1800);
  return result.rows;
}

export async function searchSimilarInsights(
  queryText: string,
  limit = 5
): Promise<InsightResult[]> {
  const embedding = await embedQuery(queryText);
  const result = await query<InsightResult>(
    `SELECT id, topic, insight, confidence, created_at,
       1 - (embedding <=> $1::vector) AS similarity
     FROM knowledge_insights
     WHERE embedding IS NOT NULL
     ORDER BY embedding <=> $1::vector
     LIMIT $2`,
    [vectorToSQL(embedding), limit]
  );
  return result.rows;
}

export function buildRagContext(
  articles: ArticleResult[],
  insights: InsightResult[]
): string {
  const articleContext = articles
    .slice(0, 8)
    .map((a, i) => `[${i + 1}] ${a.source} (${new Date(a.published_at).toLocaleDateString('pt-BR')})\n${a.title}\n${(a.content ?? '').slice(0, 300)}`)
    .join('\n\n');

  const insightContext = insights
    .slice(0, 3)
    .map((ins) => `• ${ins.insight} (confiança: ${(ins.confidence * 10).toFixed(1)}/10)`)
    .join('\n');

  return [
    articleContext ? `NOTÍCIAS RELACIONADAS:\n${articleContext}` : '',
    insightContext ? `INSIGHTS ACUMULADOS:\n${insightContext}` : '',
  ].filter(Boolean).join('\n\n');
}
