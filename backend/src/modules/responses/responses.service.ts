import { readDb, writeDb, generateId, now } from '../../config/jsonDb';
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
  const db = readDb();

  let responses = db.responses;

  if (query.beneficiaryId) {
    responses = responses.filter((r) => r.beneficiaryId === query.beneficiaryId);
  }

  if (query.questionnaireId) {
    responses = responses.filter((r) => r.questionnaireId === query.questionnaireId);
  }

  if (query.riskLevel) {
    responses = responses.filter((r) => r.riskLevel === query.riskLevel);
  }

  if (query.dateFrom || query.dateTo) {
    const from = query.dateFrom ? new Date(query.dateFrom).getTime() : -Infinity;
    const to = query.dateTo ? new Date(`${query.dateTo}T23:59:59Z`).getTime() : Infinity;
    responses = responses.filter((r) => {
      const t = new Date(r.appliedAt).getTime();
      return t >= from && t <= to;
    });
  }

  if (query.beneficiarySearch || query.municipio || query.planCode) {
    const s = query.beneficiarySearch?.toLowerCase();
    responses = responses.filter((r) => {
      const b = db.beneficiaries.find((b) => b.id === r.beneficiaryId);
      if (!b) return false;
      if (s && !b.name.toLowerCase().includes(s) && !b.cpf.includes(query.beneficiarySearch!)) {
        return false;
      }
      if (query.municipio && !b.municipio?.toLowerCase().includes(query.municipio.toLowerCase())) {
        return false;
      }
      if (query.planCode && b.planCode !== query.planCode) return false;
      return true;
    });
  }

  responses = [...responses].sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
  );

  const total = responses.length;
  const start = (page - 1) * limit;
  const page_data = responses.slice(start, start + limit);

  const data = page_data.map((r) => {
    const beneficiary = db.beneficiaries.find((b) => b.id === r.beneficiaryId);
    const questionnaire = db.questionnaires.find((q) => q.id === r.questionnaireId);
    const dimensionScores = db.dimensionScores
      .filter((ds) => ds.responseId === r.id)
      .map((ds) => {
        const dimension = db.dimensions.find((d) => d.id === ds.dimensionId);
        return { ...ds, dimension: dimension ? { name: dimension.name } : null };
      });

    return {
      ...r,
      beneficiary: beneficiary
        ? { id: beneficiary.id, name: beneficiary.name, cpf: beneficiary.cpf, planCode: beneficiary.planCode }
        : null,
      questionnaire: questionnaire ? { id: questionnaire.id, title: questionnaire.title } : null,
      dimensionScores,
    };
  });

  return toPaginatedResult(data, total, { page, limit });
}

export async function getResponse(id: string) {
  const db = readDb();
  const response = db.responses.find((r) => r.id === id);
  if (!response) throw new AppError('Aplicação não encontrada', 404);

  const beneficiary = db.beneficiaries.find((b) => b.id === response.beneficiaryId) ?? null;
  const questionnaire = db.questionnaires.find((q) => q.id === response.questionnaireId);

  const dimensions = questionnaire
    ? db.dimensions
        .filter((d) => d.questionnaireId === questionnaire.id)
        .sort((a, b) => a.orderIndex - b.orderIndex)
    : [];

  const answers = db.answers
    .filter((a) => a.responseId === id)
    .map((a) => {
      const question = db.questions.find((q) => q.id === a.questionId);
      const selectedOptions = db.answerSelectedOptions
        .filter((aso) => aso.answerId === a.id)
        .map((aso) => {
          const option = db.questionOptions.find((o) => o.id === aso.optionId);
          return option ? { option: { id: option.id, label: option.label, value: option.value } } : null;
        })
        .filter(Boolean);

      return {
        ...a,
        question: question
          ? { id: question.id, text: question.text, type: question.type, orderIndex: question.orderIndex }
          : null,
        selectedOptions,
      };
    })
    .sort((a, b) => (a.question?.orderIndex ?? 0) - (b.question?.orderIndex ?? 0));

  const dimensionScores = db.dimensionScores
    .filter((ds) => ds.responseId === id)
    .map((ds) => {
      const dimension = db.dimensions.find((d) => d.id === ds.dimensionId);
      return { ...ds, dimension: dimension ? { id: dimension.id, name: dimension.name } : null };
    })
    .sort((a, b) => {
      const da = db.dimensions.find((d) => d.id === a.dimensionId);
      const db_ = db.dimensions.find((d) => d.id === b.dimensionId);
      return (da?.orderIndex ?? 0) - (db_?.orderIndex ?? 0);
    });

  return {
    ...response,
    beneficiary,
    questionnaire: questionnaire ? { ...questionnaire, dimensions } : null,
    answers,
    dimensionScores,
  };
}

