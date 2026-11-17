
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

  // 1. HTTP request logger
  app.use(
    pinoHttp({
      logger,
      genReqId: (req, res) => {
        const id = req.headers['x-request-id'] ?? randomUUID();

        res.setHeader('x-request-id', id);

        return id;
      },
    })
  );

  // 2. Console request logger
  app.use((req, res, next) => {
    console.log(
      `[REQUEST] ${req.method} ${req.originalUrl}`
    );

    res.on('finish', () => {
      console.log(
        `[RESPONSE] ${req.method} ${req.originalUrl} - ${res.statusCode}`
      );
    });

    next();
  });

  // 3. CORS
  app.use(cors());

  // 4. Rate limiting
  app.use(globalLimiter);

  // 5. Body parser
  app.use(express.json({ limit: '1mb' }));

  // 6. Health check
  app.get('/health', (req, res) => {
    console.log('HEALTH ROUTE EXECUTED');

    res.json({
      success: true,
      data: {
        status: 'ok',
      },
    });
  });

  // 7. API routes
  app.use('/api/v1', v1);

  // 8. Not found handler
  app.use(notFoundHandler);

  // 9. Global error handler
  app.use(errorHandler);

  console.log('Express application configured');

  return app;
}
