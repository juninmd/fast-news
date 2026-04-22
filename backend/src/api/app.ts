import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { newsRouter } from './routes/news.js';
import { topicsRouter } from './routes/topics.js';
import { financialRouter } from './routes/financial.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): express.Application {
  const app = express();

  app.use(cors({ origin: '*' }));
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  app.use('/api/news', newsRouter);
  app.use('/api/topics', topicsRouter);
  app.use('/api/financial', financialRouter);

  // Serve static files from frontend
  const clientPath = path.join(__dirname, '../../client');
  app.use(express.static(clientPath));

  // Catch-all route for SPA
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    res.sendFile(path.join(clientPath, 'index.html'));
  });

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[API] Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
