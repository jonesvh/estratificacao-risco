import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { parsePagination, toPaginatedResult } from '../../shared/utils/pagination';
import {
  CreateBeneficiaryInput,
  ListBeneficiariesQuery,
  UpdateBeneficiaryInput,
} from './beneficiaries.schema';

export async function listBeneficiaries(query: ListBeneficiariesQuery) {
  const { page, limit } = parsePagination(query);

  const where: Prisma.BeneficiaryWhereInput = {};

  if (query.search) {
    where.OR = [
      { name: { contains: query.search, mode: 'insensitive' } },
      { cpf: { contains: query.search } },
    ];
  }
  if (query.planCode) where.planCode = query.planCode;
  if (query.isActive !== undefined) where.isActive = query.isActive === 'true';

  const [data, total] = await Promise.all([
    prisma.beneficiary.findMany({
      where,
      orderBy: { name: 'asc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.beneficiary.count({ where }),
  ]);

  return toPaginatedResult(data, total, { page, limit });
}

export async function getBeneficiary(id: string) {
  const beneficiary = await prisma.beneficiary.findUnique({ where: { id } });
  if (!beneficiary) throw new AppError('Beneficiário não encontrado', 404);
  return beneficiary;
}

export async function getBeneficiaryHistory(id: string) {
  await getBeneficiary(id);

  return prisma.questionnaireResponse.findMany({
    where: { beneficiaryId: id },
    include: {
      questionnaire: { select: { id: true, title: true } },
      dimensionScores: { include: { dimension: { select: { name: true } } } },
    },
    orderBy: { appliedAt: 'desc' },
  });
}

export async function createBeneficiary(data: CreateBeneficiaryInput) {
  const existing = await prisma.beneficiary.findUnique({ where: { cpf: data.cpf } });
  if (existing) throw new AppError('CPF já cadastrado', 409);

  return prisma.beneficiary.create({
    data: {
      ...data,
      birthDate: new Date(data.birthDate),
    },
  });
}

export async function updateBeneficiary(id: string, data: UpdateBeneficiaryInput) {
  await getBeneficiary(id);

  if (data.cpf) {
    const existing = await prisma.beneficiary.findFirst({
      where: { cpf: data.cpf, NOT: { id } },
    });
    if (existing) throw new AppError('CPF já utilizado por outro beneficiário', 409);
  }

  return prisma.beneficiary.update({
    where: { id },
    data: {
      ...data,
      birthDate: data.birthDate ? new Date(data.birthDate) : undefined,
    },
  });
}

export async function deactivateBeneficiary(id: string) {
  await getBeneficiary(id);
  return prisma.beneficiary.update({ where: { id }, data: { isActive: false } });
}
