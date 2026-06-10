import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { validate } from '../../shared/middleware/validate.middleware';
import { requireAuth } from '../../shared/middleware/auth.middleware';
import { loginSchema } from './auth.schema';
import { handleLogin, handleLogout, handleMe } from './auth.controller';

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, validate(loginSchema), handleLogin);
router.post('/logout', requireAuth, handleLogout);
router.get('/me', requireAuth, handleMe);

export { router as authRouter };
