import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { requireAuth } from './shared/middleware/auth.middleware';
import { errorHandler } from './shared/middleware/error.middleware';
import { authRouter } from './modules/auth/auth.router';
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
      credentials: true, // required for cookies
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type'],
    }),
  );

  // Parsers
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Health check (unauthenticated)
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Public routes
  app.use('/api/auth', authRouter);

  // Protected routes
  app.use('/api/beneficiaries', requireAuth, beneficiariesRouter);
  app.use('/api/questionnaires', requireAuth, questionnairesRouter);
  app.use('/api/responses', requireAuth, responsesRouter);
  app.use('/api/dashboard', requireAuth, dashboardRouter);
  app.use('/api/export', requireAuth, exportRouter);

  // 404
  app.use((_req, res) => {
    res.status(404).json({ error: 'Rota não encontrada' });
  });

  // Global error handler (must be last)
  app.use(errorHandler);

  return app;
}
