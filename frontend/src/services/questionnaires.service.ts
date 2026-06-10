import { api } from './api';
import type { Questionnaire } from '../types';

export async function listQuestionnaires(activeOnly = true): Promise<Questionnaire[]> {
  const { data } = await api.get('/questionnaires', {
    params: { isActive: activeOnly ? 'true' : undefined },
  });
  return data;
}

export async function getQuestionnaire(id: string): Promise<Questionnaire> {
  const { data } = await api.get(`/questionnaires/${id}`);
  return data;
}

export interface CreateOptionInput {
  label: string;
  value: string;
  score: number;
  orderIndex: number;
}

export interface CreateQuestionInput {
  text: string;
  type: string;
  orderIndex: number;
  isRequired: boolean;
  weight: number;
  helpText?: string;
  metadata?: Record<string, unknown>;
  options?: CreateOptionInput[];
}

export interface CreateDimensionInput {
  name: string;
  description?: string;
  orderIndex: number;
  weight: number;
  questions: CreateQuestionInput[];
}

export interface CreateQuestionnaireInput {
  title: string;
  description?: string;
  riskConfig: {
    thresholds: Array<{ min: number; max: number; level: string; label: string }>;
  };
  dimensions: CreateDimensionInput[];
}

export async function createQuestionnaire(input: CreateQuestionnaireInput): Promise<Questionnaire> {
  const { data } = await api.post('/questionnaires', input);
  return data;
}

export async function updateQuestionnaire(
  id: string,
  input: { title?: string; description?: string; isActive?: boolean },
): Promise<Questionnaire> {
  const { data } = await api.patch(`/questionnaires/${id}`, input);
  return data;
}

export async function updateQuestionnaireContent(id: string, input: CreateQuestionnaireInput): Promise<Questionnaire> {
  const { data } = await api.put(`/questionnaires/${id}`, input);
  return data;
}

export async function deactivateQuestionnaire(id: string): Promise<Questionnaire> {
  const { data } = await api.patch(`/questionnaires/${id}/deactivate`);
  return data;
}
