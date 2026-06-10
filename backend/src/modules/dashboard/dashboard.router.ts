import { Router } from 'express';
import { summary, recent } from './dashboard.controller';

const router = Router();

router.get('/summary', summary);
router.get('/recent', recent);

export { router as dashboardRouter };
