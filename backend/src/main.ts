import { buildApp } from './app';
import { env } from './config/env';
import { logger } from './shared/utils/logger';

const app = buildApp();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, 'Server started');
});

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutdown signal received');
  server.close(() => {
    logger.info('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
  process.exit(1);
});
