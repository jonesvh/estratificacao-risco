import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../config/database';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';
import { LoginInput } from './auth.schema';

export async function login(data: LoginInput): Promise<{ token: string; email: string }> {
  const user = await prisma.user.findUnique({ where: { email: data.email } });

  // Generic message — never reveal whether the email exists
  const invalidError = new AppError('Credenciais inválidas', 401);

  if (!user) throw invalidError;

  const passwordMatch = await bcrypt.compare(data.password, user.passwordHash);
  if (!passwordMatch) throw invalidError;

  const token = jwt.sign({ sub: user.id, email: user.email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'],
  });

  return { token, email: user.email };
}
