import { Router, Request, Response } from 'express';
import { searchSimilarInSqlite, getSqliteStats, exportForRAG } from '../../database/sqliteStore.js';
import { embedQuery } from '../../services/embeddings.js';

export const ragRouter: Router = Router();

ragRouter.get('/search', async (req: Request, res: Response) => {
  const q = (req.query['q'] as string)?.trim();
  const limit = Math.min(parseInt(req.query['limit'] as string ?? '10', 10), 50);

  if (!q || q.length < 3) return res.status(400).json({ error: 'Query muito curta (min 3 chars)' });

  try {
    const queryEmbedding = await embedQuery(q);
    const results = searchSimilarInSqlite(queryEmbedding, limit);
    return res.json({ query: q, total: results.length, results });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao buscar';
    return res.status(500).json({ error: msg });
  }
});

ragRouter.get('/stats', (_req: Request, res: Response) => {
  const stats = getSqliteStats();
  return res.json(stats);
});

ragRouter.get('/export', (req: Request, res: Response) => {
  const limit = Math.min(parseInt(req.query['limit'] as string ?? '5000', 10), 10000);
  const format = req.query['format'] as string ?? 'json';

  const data = exportForRAG(limit);

  if (format === 'jsonl') {
    res.setHeader('Content-Type', 'application/x-ndjson');
    res.setHeader('Content-Disposition', 'attachment; filename="news_embeddings.jsonl"');
    data.forEach((item) => res.write(JSON.stringify(item) + '\n'));
    return res.end();
  }

  res.setHeader('Content-Disposition', 'attachment; filename="news_embeddings.json"');
  return res.json({ total: data.length, articles: data });
});
