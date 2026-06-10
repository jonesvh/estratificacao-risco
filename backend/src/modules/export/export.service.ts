import ExcelJS from 'exceljs';
import { Response } from 'express';
import { Prisma, RiskLevel } from '@prisma/client';
import { prisma } from '../../config/database';

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

const BATCH_SIZE = 500;

export async function streamResponsesXlsx(filters: ExportFilters, res: Response): Promise<void> {
  const where: Prisma.QuestionnaireResponseWhereInput = {};
  if (filters.beneficiaryId) where.beneficiaryId = filters.beneficiaryId;
  if (filters.questionnaireId) where.questionnaireId = filters.questionnaireId;
  if (filters.riskLevel) where.riskLevel = filters.riskLevel;
  if (filters.dateFrom || filters.dateTo) {
    where.appliedAt = {
      ...(filters.dateFrom ? { gte: new Date(filters.dateFrom) } : {}),
      ...(filters.dateTo ? { lte: new Date(`${filters.dateTo}T23:59:59Z`) } : {}),
    };
  }

  // Always fetch questions from the questionnaires present in the filtered responses
  type QuestionColumn = { id: string; text: string };
  let questionColumns: QuestionColumn[] = [];

  const distinctQIds = await prisma.questionnaireResponse
    .findMany({ where, select: { questionnaireId: true }, distinct: ['questionnaireId'] })
    .then((rows) => rows.map((r) => r.questionnaireId));

  if (distinctQIds.length > 0) {
    const qData = await prisma.questionnaire.findMany({
      where: { id: { in: distinctQIds } },
      include: {
        dimensions: {
          orderBy: { orderIndex: 'asc' },
          include: { questions: { orderBy: { orderIndex: 'asc' } } },
        },
      },
      orderBy: { title: 'asc' },
    });
    questionColumns = qData.flatMap((qn) =>
      qn.dimensions.flatMap((d) => d.questions.map((q) => ({ id: q.id, text: q.text }))),
    );
  }

  // Map question ID → column index for O(1) lookup when building rows
  const questionIndexMap = new Map<string, number>();
  questionColumns.forEach((q, i) => questionIndexMap.set(q.id, i));

  const total = await prisma.questionnaireResponse.count({ where });
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

  // Numeric keys (q0, q1, ...) avoid UUID-hyphen issues with ExcelJS column key mapping
  const dynamicHeaders = questionColumns.map((q) => q.text);
  const dynamicKeys    = questionColumns.map((_, i) => `q${i}`);
  const dynamicWidths  = questionColumns.map(() => 35);

  const allHeaders = [...baseHeaders, ...dynamicHeaders];
  const allKeys = [...baseKeys, ...dynamicKeys];
  const allWidths = [...baseWidths, ...dynamicWidths];

  sheet.columns = allKeys.map((key, i) => ({
    key,
    width: allWidths[i],
  })) as ExcelJS.Column[];

  // Explicitly write the header row with bold font
  const headerRow = sheet.addRow(allHeaders);
  headerRow.font = { bold: true };
  headerRow.commit();

  let skip = 0;

  while (skip < total) {
    const batch = await prisma.questionnaireResponse.findMany({
      where,
      include: {
        beneficiary: { select: { name: true, cpf: true } },
        questionnaire: { select: { title: true } },
        answers: {
          include: {
            question: { select: { id: true, text: true } },
            selectedOptions: { include: { option: { select: { label: true } } } },
          },
        },
      },
      orderBy: { appliedAt: 'desc' },
      skip,
      take: BATCH_SIZE,
    });

    for (const r of batch) {
      const base: Record<string, string | number> = {
        beneficiaryName: r.beneficiary.name,
        cpf: r.beneficiary.cpf,
        questionnaire: r.questionnaire.title,
        appliedAt: r.appliedAt.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' }),
        totalScore: Number(r.totalScore),
        riskLevel: RISK_LABELS[r.riskLevel],
        notes: r.notes ?? '',
      };

      const answerMap: Record<string, string> = {};
      for (const a of r.answers) {
        const idx = questionIndexMap.get(a.question.id);
        if (idx !== undefined) {
          answerMap[`q${idx}`] =
            a.selectedOptions.length > 0
              ? a.selectedOptions.map((s) => s.option.label).join(', ')
              : (a.textValue ?? '');
        }
      }
      sheet.addRow({ ...base, ...answerMap }).commit();
    }

    skip += BATCH_SIZE;
  }

  await workbook.commit();
}
