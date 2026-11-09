import { randomUUID } from 'node:crypto';
import cors from 'cors';
import express from 'express';
import { pinoHttp } from 'pino-http';
import { env } from './config/env.js';
import { logger } from './common/logging/logger.js';
import { errorHandler } from './common/middleware/error-handler.js';
import { notFoundHandler } from './common/middleware/not-found.js';
import { globalLimiter } from './common/middleware/rate-limit.js';
import { v1 } from './routes.js';

export function createApp() {
  const app = express();
  app.set('trust proxy', env.TRUST_PROXY);
  app.disable('x-powered-by');

  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = req.headers['x-request-id'] ?? randomUUID();
        res.setHeader('x-request-id', id);
        return id;
      },
    }),
  );

  // TEMPORARY: allow all origins. Restore the restricted version before production.
  app.use(cors());

  app.use(globalLimiter);
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({ success: true, data: { status: 'ok' } });
  });

  app.use('/api/v1', v1);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}