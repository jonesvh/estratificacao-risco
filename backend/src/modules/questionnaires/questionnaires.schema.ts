import { z } from 'zod';

const questionOptionSchema = z.object({
  label: z.string().min(1).max(500),
  value: z.string().min(1).max(100),
  score: z.number().default(0),
  orderIndex: z.number().int().nonnegative(),
});

const questionSchema = z.object({
  text: z.string().min(1),
  type: z.enum(['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'BOOLEAN', 'NUMERIC', 'TEXT']),
  orderIndex: z.number().int().nonnegative(),
  isRequired: z.boolean().default(true),
  weight: z.number().positive().default(1),
  helpText: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  options: z.array(questionOptionSchema).optional(),
});

const dimensionSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  orderIndex: z.number().int().nonnegative(),
  weight: z.number().positive().default(1),
  questions: z.array(questionSchema).min(1, 'Dimensão deve ter ao menos uma pergunta'),
});

const riskThresholdSchema = z.object({
  min: z.number(),
  max: z.number(),
  level: z.enum(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH']),
  label: z.string().min(1),
});

export const createQuestionnaireSchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  riskConfig: z.object({
    thresholds: z.array(riskThresholdSchema).min(1, 'Pelo menos um threshold de risco é obrigatório'),
  }),
  dimensions: z.array(dimensionSchema).min(1, 'Ao menos uma dimensão é obrigatória'),
});

export const updateQuestionnaireMetaSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
});

// Separate update schema adds optional id fields so the backend can diff-update in place
const updateQuestionOptionSchema = questionOptionSchema.extend({
  id: z.string().uuid().optional(),
});

const updateQuestionSchema = questionSchema.extend({
  id: z.string().uuid().optional(),
  options: z.array(updateQuestionOptionSchema).optional(),
});

const updateDimensionSchema = dimensionSchema.extend({
  id: z.string().uuid().optional(),
  questions: z.array(updateQuestionSchema).min(1, 'Dimensão deve ter ao menos uma pergunta'),
});

export const updateQuestionnaireContentSchema = createQuestionnaireSchema.extend({
  dimensions: z.array(updateDimensionSchema).min(1, 'Ao menos uma dimensão é obrigatória'),
});

export type CreateQuestionnaireInput = z.infer<typeof createQuestionnaireSchema>;
export type UpdateQuestionnaireMetaInput = z.infer<typeof updateQuestionnaireMetaSchema>;
export type UpdateQuestionnaireContentInput = z.infer<typeof updateQuestionnaireContentSchema>;
