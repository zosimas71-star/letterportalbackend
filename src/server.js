
import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './common/database/prisma.js';
import { logger } from './common/logging/logger.js';
import { storage } from './common/storage/local-storage.service.js';

async function main() {
  console.log('1. Starting application...');

  // Initialize local storage
  storage.init();
  console.log('2. Storage initialized');

  // Connect database
  await prisma.$connect();
  console.log('3. Database connected');

  // Create Express application
  const app = createApp();

  if (!app || typeof app.listen !== 'function') {
    throw new Error('createApp() did not return a valid Express application');
  }

  console.log('4. Express application created');

  // Start HTTP server
  const server = app.listen(env.PORT, () => {
    console.log('5. Server is running!');
    console.log(`PORT: ${env.PORT}`);
    console.log(`ENVIRONMENT: ${env.NODE_ENV}`);
    console.log('SERVER LISTENING:', server.listening);

    logger.info(
      `API listening on :${env.PORT} (${env.NODE_ENV})`
    );
  });

  server.on('error', (err) => {
    console.error('SERVER ERROR:', err);
    logger.error({ err }, 'HTTP server error');
  });

  server.on('close', () => {
    console.log('SERVER CLOSED');
  });

  // Graceful shutdown
  let shuttingDown = false;

  const shutdown = (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;

    console.log(`${signal} received, shutting down...`);

    logger.info(`${signal} received, shutting down`);

    server.close(async (err) => {
      if (err) {
        logger.error({ err }, 'Error closing HTTP server');
      }

      try {
        await prisma.$disconnect();
        console.log('Database disconnected');
        process.exit(0);
      } catch (disconnectError) {
        console.error('Database disconnect error:', disconnectError);
        process.exit(1);
      }
    });

    setTimeout(() => {
      console.error('Shutdown timeout reached');
      process.exit(1);
    }, 10000).unref();
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((err) => {
  console.error('STARTUP ERROR:', err);

  logger.fatal({ err }, 'Failed to start');

  prisma.$disconnect().finally(() => {
    process.exit(1);
  });
});

process.on('beforeExit', (code) => {
  console.log('NODE BEFORE EXIT:', code);
});
