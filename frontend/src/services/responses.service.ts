import { api } from './api';
import type { PaginatedResult, QuestionnaireResponse, RiskLevel } from '../types';

export interface ResponseFilters {
  page?: number;
  limit?: number;
  beneficiaryId?: string;
  beneficiarySearch?: string;
  questionnaireId?: string;
  riskLevel?: RiskLevel;
  dateFrom?: string;
  dateTo?: string;
  municipio?: string;
  planCode?: string;
}

export async function listResponses(
  filters: ResponseFilters,
): Promise<PaginatedResult<QuestionnaireResponse>> {
  const { data } = await api.get('/responses', { params: filters });
  return data;
}

export async function getResponse(id: string): Promise<QuestionnaireResponse> {
  const { data } = await api.get(`/responses/${id}`);
  return data;
}

export interface AnswerInput {
  questionId: string;
  optionIds?: string[];
  textValue?: string;
}

export interface CreateResponseInput {
  beneficiaryId: string;
  questionnaireId: string;
  notes?: string;
  medicacoes?: string;
  answers: AnswerInput[];
}

export async function createResponse(input: CreateResponseInput): Promise<QuestionnaireResponse> {
  const { data } = await api.post('/responses', input);
  return data;
}

export interface UpdateResponseInput {
  notes?: string;
  medicacoes?: string;
  answers: AnswerInput[];
}

export async function updateResponse(id: string, input: UpdateResponseInput): Promise<QuestionnaireResponse> {
  const { data } = await api.patch(`/responses/${id}`, input);
  return data;
}
