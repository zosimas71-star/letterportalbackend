import { createApp } from './app.js';
import { env } from './config/env.js';
import { prisma } from './common/database/prisma.js';
import { logger } from './common/logging/logger.js';
import { storage } from './common/storage/local-storage.service.js';
async function main() {
  storage.init(); // creates ./uploads/.tmp
  await prisma.$connect();
  const server = createApp().listen(env.PORT, () => {
    logger.info(`API listening on :${env.PORT} (${env.NODE_ENV})`);
  });
  const shutdown = (signal) => {
    logger.info(`${signal} received, shutting down`);
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
main().catch((err) => {
  logger.fatal({ err }, 'Failed to start');
  process.exit(1);
});
