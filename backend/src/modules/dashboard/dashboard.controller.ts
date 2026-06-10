import { Request, Response, NextFunction } from 'express';
import { getSummary, getRecentResponses } from './dashboard.service';

export async function summary(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getSummary();
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function recent(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await getRecentResponses();
    res.json(data);
  } catch (err) {
    next(err);
  }
}
