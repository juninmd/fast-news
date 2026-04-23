import { Router, Request, Response } from 'express';
import { query } from '../../database/client.js';
import { getActiveOpportunities } from '../../services/financial.js';

export const financialRouter = Router();

financialRouter.get('/', async (_req: Request, res: Response) => {
  const opportunities = await getActiveOpportunities();
  return res.json({ data: opportunities });
});

financialRouter.get('/by-asset/:asset', async (req: Request, res: Response) => {
  const result = await query(
    `SELECT * FROM financial_opportunities
     WHERE UPPER(asset) = UPPER($1)
       AND created_at > NOW() - INTERVAL '7 days'
     ORDER BY created_at DESC`,
    [req.params['asset']]
  );
  return res.json({ data: result.rows });
});

financialRouter.get('/summary', async (_req: Request, res: Response) => {
  const result = await query<{
    direction: string;
    asset_type: string;
    count: string;
    avg_confidence: string;
  }>(
    `SELECT direction, asset_type, COUNT(*) as count,
       ROUND(AVG(confidence)::numeric, 2) as avg_confidence
     FROM financial_opportunities
     WHERE is_active = TRUE
       AND created_at > NOW() - INTERVAL '48 hours'
     GROUP BY direction, asset_type
     ORDER BY avg_confidence DESC`
  );
  return res.json({ data: result.rows });
});

financialRouter.patch('/:id/dismiss', async (req: Request, res: Response) => {
  await query(
    'UPDATE financial_opportunities SET is_active = FALSE WHERE id = $1',
    [req.params['id']]
  );
  return res.json({ success: true });
});
