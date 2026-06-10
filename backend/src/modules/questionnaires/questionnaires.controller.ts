import { Request, Response, NextFunction } from 'express';
import * as service from './questionnaires.service';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const activeOnly = req.query.isActive !== 'false';
    const data = await service.listQuestionnaires(activeOnly);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.getQuestionnaire(req.params.id as string);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.createQuestionnaire(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.updateQuestionnaireMeta(req.params.id as string, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function updateContent(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.updateQuestionnaireContent(req.params.id as string, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.deactivateQuestionnaire(req.params.id as string);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
