import { api } from './api';
import type { Beneficiary, PaginatedResult, QuestionnaireResponse } from '../types';

export interface BeneficiaryFilters {
  page?: number;
  limit?: number;
  search?: string;
  planCode?: string;
  isActive?: 'true' | 'false';
}

export async function listBeneficiaries(
  filters: BeneficiaryFilters,
): Promise<PaginatedResult<Beneficiary>> {
  const { data } = await api.get('/beneficiaries', { params: filters });
  return data;
}

export async function getBeneficiary(id: string): Promise<Beneficiary> {
  const { data } = await api.get(`/beneficiaries/${id}`);
  return data;
}

export async function getBeneficiaryHistory(id: string): Promise<QuestionnaireResponse[]> {
  const { data } = await api.get(`/beneficiaries/${id}/history`);
  return data;
}

export interface CreateBeneficiaryInput {
  name: string;
  cpf: string;
  birthDate: string;
  gender?: string;
  phone?: string;
  email?: string;
  planCode?: string;
  municipio?: string;
  estado?: string;
}

export async function createBeneficiary(input: CreateBeneficiaryInput): Promise<Beneficiary> {
  const { data } = await api.post('/beneficiaries', input);
  return data;
}

export async function updateBeneficiary(
  id: string,
  input: Partial<CreateBeneficiaryInput>,
): Promise<Beneficiary> {
  const { data } = await api.put(`/beneficiaries/${id}`, input);
  return data;
}

export async function deactivateBeneficiary(id: string): Promise<Beneficiary> {
  const { data } = await api.patch(`/beneficiaries/${id}/deactivate`);
  return data;
}
