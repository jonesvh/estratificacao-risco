import { readDb, writeDb, generateId, now, Gender, Beneficiary } from '../../config/jsonDb';
import { AppError } from '../../shared/errors/AppError';
import { parsePagination, toPaginatedResult } from '../../shared/utils/pagination';
import {
  CreateBeneficiaryInput,
  ListBeneficiariesQuery,
  UpdateBeneficiaryInput,
} from './beneficiaries.schema';

export async function listBeneficiaries(query: ListBeneficiariesQuery) {
  const { page, limit } = parsePagination(query);
  const db = readDb();

  let filtered = db.beneficiaries;

  if (query.search) {
    const s = query.search.toLowerCase();
    filtered = filtered.filter(
      (b) => b.name.toLowerCase().includes(s) || b.cpf.includes(query.search!),
    );
  }
  if (query.planCode) filtered = filtered.filter((b) => b.planCode === query.planCode);
  if (query.isActive !== undefined) {
    const active = query.isActive === 'true';
    filtered = filtered.filter((b) => b.isActive === active);
  }

  filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const total = filtered.length;
  const start = (page - 1) * limit;
  const data = filtered.slice(start, start + limit);

  return toPaginatedResult(data, total, { page, limit });
}

export async function getBeneficiary(id: string) {
  const db = readDb();
  const beneficiary = db.beneficiaries.find((b) => b.id === id);
  if (!beneficiary) throw new AppError('Beneficiário não encontrado', 404);
  return beneficiary;
}

export async function getBeneficiaryHistory(id: string) {
  await getBeneficiary(id);
  const db = readDb();

  const responses = db.responses
    .filter((r) => r.beneficiaryId === id)
    .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());

  return responses.map((r) => {
    const questionnaire = db.questionnaires.find((q) => q.id === r.questionnaireId);
    const dimensionScores = db.dimensionScores
      .filter((ds) => ds.responseId === r.id)
      .map((ds) => {
        const dimension = db.dimensions.find((d) => d.id === ds.dimensionId);
        return { ...ds, dimension: dimension ? { name: dimension.name } : null };
      });

    return {
      ...r,
      questionnaire: questionnaire ? { id: questionnaire.id, title: questionnaire.title } : null,
      dimensionScores,
    };
  });
}

export async function createBeneficiary(data: CreateBeneficiaryInput) {
  const db = readDb();
  const existing = db.beneficiaries.find((b) => b.cpf === data.cpf);
  if (existing) throw new AppError('CPF já cadastrado', 409);

  const ts = now();
  const beneficiary = {
    id: generateId(),
    name: data.name,
    cpf: data.cpf,
    birthDate: data.birthDate,
    gender: (data.gender ?? null) as Gender | null,
    phone: data.phone ?? null,
    email: data.email ?? null,
    planCode: data.planCode ?? null,
    municipio: data.municipio ?? null,
    estado: data.estado ?? null,
    isActive: true,
    createdAt: ts,
    updatedAt: ts,
  };

  db.beneficiaries.push(beneficiary);
  writeDb(db);
  return beneficiary;
}

export async function updateBeneficiary(id: string, data: UpdateBeneficiaryInput) {
  const db = readDb();
  const idx = db.beneficiaries.findIndex((b) => b.id === id);
  if (idx === -1) throw new AppError('Beneficiário não encontrado', 404);

  if (data.cpf) {
    const conflict = db.beneficiaries.find((b) => b.cpf === data.cpf && b.id !== id);
    if (conflict) throw new AppError('CPF já utilizado por outro beneficiário', 409);
  }

  const updated: Beneficiary = {
    ...db.beneficiaries[idx],
    name: data.name ?? db.beneficiaries[idx].name,
    cpf: data.cpf ?? db.beneficiaries[idx].cpf,
    birthDate: data.birthDate ?? db.beneficiaries[idx].birthDate,
    gender: data.gender !== undefined ? data.gender : db.beneficiaries[idx].gender,
    phone: data.phone !== undefined ? data.phone : db.beneficiaries[idx].phone,
    email: data.email !== undefined ? (data.email ?? null) : db.beneficiaries[idx].email,
    planCode: data.planCode !== undefined ? data.planCode : db.beneficiaries[idx].planCode,
    municipio: data.municipio !== undefined ? data.municipio : db.beneficiaries[idx].municipio,
    estado: data.estado !== undefined ? data.estado : db.beneficiaries[idx].estado,
    updatedAt: now(),
  };
  db.beneficiaries[idx] = updated;
  writeDb(db);
  return updated;
}

export async function deactivateBeneficiary(id: string) {
  const db = readDb();
  const idx = db.beneficiaries.findIndex((b) => b.id === id);
  if (idx === -1) throw new AppError('Beneficiário não encontrado', 404);

  db.beneficiaries[idx] = { ...db.beneficiaries[idx], isActive: false, updatedAt: now() };
  writeDb(db);
  return db.beneficiaries[idx];
}
