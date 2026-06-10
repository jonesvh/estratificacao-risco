import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.middleware';
import { createQuestionnaireSchema, updateQuestionnaireMetaSchema, updateQuestionnaireContentSchema } from './questionnaires.schema';
import { list, getOne, create, update, updateContent, deactivate } from './questionnaires.controller';

const router = Router();

router.get('/', list);
router.get('/:id', getOne);
router.post('/', validate(createQuestionnaireSchema), create);
router.patch('/:id', validate(updateQuestionnaireMetaSchema), update);
router.put('/:id', validate(updateQuestionnaireContentSchema), updateContent);
router.patch('/:id/deactivate', deactivate);

export { router as questionnairesRouter };
