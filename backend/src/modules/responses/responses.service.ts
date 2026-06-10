import { Prisma } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { parsePagination, toPaginatedResult } from '../../shared/utils/pagination';
import {
  computeAnswerScore,
  computeTotalScore,
  computeDimensionScores,
  classifyRisk,
  RiskConfig,
} from '../../shared/utils/risk';
import { CreateResponseInput, UpdateResponseInput, ListResponsesQuery } from './responses.schema';

export async function listResponses(query: ListResponsesQuery) {
  const { page, limit } = parsePagination(query);

  const where: Prisma.QuestionnaireResponseWhereInput = {};
  if (query.beneficiaryId) where.beneficiaryId = query.beneficiaryId;

  const beneficiaryFilter: Prisma.BeneficiaryWhereInput = {};
  if (query.beneficiarySearch) {
    beneficiaryFilter.OR = [
      { name: { contains: query.beneficiarySearch, mode: 'insensitive' } },
      { cpf: { contains: query.beneficiarySearch } },
    ];
  }
  if (query.municipio) {
    beneficiaryFilter.municipio = { contains: query.municipio, mode: 'insensitive' };
  }
  if (query.planCode) {
    beneficiaryFilter.planCode = query.planCode;
  }
  if (Object.keys(beneficiaryFilter).length > 0) {
    where.beneficiary = beneficiaryFilter;
  }

  if (query.questionnaireId) where.questionnaireId = query.questionnaireId;
  if (query.riskLevel) where.riskLevel = query.riskLevel;
  if (query.dateFrom || query.dateTo) {
    where.appliedAt = {
      ...(query.dateFrom ? { gte: new Date(query.dateFrom) } : {}),
      ...(query.dateTo ? { lte: new Date(`${query.dateTo}T23:59:59Z`) } : {}),
    };
  }

  const [data, total] = await Promise.all([
    prisma.questionnaireResponse.findMany({
      where,
      include: {
        beneficiary: { select: { id: true, name: true, cpf: true, planCode: true } },
        questionnaire: { select: { id: true, title: true } },
        appliedBy: { select: { email: true } },
        dimensionScores: { include: { dimension: { select: { name: true } } } },
      },
      orderBy: { appliedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.questionnaireResponse.count({ where }),
  ]);

  return toPaginatedResult(data, total, { page, limit });
}

export async function getResponse(id: string) {
  const response = await prisma.questionnaireResponse.findUnique({
    where: { id },
    include: {
      beneficiary: true,
      questionnaire: { include: { dimensions: { orderBy: { orderIndex: 'asc' } } } },
      appliedBy: { select: { email: true } },
      answers: {
        include: {
          question: { select: { id: true, text: true, type: true, orderIndex: true } },
          selectedOptions: { include: { option: { select: { id: true, label: true, value: true } } } },
        },
        orderBy: { question: { orderIndex: 'asc' } },
      },
      dimensionScores: {
        include: { dimension: { select: { id: true, name: true } } },
        orderBy: { dimension: { orderIndex: 'asc' } },
      },
    },
  });

  if (!response) throw new AppError('Aplicação não encontrada', 404);
  return response;
}

export async function updateResponse(id: string, data: UpdateResponseInput) {
  const existing = await prisma.questionnaireResponse.findUnique({
    where: { id },
    include: {
      questionnaire: {
        include: {
          dimensions: true,
          questions: { include: { options: true } },
        },
      },
    },
  });

  if (!existing) throw new AppError('Aplicação não encontrada', 404);

  const questionnaire = existing.questionnaire;
  const questionMap = new Map(questionnaire.questions.map((q) => [q.id, q]));
  const answerMap = new Map(data.answers.map((a) => [a.questionId, a]));

  const missingRequired = questionnaire.questions.filter(
    (q) => q.isRequired && !answerMap.has(q.id),
  );
  if (missingRequired.length > 0) {
    throw new AppError(
      `Perguntas obrigatórias sem resposta: ${missingRequired.map((q) => q.id).join(', ')}`,
      400,
    );
  }

  for (const answer of data.answers) {
    if (!questionMap.has(answer.questionId)) {
      throw new AppError(`Pergunta inválida: ${answer.questionId}`, 400);
    }
  }

  const answerScores = new Map<string, number>();
  for (const answer of data.answers) {
    const question = questionMap.get(answer.questionId)!;
    answerScores.set(answer.questionId, computeAnswerScore(question, answer));
  }

  const riskConfig = questionnaire.riskConfig as unknown as RiskConfig;
  const totalScore = computeTotalScore(questionnaire.questions, answerScores);
  const riskLevel = classifyRisk(totalScore, riskConfig);
  const dimensionScores = computeDimensionScores(
    questionnaire.dimensions,
    questionnaire.questions,
    answerScores,
  );

  return prisma.$transaction(async (tx) => {
    await tx.answer.deleteMany({ where: { responseId: id } });
    await tx.dimensionScore.deleteMany({ where: { responseId: id } });

    const response = await tx.questionnaireResponse.update({
      where: { id },
      data: {
        totalScore,
        riskLevel,
        notes: data.notes,
        medicacoes: data.medicacoes,
        dimensionScores: {
          create: dimensionScores.map((ds) => ({
            dimensionId: ds.dimensionId,
            score: ds.score,
            maxScore: ds.maxScore,
            percentage: ds.percentage,
          })),
        },
      },
    });

    for (const answerData of data.answers) {
      const scoreSnapshot = answerScores.get(answerData.questionId) ?? 0;

      const answer = await tx.answer.create({
        data: {
          responseId: id,
          questionId: answerData.questionId,
          textValue: answerData.textValue ?? null,
          scoreSnapshot,
        },
      });

      if (answerData.optionIds?.length) {
        await tx.answerSelectedOption.createMany({
          data: answerData.optionIds.map((optionId) => ({
            answerId: answer.id,
            optionId,
          })),
        });
      }
    }

    return response;
  });
}

export async function createResponse(data: CreateResponseInput, appliedById: string) {
  const [beneficiary, questionnaire] = await Promise.all([
    prisma.beneficiary.findUnique({ where: { id: data.beneficiaryId } }),
    prisma.questionnaire.findUnique({
      where: { id: data.questionnaireId },
      include: {
        dimensions: true,
        questions: { include: { options: true } },
      },
    }),
  ]);

  if (!beneficiary?.isActive) throw new AppError('Beneficiário não encontrado ou inativo', 404);
  if (!questionnaire?.isActive) throw new AppError('Questionário não encontrado ou inativo', 404);

  const questionMap = new Map(questionnaire.questions.map((q) => [q.id, q]));
  const answerMap = new Map(data.answers.map((a) => [a.questionId, a]));

  // Validate required questions
  const missingRequired = questionnaire.questions.filter(
    (q) => q.isRequired && !answerMap.has(q.id),
  );
  if (missingRequired.length > 0) {
    throw new AppError(
      `Perguntas obrigatórias sem resposta: ${missingRequired.map((q) => q.id).join(', ')}`,
      400,
    );
  }

  // Validate that submitted questionIds exist in this questionnaire
  for (const answer of data.answers) {
    if (!questionMap.has(answer.questionId)) {
      throw new AppError(`Pergunta inválida: ${answer.questionId}`, 400);
    }
  }

  // Calculate scores
  const answerScores = new Map<string, number>();
  for (const answer of data.answers) {
    const question = questionMap.get(answer.questionId)!;
    answerScores.set(answer.questionId, computeAnswerScore(question, answer));
  }

  const riskConfig = questionnaire.riskConfig as unknown as RiskConfig;
  const totalScore = computeTotalScore(questionnaire.questions, answerScores);
  const riskLevel = classifyRisk(totalScore, riskConfig);
  const dimensionScores = computeDimensionScores(
    questionnaire.dimensions,
    questionnaire.questions,
    answerScores,
  );

  return prisma.$transaction(async (tx) => {
    const response = await tx.questionnaireResponse.create({
      data: {
        beneficiaryId: data.beneficiaryId,
        questionnaireId: data.questionnaireId,
        appliedById,
        totalScore,
        riskLevel,
        notes: data.notes,
        medicacoes: data.medicacoes,
        dimensionScores: {
          create: dimensionScores.map((ds) => ({
            dimensionId: ds.dimensionId,
            score: ds.score,
            maxScore: ds.maxScore,
            percentage: ds.percentage,
          })),
        },
      },
    });

    for (const answerData of data.answers) {
      const scoreSnapshot = answerScores.get(answerData.questionId) ?? 0;

      const answer = await tx.answer.create({
        data: {
          responseId: response.id,
          questionId: answerData.questionId,
          textValue: answerData.textValue ?? null,
          scoreSnapshot,
        },
      });

      if (answerData.optionIds?.length) {
        await tx.answerSelectedOption.createMany({
          data: answerData.optionIds.map((optionId) => ({
            answerId: answer.id,
            optionId,
          })),
        });
      }
    }

    return response;
  });
}
