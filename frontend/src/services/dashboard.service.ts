import { api } from './api';
import type { DashboardSummary, QuestionnaireResponse } from '../types';

export async function getDashboardSummary(): Promise<DashboardSummary> {
  const { data } = await api.get('/dashboard/summary');
  return data;
}

export async function getRecentResponses(): Promise<QuestionnaireResponse[]> {
  const { data } = await api.get('/dashboard/recent');
  return data;
}
