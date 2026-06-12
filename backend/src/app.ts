import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { existsSync } from 'fs';
import path from 'path';
import { env } from './config/env';
import { errorHandler } from './shared/middleware/error.middleware';
import { beneficiariesRouter } from './modules/beneficiaries/beneficiaries.router';
import { questionnairesRouter } from './modules/questionnaires/questionnaires.router';
import { responsesRouter } from './modules/responses/responses.router';
import { dashboardRouter } from './modules/dashboard/dashboard.router';
import { exportRouter } from './modules/export/export.router';

export function buildApp() {
  const app = express();

  // Security
  app.use(helmet());
  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: false,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    }),
  );

  // Parsers
  app.use(express.json({ limit: '1mb' }));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // API routes (all public — no auth)
  app.use('/api/beneficiaries', beneficiariesRouter);
  app.use('/api/questionnaires', questionnairesRouter);
  app.use('/api/responses', responsesRouter);
  app.use('/api/dashboard', dashboardRouter);
  app.use('/api/export', exportRouter);

  // Frontend SPA (only when FRONTEND_DIST_PATH is set — direct Node.js mode, no nginx)
  if (env.FRONTEND_DIST_PATH) {
    const distPath = path.resolve(env.FRONTEND_DIST_PATH);
    if (existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  } else {
    // 404 for API-only mode (Docker + nginx)
    app.use((_req, res) => {
      res.status(404).json({ error: 'Rota não encontrada' });
    });
  }

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
