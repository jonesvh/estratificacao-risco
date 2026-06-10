import { Prisma, QuestionType } from '@prisma/client';
import { prisma } from '../../config/database';
import { AppError } from '../../shared/errors/AppError';
import { computeTotalMaxScore } from '../../shared/utils/risk';
import { CreateQuestionnaireInput, UpdateQuestionnaireMetaInput, UpdateQuestionnaireContentInput } from './questionnaires.schema';

export async function listQuestionnaires(activeOnly: boolean) {
  return prisma.questionnaire.findMany({
    where: activeOnly ? { isActive: true } : undefined,
    select: {
      id: true,
      title: true,
      description: true,
      version: true,
      isActive: true,
      createdAt: true,
      _count: { select: { questions: true, responses: true } },
    },
    orderBy: { title: 'asc' },
  });
}

export async function getQuestionnaire(id: string) {
  const q = await prisma.questionnaire.findUnique({
    where: { id },
    include: {
      dimensions: {
        orderBy: { orderIndex: 'asc' },
        include: {
          questions: {
            orderBy: { orderIndex: 'asc' },
            include: { options: { orderBy: { orderIndex: 'asc' } } },
          },
        },
      },
      _count: { select: { responses: true } },
    },
  });

  if (!q) throw new AppError('Questionário não encontrado', 404);
  return q;
}

function buildUpdatedRiskConfig(data: CreateQuestionnaireInput) {
  const inputQuestions = data.dimensions.flatMap((dim) =>
    dim.questions.map((q) => ({
      id: '',
      type: q.type as QuestionType,
      weight: q.weight,
      dimensionId: null as string | null,
      metadata: q.metadata ?? null,
      options: (q.options ?? []).map((o) => ({ id: '', score: o.score })),
    })),
  );
  const maxScore = computeTotalMaxScore(inputQuestions);
  return {
    ...data.riskConfig,
    thresholds: data.riskConfig.thresholds.map((t, i, arr) =>
      i === arr.length - 1 ? { ...t, max: maxScore } : t,
    ),
  };
}

