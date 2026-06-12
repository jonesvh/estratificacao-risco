import { readDb, writeDb, generateId, now, Question, QuestionOption, Dimension, Questionnaire } from '../../config/jsonDb';
import { AppError } from '../../shared/errors/AppError';
import { computeTotalMaxScore } from '../../shared/utils/risk';
import {
  CreateQuestionnaireInput,
  UpdateQuestionnaireMetaInput,
  UpdateQuestionnaireContentInput,
} from './questionnaires.schema';

function buildUpdatedRiskConfig(data: CreateQuestionnaireInput) {
  const inputQuestions = data.dimensions.flatMap((dim) =>
    dim.questions.map((q) => ({
      id: '',
      type: q.type as Question['type'],
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

export async function listQuestionnaires(activeOnly: boolean) {
  const db = readDb();
  let questionnaires = db.questionnaires;
  if (activeOnly) questionnaires = questionnaires.filter((q) => q.isActive);

  return [...questionnaires]
    .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'))
    .map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      version: q.version,
      isActive: q.isActive,
      createdAt: q.createdAt,
      _count: {
        questions: db.questions.filter((qu) => qu.questionnaireId === q.id).length,
        responses: db.responses.filter((r) => r.questionnaireId === q.id).length,
      },
    }));
}

export async function getQuestionnaire(id: string) {
  const db = readDb();
  const q = db.questionnaires.find((qu) => qu.id === id);
  if (!q) throw new AppError('Questionário não encontrado', 404);

  const dimensions = db.dimensions
    .filter((d) => d.questionnaireId === id)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((d) => ({
      ...d,
      questions: db.questions
        .filter((qu) => qu.questionnaireId === id && qu.dimensionId === d.id)
        .sort((a, b) => a.orderIndex - b.orderIndex)
        .map((qu) => ({
          ...qu,
          options: db.questionOptions
            .filter((o) => o.questionId === qu.id)
            .sort((a, b) => a.orderIndex - b.orderIndex),
        })),
    }));

  const responseCount = db.responses.filter((r) => r.questionnaireId === id).length;

  return { ...q, dimensions, _count: { responses: responseCount } };
}

export async function createQuestionnaire(data: CreateQuestionnaireInput) {
  const riskConfig = buildUpdatedRiskConfig(data);
  const db = readDb();
  const ts = now();

  const questionnaire = {
    id: generateId(),
    title: data.title,
    description: data.description ?? null,
    version: 1,
    isActive: true,
    riskConfig,
    createdAt: ts,
    updatedAt: ts,
  };
  db.questionnaires.push(questionnaire);

  for (const dimData of data.dimensions) {
    const dimension: Dimension = {
      id: generateId(),
      questionnaireId: questionnaire.id,
      name: dimData.name,
      description: dimData.description ?? null,
      orderIndex: dimData.orderIndex,
      weight: dimData.weight,
      createdAt: ts,
    };
    db.dimensions.push(dimension);

    for (const qData of dimData.questions) {
      const question: Question = {
        id: generateId(),
        questionnaireId: questionnaire.id,
        dimensionId: dimension.id,
        text: qData.text,
        type: qData.type as Question['type'],
        orderIndex: qData.orderIndex,
        isRequired: qData.isRequired,
        weight: qData.weight,
        helpText: qData.helpText ?? null,
        metadata: qData.metadata ?? null,
        createdAt: ts,
      };
      db.questions.push(question);

      for (const opt of qData.options ?? []) {
        const option: QuestionOption = {
          id: generateId(),
          questionId: question.id,
          label: opt.label,
          value: opt.value,
          score: opt.score,
          orderIndex: opt.orderIndex,
          createdAt: ts,
        };
        db.questionOptions.push(option);
      }
    }
  }

  writeDb(db);
  return getQuestionnaire(questionnaire.id);
}

export async function updateQuestionnaireContent(id: string, data: UpdateQuestionnaireContentInput) {
  await getQuestionnaire(id);
  const riskConfig = buildUpdatedRiskConfig(data);
  const db = readDb();
  const ts = now();

  const qIdx = db.questionnaires.findIndex((q) => q.id === id);
  db.questionnaires[qIdx] = {
    ...db.questionnaires[qIdx],
    title: data.title,
    description: data.description ?? null,
    riskConfig,
    updatedAt: ts,
  };

  const existingDims = db.dimensions.filter((d) => d.questionnaireId === id);
  const existingDimMap = new Map(existingDims.map((d) => [d.id, d]));
  const existingQuestions = db.questions.filter((q) => q.questionnaireId === id);
  const existingQMap = new Map(existingQuestions.map((q) => [q.id, q]));

  const keptDimIds = new Set<string>();
  const keptQIds = new Set<string>();

  for (const dimData of data.dimensions) {
    let dimId: string;

    if (dimData.id && existingDimMap.has(dimData.id)) {
      dimId = dimData.id;
      const idx = db.dimensions.findIndex((d) => d.id === dimId);
      db.dimensions[idx] = {
        ...db.dimensions[idx],
        name: dimData.name,
        description: dimData.description ?? null,
        orderIndex: dimData.orderIndex,
        weight: dimData.weight,
      };
    } else {
      const newDim: Dimension = {
        id: generateId(),
        questionnaireId: id,
        name: dimData.name,
        description: dimData.description ?? null,
        orderIndex: dimData.orderIndex,
        weight: dimData.weight,
        createdAt: ts,
      };
      db.dimensions.push(newDim);
      dimId = newDim.id;
    }
    keptDimIds.add(dimId);

    for (const qData of dimData.questions) {
      let qId: string;

      if (qData.id && existingQMap.has(qData.id)) {
        qId = qData.id;
        const idx = db.questions.findIndex((q) => q.id === qId);
        db.questions[idx] = {
          ...db.questions[idx],
          dimensionId: dimId,
          text: qData.text,
          type: qData.type as Question['type'],
          orderIndex: qData.orderIndex,
          isRequired: qData.isRequired,
          weight: qData.weight,
          helpText: qData.helpText ?? null,
          metadata: qData.metadata ?? null,
        };

        // Reconcile options
        const existingOpts = db.questionOptions.filter((o) => o.questionId === qId);
        const existingOptMap = new Map(existingOpts.map((o) => [o.id, o]));
        const keptOptIds = new Set<string>();

        for (const [oi, opt] of (qData.options ?? []).entries()) {
          if (opt.id && existingOptMap.has(opt.id)) {
            const oIdx = db.questionOptions.findIndex((o) => o.id === opt.id);
            db.questionOptions[oIdx] = {
              ...db.questionOptions[oIdx],
              label: opt.label,
              value: opt.value,
              score: opt.score,
              orderIndex: oi,
            };
            keptOptIds.add(opt.id);
          } else {
            db.questionOptions.push({
              id: generateId(),
              questionId: qId,
              label: opt.label,
              value: opt.value,
              score: opt.score,
              orderIndex: oi,
              createdAt: ts,
            });
          }
        }

        // Delete removed options (and their answer selections)
        for (const optId of existingOptMap.keys()) {
          if (!keptOptIds.has(optId)) {
            db.answerSelectedOptions = db.answerSelectedOptions.filter(
              (aso) => aso.optionId !== optId,
            );
            db.questionOptions = db.questionOptions.filter((o) => o.id !== optId);
          }
        }
      } else {
        const newQ: Question = {
          id: generateId(),
          questionnaireId: id,
          dimensionId: dimId,
          text: qData.text,
          type: qData.type as Question['type'],
          orderIndex: qData.orderIndex,
          isRequired: qData.isRequired,
          weight: qData.weight,
          helpText: qData.helpText ?? null,
          metadata: qData.metadata ?? null,
          createdAt: ts,
        };
        db.questions.push(newQ);
        qId = newQ.id;

        for (const opt of qData.options ?? []) {
          db.questionOptions.push({
            id: generateId(),
            questionId: qId,
            label: opt.label,
            value: opt.value,
            score: opt.score,
            orderIndex: opt.orderIndex,
            createdAt: ts,
          });
        }
      }
      keptQIds.add(qId);
    }
  }

  // Delete removed questions and their answers
  for (const qId of existingQMap.keys()) {
    if (!keptQIds.has(qId)) {
      const answerIds = db.answers
        .filter((a) => a.questionId === qId)
        .map((a) => a.id);
      db.answerSelectedOptions = db.answerSelectedOptions.filter(
        (aso) => !answerIds.includes(aso.answerId),
      );
      db.answers = db.answers.filter((a) => a.questionId !== qId);
      db.questionOptions = db.questionOptions.filter((o) => o.questionId !== qId);
      db.questions = db.questions.filter((q) => q.id !== qId);
    }
  }

  // Delete removed dimensions and their dimension scores
  for (const dimId of existingDimMap.keys()) {
    if (!keptDimIds.has(dimId)) {
      db.dimensionScores = db.dimensionScores.filter((ds) => ds.dimensionId !== dimId);
      db.dimensions = db.dimensions.filter((d) => d.id !== dimId);
    }
  }

  writeDb(db);
  return getQuestionnaire(id);
}

export async function updateQuestionnaireMeta(id: string, data: UpdateQuestionnaireMetaInput) {
  const db = readDb();
  const idx = db.questionnaires.findIndex((q) => q.id === id);
  if (idx === -1) throw new AppError('Questionário não encontrado', 404);

  const q = db.questionnaires[idx];
  db.questionnaires[idx] = {
    ...q,
    title: data.title ?? q.title,
    description: data.description !== undefined ? data.description : q.description,
    isActive: data.isActive !== undefined ? data.isActive : q.isActive,
    updatedAt: now(),
  } as Questionnaire;
  writeDb(db);
  return getQuestionnaire(id);
}

export async function deactivateQuestionnaire(id: string) {
  await getQuestionnaire(id);
  const db = readDb();
  const idx = db.questionnaires.findIndex((q) => q.id === id);
  db.questionnaires[idx] = { ...db.questionnaires[idx], isActive: false, updatedAt: now() };
  writeDb(db);
  return db.questionnaires[idx];
}
