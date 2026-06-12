import ExcelJS from 'exceljs';
import { Response } from 'express';
import { readDb } from '../../config/jsonDb';
import { RiskLevel } from '../../shared/utils/risk';

export interface ExportFilters {
  beneficiaryId?: string;
  questionnaireId?: string;
  riskLevel?: RiskLevel;
  dateFrom?: string;
  dateTo?: string;
}

const RISK_LABELS: Record<RiskLevel, string> = {
  LOW: 'Baixo',
  MEDIUM: 'Médio',
  HIGH: 'Alto',
  VERY_HIGH: 'Muito Alto',
};

export async function streamResponsesXlsx(filters: ExportFilters, res: Response): Promise<void> {
  const db = readDb();

  let responses = db.responses;
  if (filters.beneficiaryId) responses = responses.filter((r) => r.beneficiaryId === filters.beneficiaryId);
  if (filters.questionnaireId) responses = responses.filter((r) => r.questionnaireId === filters.questionnaireId);
  if (filters.riskLevel) responses = responses.filter((r) => r.riskLevel === filters.riskLevel);
  if (filters.dateFrom || filters.dateTo) {
    const from = filters.dateFrom ? new Date(filters.dateFrom).getTime() : -Infinity;
    const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59Z`).getTime() : Infinity;
    responses = responses.filter((r) => {
      const t = new Date(r.appliedAt).getTime();
      return t >= from && t <= to;
    });
  }

  responses = [...responses].sort(
    (a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime(),
  );

  // Build question columns from questionnaires present in filtered responses
  type QuestionColumn = { id: string; text: string };
  let questionColumns: QuestionColumn[] = [];

  const distinctQIds = [...new Set(responses.map((r) => r.questionnaireId))];
  if (distinctQIds.length > 0) {
    const questionnaires = db.questionnaires
      .filter((q) => distinctQIds.includes(q.id))
      .sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));

    questionColumns = questionnaires.flatMap((qn) => {
      const dims = db.dimensions
        .filter((d) => d.questionnaireId === qn.id)
        .sort((a, b) => a.orderIndex - b.orderIndex);
      return dims.flatMap((d) =>
        db.questions
          .filter((q) => q.questionnaireId === qn.id && q.dimensionId === d.id)
          .sort((a, b) => a.orderIndex - b.orderIndex)
          .map((q) => ({ id: q.id, text: q.text })),
      );
    });
  }

  const questionIndexMap = new Map<string, number>();
  questionColumns.forEach((q, i) => questionIndexMap.set(q.id, i));

  const total = responses.length;
  const filename = `estratificacao_${new Date().toISOString().slice(0, 10)}.xlsx`;

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('X-Total-Records', String(total));

  const workbook = new ExcelJS.stream.xlsx.WorkbookWriter({ stream: res });
  const sheet = workbook.addWorksheet('Respostas');

  const baseHeaders = [
    'Beneficiário', 'CPF', 'Questionário', 'Data Aplicação',
    'Pontuação Total', 'Classificação de Risco', 'Observações',
  ];
  const baseKeys = [
    'beneficiaryName', 'cpf', 'questionnaire', 'appliedAt',
    'totalScore', 'riskLevel', 'notes',
  ];
  const baseWidths = [30, 14, 35, 20, 16, 22, 40];

  const dynamicHeaders = questionColumns.map((q) => q.text);
  const dynamicKeys    = questionColumns.map((_, i) => `q${i}`);
  const dynamicWidths  = questionColumns.map(() => 35);

  const allHeaders = [...baseHeaders, ...dynamicHeaders];
  const allKeys    = [...baseKeys, ...dynamicKeys];
  const allWidths  = [...baseWidths, ...dynamicWidths];

  sheet.columns = allKeys.map((key, i) => ({
    key,
    width: allWidths[i],
  })) as ExcelJS.Column[];

  const headerRow = sheet.addRow(allHeaders);
  headerRow.font = { bold: true };
  headerRow.commit();

  for (const r of responses) {
    const beneficiary = db.beneficiaries.find((b) => b.id === r.beneficiaryId);
    const questionnaire = db.questionnaires.find((q) => q.id === r.questionnaireId);
    const answers = db.answers.filter((a) => a.responseId === r.id);

    const base: Record<string, string | number> = {
      beneficiaryName: beneficiary?.name ?? '',
      cpf: beneficiary?.cpf ?? '',
      questionnaire: questionnaire?.title ?? '',
      appliedAt: new Date(r.appliedAt).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
      totalScore: r.totalScore,
      riskLevel: RISK_LABELS[r.riskLevel],
      notes: r.notes ?? '',
    };

    const answerMap: Record<string, string> = {};
    for (const a of answers) {
      const question = db.questions.find((q) => q.id === a.questionId);
      if (!question) continue;
      const idx = questionIndexMap.get(question.id);
      if (idx === undefined) continue;

      const selectedOptions = db.answerSelectedOptions
        .filter((aso) => aso.answerId === a.id)
        .map((aso) => db.questionOptions.find((o) => o.id === aso.optionId)?.label ?? '')
        .filter(Boolean);

      answerMap[`q${idx}`] =
        selectedOptions.length > 0 ? selectedOptions.join(', ') : (a.textValue ?? '');
    }

    sheet.addRow({ ...base, ...answerMap }).commit();
  }

  await workbook.commit();
}
