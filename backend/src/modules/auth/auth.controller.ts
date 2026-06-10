import { Request, Response, NextFunction } from 'express';
import { login } from './auth.service';
import { LoginInput } from './auth.schema';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
  maxAge: 8 * 60 * 60 * 1000, // 8h in ms
};

export async function handleLogin(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, email } = await login(req.body as LoginInput);
    res.cookie('token', token, COOKIE_OPTIONS);
    res.status(200).json({ user: { email } });
  } catch (err) {
    next(err);
  }
}

export function handleLogout(_req: Request, res: Response): void {
  res.clearCookie('token', { path: '/' });
  res.status(200).json({ message: 'Sessão encerrada' });
}

export function handleMe(req: Request, res: Response): void {
  res.status(200).json({ user: req.user });
}
