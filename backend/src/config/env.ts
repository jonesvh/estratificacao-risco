import { z } from 'zod';

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  JSON_DB_PATH: z.string().default('./MEDPREV/db.json'),
  FRONTEND_DIST_PATH: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  SSL_CERT: z.string().optional(),
  SSL_KEY: z.string().optional(),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error']).default('info'),
});

const parsed = schema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variáveis de ambiente inválidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;