export async function createResponse(data: CreateResponseInput) {
  const db = readDb();

  const beneficiary = db.beneficiaries.find((b) => b.id === data.beneficiaryId);
  if (!beneficiary?.isActive) throw new AppError('Beneficiário não encontrado ou inativo', 404);

  const questionnaire = db.questionnaires.find((q) => q.id === data.questionnaireId);
  if (!questionnaire?.isActive) throw new AppError('Questionário não encontrado ou inativo', 404);

  const questions = db.questions.filter((q) => q.questionnaireId === questionnaire.id);
  const questionsWithOptions = questions.map((q) => ({
    ...q,
    options: db.questionOptions.filter((o) => o.questionId === q.id),
  }));

  const questionMap = new Map(questionsWithOptions.map((q) => [q.id, q]));
  const answerMap = new Map(data.answers.map((a) => [a.questionId, a]));

  const missingRequired = questionsWithOptions.filter(
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
  const dimensions = db.dimensions.filter((d) => d.questionnaireId === questionnaire.id);
  const totalScore = computeTotalScore(questionsWithOptions, answerScores);
  const riskLevel = classifyRisk(totalScore, riskConfig);
  const dimensionScoreResults = computeDimensionScores(dimensions, questionsWithOptions, answerScores);

  const ts = now();
  const response = {
    id: generateId(),
    beneficiaryId: data.beneficiaryId,
    questionnaireId: data.questionnaireId,
    appliedAt: ts,
    totalScore,
    riskLevel,
    notes: data.notes ?? null,
    medicacoes: data.medicacoes ?? null,
    metadata: null,
  };
  db.responses.push(response);

  for (const ds of dimensionScoreResults) {
    db.dimensionScores.push({
      id: generateId(),
      responseId: response.id,
      dimensionId: ds.dimensionId,
      score: ds.score,
      maxScore: ds.maxScore,
      percentage: ds.percentage,
      createdAt: ts,
    });
  }

  for (const answerData of data.answers) {
    const scoreSnapshot = answerScores.get(answerData.questionId) ?? 0;
    const answer = {
      id: generateId(),
      responseId: response.id,
      questionId: answerData.questionId,
      textValue: answerData.textValue ?? null,
      scoreSnapshot,
      createdAt: ts,
    };
    db.answers.push(answer);

    for (const optionId of answerData.optionIds ?? []) {
      db.answerSelectedOptions.push({ answerId: answer.id, optionId });
    }
  }

  writeDb(db);
  return response;
}

export async function updateResponse(id: string, data: UpdateResponseInput) {
  const db = readDb();
  const existing = db.responses.find((r) => r.id === id);
  if (!existing) throw new AppError('Aplicação não encontrada', 404);

  const questionnaire = db.questionnaires.find((q) => q.id === existing.questionnaireId);
  if (!questionnaire) throw new AppError('Questionário não encontrado', 404);

  const questions = db.questions.filter((q) => q.questionnaireId === questionnaire.id);
  const questionsWithOptions = questions.map((q) => ({
    ...q,
    options: db.questionOptions.filter((o) => o.questionId === q.id),
  }));

  const questionMap = new Map(questionsWithOptions.map((q) => [q.id, q]));
  const answerMap = new Map(data.answers.map((a) => [a.questionId, a]));

  const missingRequired = questionsWithOptions.filter(
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
  const dimensions = db.dimensions.filter((d) => d.questionnaireId === questionnaire.id);
  const totalScore = computeTotalScore(questionsWithOptions, answerScores);
  const riskLevel = classifyRisk(totalScore, riskConfig);
  const dimensionScoreResults = computeDimensionScores(dimensions, questionsWithOptions, answerScores);

  // Delete old answers and dimension scores
  const oldAnswerIds = db.answers.filter((a) => a.responseId === id).map((a) => a.id);
  db.answerSelectedOptions = db.answerSelectedOptions.filter(
    (aso) => !oldAnswerIds.includes(aso.answerId),
  );
  db.answers = db.answers.filter((a) => a.responseId !== id);
  db.dimensionScores = db.dimensionScores.filter((ds) => ds.responseId !== id);

  // Update response record
  const rIdx = db.responses.findIndex((r) => r.id === id);
  db.responses[rIdx] = {
    ...db.responses[rIdx],
    totalScore,
    riskLevel,
    notes: data.notes ?? null,
    medicacoes: data.medicacoes ?? null,
  };

  // Insert new dimension scores
  const ts = now();
  for (const ds of dimensionScoreResults) {
    db.dimensionScores.push({
      id: generateId(),
      responseId: id,
      dimensionId: ds.dimensionId,
      score: ds.score,
      maxScore: ds.maxScore,
      percentage: ds.percentage,
      createdAt: ts,
    });
  }

  // Insert new answers
  for (const answerData of data.answers) {
    const scoreSnapshot = answerScores.get(answerData.questionId) ?? 0;
    const answer = {
      id: generateId(),
      responseId: id,
      questionId: answerData.questionId,
      textValue: answerData.textValue ?? null,
      scoreSnapshot,
      createdAt: ts,
    };
    db.answers.push(answer);

    for (const optionId of answerData.optionIds ?? []) {
      db.answerSelectedOptions.push({ answerId: answer.id, optionId });
    }
  }

  writeDb(db);
  return db.responses[rIdx];
}
