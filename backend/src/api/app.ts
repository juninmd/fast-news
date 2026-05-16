import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { newsRouter } from './routes/news.js';
import { topicsRouter } from './routes/topics.js';
import { financialRouter } from './routes/financial.js';
import { ragRouter } from './routes/rag.js';
import { storiesRouter } from './routes/stories.js';
import { aiRouter } from './routes/ai.js';
import { healthHandler } from './health.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function createApp(): express.Application {
  const app = express();

  app.use(cors({ origin: '*' }));
  app.use(express.json());

  app.get('/health', healthHandler);
  app.head('/health', healthHandler);

  app.use('/api/news', newsRouter);
  app.use('/api/topics', topicsRouter);
  app.use('/api/financial', financialRouter);
  app.use('/api/rag', ragRouter);
  app.use('/api/stories', storiesRouter);
  app.use('/api/ai', aiRouter);

  // Serve static files from frontend build (optional — only when built)
  const clientPath = path.join(__dirname, '../../client');
  if (fs.existsSync(clientPath)) {
    app.use(express.static(clientPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api/')) return next();
      res.sendFile(path.join(clientPath, 'index.html'));
    });
  }

  app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error('[API] Error:', err.message);
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