export async function createQuestionnaire(data: CreateQuestionnaireInput) {
  const riskConfig = buildUpdatedRiskConfig(data);
  const createdId = await prisma.$transaction(async (tx) => {
    const questionnaire = await tx.questionnaire.create({
      data: {
        title: data.title,
        description: data.description,
        riskConfig,
      },
    });

    for (const dimData of data.dimensions) {
      const dimension = await tx.dimension.create({
        data: {
          questionnaireId: questionnaire.id,
          name: dimData.name,
          description: dimData.description,
          orderIndex: dimData.orderIndex,
          weight: dimData.weight,
        },
      });

      for (const qData of dimData.questions) {
        await tx.question.create({
          data: {
            questionnaireId: questionnaire.id,
            dimensionId: dimension.id,
            text: qData.text,
            type: qData.type,
            orderIndex: qData.orderIndex,
            isRequired: qData.isRequired,
            weight: qData.weight,
            helpText: qData.helpText,
            metadata: (qData.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
            options: qData.options?.length
              ? {
                  create: qData.options.map((o) => ({
                    label: o.label,
                    value: o.value,
                    score: o.score,
                    orderIndex: o.orderIndex,
                  })),
                }
              : undefined,
          },
        });
      }
    }

    return questionnaire.id;
  });
  return getQuestionnaire(createdId);
}

export async function updateQuestionnaireContent(id: string, data: UpdateQuestionnaireContentInput) {
  await getQuestionnaire(id);
  const riskConfig = buildUpdatedRiskConfig(data);

  await prisma.$transaction(async (tx) => {
    await tx.questionnaire.update({
      where: { id },
      data: { title: data.title, description: data.description, riskConfig },
    });

    // Load current state for diffing
    const existingDims = await tx.dimension.findMany({
      where: { questionnaireId: id },
      include: { questions: { include: { options: true } } },
    });
    const existingDimMap = new Map(existingDims.map((d) => [d.id, d]));
    const existingQMap = new Map(existingDims.flatMap((d) => d.questions).map((q) => [q.id, q]));

    const keptDimIds = new Set<string>();
    const keptQIds = new Set<string>();

    for (const dimData of data.dimensions) {
      let dimId: string;
      if (dimData.id && existingDimMap.has(dimData.id)) {
        await tx.dimension.update({
          where: { id: dimData.id },
          data: { name: dimData.name, description: dimData.description, orderIndex: dimData.orderIndex, weight: dimData.weight },
        });
        dimId = dimData.id;
      } else {
        const dim = await tx.dimension.create({
          data: { questionnaireId: id, name: dimData.name, description: dimData.description, orderIndex: dimData.orderIndex, weight: dimData.weight },
        });
        dimId = dim.id;
      }
      keptDimIds.add(dimId);

      for (const qData of dimData.questions) {
        let qId: string;
        if (qData.id && existingQMap.has(qData.id)) {
          await tx.question.update({
            where: { id: qData.id },
            data: {
              dimensionId: dimId,
              text: qData.text,
              type: qData.type as QuestionType,
              orderIndex: qData.orderIndex,
              isRequired: qData.isRequired,
              weight: qData.weight,
              helpText: qData.helpText,
              metadata: (qData.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
            },
          });
          qId = qData.id;
          // Reconcile options in-place (preserves AnswerSelectedOption references)
          const existingOpts = existingQMap.get(qData.id)!.options;
          const existingOptMap = new Map(existingOpts.map((o) => [o.id, o]));
          const keptOptIds = new Set<string>();
          for (const [oi, opt] of (qData.options ?? []).entries()) {
            if (opt.id && existingOptMap.has(opt.id)) {
              await tx.questionOption.update({
                where: { id: opt.id },
                data: { label: opt.label, value: opt.value, score: opt.score, orderIndex: oi },
              });
              keptOptIds.add(opt.id);
            } else {
              await tx.questionOption.create({
                data: { questionId: qId, label: opt.label, value: opt.value, score: opt.score, orderIndex: oi },
              });
            }
          }
          for (const [optId] of existingOptMap) {
            if (!keptOptIds.has(optId)) {
              await tx.answerSelectedOption.deleteMany({ where: { optionId: optId } });
              await tx.questionOption.delete({ where: { id: optId } });
            }
          }
        } else {
          const q = await tx.question.create({
            data: {
              questionnaireId: id,
              dimensionId: dimId,
              text: qData.text,
              type: qData.type as QuestionType,
              orderIndex: qData.orderIndex,
              isRequired: qData.isRequired,
              weight: qData.weight,
              helpText: qData.helpText,
              metadata: (qData.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
              options: qData.options?.length
                ? { create: qData.options.map((o) => ({ label: o.label, value: o.value, score: o.score, orderIndex: o.orderIndex })) }
                : undefined,
            },
          });
          qId = q.id;
        }
        keptQIds.add(qId);
      }
    }

    // Delete removed questions (and their answers)
    for (const [qId] of existingQMap) {
      if (!keptQIds.has(qId)) {
        await tx.answer.deleteMany({ where: { questionId: qId } });
        await tx.question.delete({ where: { id: qId } });
      }
    }

    // Delete removed dimensions (and their dimension scores)
    for (const [dimId] of existingDimMap) {
      if (!keptDimIds.has(dimId)) {
        await tx.dimensionScore.deleteMany({ where: { dimensionId: dimId } });
        await tx.dimension.delete({ where: { id: dimId } });
      }
    }
  });

  return getQuestionnaire(id);
}

export async function updateQuestionnaireMeta(id: string, data: UpdateQuestionnaireMetaInput) {
  await getQuestionnaire(id);
  return prisma.questionnaire.update({ where: { id }, data });
}

export async function deactivateQuestionnaire(id: string) {
  await getQuestionnaire(id);
  return prisma.questionnaire.update({ where: { id }, data: { isActive: false } });
}
