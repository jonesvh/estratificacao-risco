import { Request, Response, NextFunction } from 'express';
import * as service from './responses.service';
import { ListResponsesQuery } from './responses.schema';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.listResponses(req.query as ListResponsesQuery);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.getResponse(req.params.id as string);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.createResponse(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.updateResponse(req.params.id as string, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
