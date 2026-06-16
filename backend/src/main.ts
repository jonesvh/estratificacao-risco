import https from 'https';
import http from 'http';
import { readFileSync } from 'fs';
import { buildApp } from './app';
import { env } from './config/env';
import { logger } from './shared/utils/logger';

const app = buildApp();

let server: http.Server | https.Server;

if (env.SSL_CERT && env.SSL_KEY) {
  const credentials = {
    cert: readFileSync(env.SSL_CERT),
    key: readFileSync(env.SSL_KEY),
  };
  server = https.createServer(credentials, app);
  server.listen(env.PORT, '0.0.0.0', () => {
    logger.info({ port: env.PORT, protocol: 'https', env: env.NODE_ENV }, 'Server started');
  });
} else {
  server = app.listen(env.PORT, '0.0.0.0', () => {
    logger.info({ port: env.PORT, protocol: 'http', env: env.NODE_ENV }, 'Server started');
  });
}

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
