import { Router, Request, Response } from 'express';
import { query } from '../../database/client.js';
import { searchSimilarArticles } from '../../services/rag.js';
import { cacheGet, cacheSet } from '../../services/cache.js';

export const newsRouter: Router = Router();

newsRouter.get('/', async (req: Request, res: Response) => {
  const page = parseInt(req.query['page'] as string ?? '1', 10);
  const limit = Math.min(parseInt(req.query['limit'] as string ?? '20', 10), 50);
  const category = req.query['category'] as string | undefined;
  const offset = (page - 1) * limit;

  const cacheKey = `news:list:${page}:${limit}:${category ?? 'all'}`;
  const cached = await cacheGet(cacheKey);
  if (cached) return res.json(cached);

  const whereClauses: string[] = [];
  const params: unknown[] = [limit, offset];

  if (category) {
    whereClauses.push(`category = $${params.length + 1}`);
    params.push(category);
  }

  const where = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : '';
  const result = await query<{
    id: string;
    title: string;
    summary: string;
    url: string;
    source: string;
    category: string;
    published_at: string;
    sentiment: string;
    importance_score: number;
    total_count: string;
  }>(
    `SELECT id, title, summary, url, source, category, published_at, sentiment, importance_score,
            COUNT(*) OVER() AS total_count
     FROM news_articles ${where}
     ORDER BY published_at DESC NULLS LAST
     LIMIT $1 OFFSET $2`,
    params
  );

  const total = result.rows[0]?.total_count ? parseInt(result.rows[0].total_count, 10) : 0;
  const hasMore = offset + limit < total;

  const response = { 
    data: result.rows, 
    articles: result.rows, // Add this for frontend compatibility
    page, 
    limit, 
    total,
    hasMore 
  };

  await cacheSet(cacheKey, response, 300);
  return res.json(response);
});

newsRouter.get('/:id/related', async (req: Request, res: Response) => {
  const { id } = req.params;
  const article = await query<{ title: string; content: string }>(
    'SELECT title, content FROM news_articles WHERE id = $1',
    [id]
  );
  if (!article.rows[0]) return res.status(404).json({ error: 'Article not found' });

  const { title, content } = article.rows[0];
  const related = await searchSimilarArticles(`${title} ${content}`, 30, 8);
  return res.json({ data: related.filter((a) => a.id !== id) });
});

newsRouter.get('/search', async (req: Request, res: Response) => {
  const q = req.query['q'] as string;
  if (!q || q.trim().length < 3) return res.status(400).json({ error: 'Query too short' });

  const results = await searchSimilarArticles(q, 30, 10);
  return res.json({ data: results, query: q });
});

newsRouter.get('/categories', async (_req: Request, res: Response) => {
  const cached = await cacheGet('news:categories');
  if (cached) return res.json(cached);

  const result = await query<{ category: string; count: string }>(
    'SELECT category, COUNT(*) as count FROM news_articles GROUP BY category ORDER BY count DESC'
  );
  await cacheSet('news:categories', result.rows, 3600);
  return res.json(result.rows);
});
