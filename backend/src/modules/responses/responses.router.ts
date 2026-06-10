import { Router } from 'express';
import { validate } from '../../shared/middleware/validate.middleware';
import { createResponseSchema, updateResponseSchema, listResponsesSchema } from './responses.schema';
import { list, getOne, create, update } from './responses.controller';

const router = Router();

router.get('/', validate(listResponsesSchema, 'query'), list);
router.get('/:id', getOne);
router.post('/', validate(createResponseSchema), create);
router.patch('/:id', validate(updateResponseSchema), update);

export { router as responsesRouter };
