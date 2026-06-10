import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { RiskLevel } from '@prisma/client';
import { streamResponsesXlsx } from './export.service';

const filtersSchema = z.object({
  beneficiaryId: z.string().uuid().optional(),
  questionnaireId: z.string().uuid(),
  riskLevel: z.nativeEnum(RiskLevel).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
});

export async function exportResponses(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters = filtersSchema.parse(req.query);
    await streamResponsesXlsx(filters, res);
  } catch (err) {
    next(err);
  }
}
