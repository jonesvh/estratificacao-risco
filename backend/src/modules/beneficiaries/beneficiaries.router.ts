import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  createBeneficiarySchema,
  updateBeneficiarySchema,
  listBeneficiariesSchema,
} from './beneficiaries.schema';
import { list, getOne, getHistory, create, update, deactivate } from './beneficiaries.controller';

const router = Router();

router.get('/', validate(listBeneficiariesSchema, 'query'), list);
router.get('/:id', getOne);
router.get('/:id/history', getHistory);
router.post('/', validate(createBeneficiarySchema), create);
router.put('/:id', validate(updateBeneficiarySchema), update);
router.patch('/:id/deactivate', deactivate);

export { router as beneficiariesRouter };
