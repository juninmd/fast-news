import { Router, Request, Response } from 'express';
import { query } from '../../database/client.js';
import { analyzeTopicWithRAG, getAllTrackedTopics, getTopicLatestAnalysis } from '../../services/analysis.js';
import { cacheGet, cacheSet } from '../../services/cache.js';

export const topicsRouter = Router();

topicsRouter.get('/', async (_req: Request, res: Response) => {
  const cached = await cacheGet('topics:all');
  if (cached) return res.json(cached);

  const topics = await getAllTrackedTopics();
  await cacheSet('topics:all', topics, 300);
  return res.json({ data: topics });
});

topicsRouter.post('/', async (req: Request, res: Response) => {
  const { name, description, keywords } = req.body as {
    name?: string;
    description?: string;
    keywords?: string[];
  };

  if (!name || !keywords?.length) {
    return res.status(400).json({ error: 'name and keywords are required' });
  }

  const result = await query<{ id: string }>(
    `INSERT INTO tracked_topics (name, description, keywords)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [name, description ?? '', keywords]
  );

  return res.status(201).json({ id: result.rows[0]?.id });
});

topicsRouter.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const result = await query(
    'SELECT * FROM tracked_topics WHERE id = $1',
    [id]
  );
  if (!result.rows[0]) return res.status(404).json({ error: 'Topic not found' });
  return res.json(result.rows[0]);
});

topicsRouter.get('/:id/analysis', async (req: Request, res: Response) => {
  const { id } = req.params;
  const topics = await getAllTrackedTopics();
  const topic = topics.find((t) => t.id === id);
  if (!topic) return res.status(404).json({ error: 'Topic not found' });

  const forceRefresh = req.query['refresh'] === 'true';
  let analysis: string | null = null;

  if (!forceRefresh) {
    analysis = await getTopicLatestAnalysis(id);
  }

  if (!analysis || forceRefresh) {
    analysis = await analyzeTopicWithRAG(topic);
  }

  return res.json({ topicId: id, analysis });
});

topicsRouter.get('/:id/history', async (req: Request, res: Response) => {
  const { id } = req.params;
  const limit = Math.min(parseInt(req.query['limit'] as string ?? '10', 10), 30);

  const result = await query(
    `SELECT id, analysis_type, content, created_at
     FROM ai_analyses
     WHERE topic_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [id, limit]
  );
  return res.json({ data: result.rows });
});

topicsRouter.delete('/:id', async (req: Request, res: Response) => {
  await query('UPDATE tracked_topics SET is_active = FALSE WHERE id = $1', [req.params['id']]);
  return res.json({ success: true });
});
