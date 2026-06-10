import { Request, Response, NextFunction } from 'express';
import * as service from './beneficiaries.service';
import { ListBeneficiariesQuery } from './beneficiaries.schema';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await service.listBeneficiaries(req.query as ListBeneficiariesQuery);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getOne(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.getBeneficiary(req.params.id as string);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.getBeneficiaryHistory(req.params.id as string);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.createBeneficiary(req.body);
    res.status(201).json(data);
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.updateBeneficiary(req.params.id as string, req.body);
    res.json(data);
  } catch (err) {
    next(err);
  }
}

export async function deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await service.deactivateBeneficiary(req.params.id as string);
    res.json(data);
  } catch (err) {
    next(err);
  }
}
