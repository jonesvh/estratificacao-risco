import { z } from 'zod';

export const createResponseSchema = z.object({
  beneficiaryId: z.string().uuid('ID do beneficiário inválido'),
  questionnaireId: z.string().uuid('ID do questionário inválido'),
  notes: z.string().max(2000).optional(),
  medicacoes: z.string().max(2000).optional(),
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid('ID da pergunta inválido'),
        optionIds: z.array(z.string().uuid()).optional(),
        textValue: z.string().max(2000).optional(),
      }),
    )
    .min(1, 'Pelo menos uma resposta é obrigatória'),
});

export const listResponsesSchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
  beneficiaryId: z.string().uuid().optional(),
  beneficiarySearch: z.string().max(200).optional(),
  questionnaireId: z.string().uuid().optional(),
  riskLevel: z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']).optional(),
  dateFrom: z.string().date().optional(),
  dateTo: z.string().date().optional(),
  municipio: z.string().max(100).optional(),
  planCode: z.string().optional(),
});

export const updateResponseSchema = z.object({
  notes: z.string().max(2000).optional(),
  medicacoes: z.string().max(2000).optional(),
  answers: z
    .array(
      z.object({
        questionId: z.string().uuid('ID da pergunta inválido'),
        optionIds: z.array(z.string().uuid()).optional(),
        textValue: z.string().max(2000).optional(),
      }),
    )
    .min(1, 'Pelo menos uma resposta é obrigatória'),
});

export type CreateResponseInput = z.infer<typeof createResponseSchema>;
export type UpdateResponseInput = z.infer<typeof updateResponseSchema>;
export type ListResponsesQuery = z.infer<typeof listResponsesSchema>;
