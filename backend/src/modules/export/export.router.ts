import { Router } from 'express';
import { exportResponses } from './export.controller';

const router = Router();

router.get('/responses', exportResponses);

export { router as exportRouter };
