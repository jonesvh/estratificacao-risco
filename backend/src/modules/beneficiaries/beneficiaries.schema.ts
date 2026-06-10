import { z } from 'zod';

const cpfRegex = /^\d{11}$/;

const emptyToUndefined = <T extends z.ZodTypeAny>(schema: T) =>
  z.preprocess((v) => (v === '' ? undefined : v), schema);

export const createBeneficiarySchema = z.object({
  name: z.string().min(2).max(255),
  cpf: z.string().regex(cpfRegex, 'CPF deve conter 11 dígitos numéricos'),
  birthDate: z.string().date('Data de nascimento inválida (YYYY-MM-DD)'),
  gender: emptyToUndefined(z.enum(['MALE', 'FEMALE', 'OTHER', 'NOT_INFORMED']).optional()),
  phone: z.string().max(20).optional(),
  email: emptyToUndefined(z.string().email().max(255).optional()),
  planCode: emptyToUndefined(z.enum(['Empresarial', 'Fisica', 'Adesao']).optional()),
  municipio: z.string().max(100).optional(),
  estado: emptyToUndefined(z.string().length(2).optional()),
});

export const updateBeneficiarySchema = createBeneficiarySchema.partial();

export const listBeneficiariesSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  search: z.string().optional(),
  planCode: z.string().optional(),
  isActive: z.enum(['true', 'false']).optional(),
});

export type CreateBeneficiaryInput = z.infer<typeof createBeneficiarySchema>;
export type UpdateBeneficiaryInput = z.infer<typeof updateBeneficiarySchema>;
export type ListBeneficiariesQuery = z.infer<typeof listBeneficiariesSchema>;
