import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../errors/AppError';
import { logger } from '../utils/logger';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Dados inválidos',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Erro interno do servidor' });
}
