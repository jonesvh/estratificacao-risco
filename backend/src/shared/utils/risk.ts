export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'BOOLEAN' | 'NUMERIC' | 'TEXT';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

interface OptionScore {
  id: string;
  score: unknown;
}

interface QuestionForScore {
  id: string;
  type: QuestionType;
  weight: unknown;
  dimensionId: string | null;
  metadata: unknown;
  options: OptionScore[];
}

export interface AnswerInput {
  questionId: string;
  optionIds?: string[];
  textValue?: string;
}

export interface DimensionScoreResult {
  dimensionId: string;
  score: number;
  maxScore: number;
  percentage: number;
}

interface RiskThreshold {
  min: number;
  max: number;
  level: string;
  label: string;
}

export interface RiskConfig {
  thresholds: RiskThreshold[];
}

type NumericMetadata = {
  scoreRanges?: Array<{ min: number; max: number; score: number }>;
};

export function computeAnswerScore(question: QuestionForScore, answer: AnswerInput): number {
  const optionIds = answer.optionIds ?? [];

  switch (question.type) {
    case 'SINGLE_CHOICE':
    case 'BOOLEAN': {
      const opt = question.options.find((o) => optionIds.includes(o.id));
      return opt ? Number(opt.score) : 0;
    }
    case 'MULTIPLE_CHOICE': {
      return question.options
        .filter((o) => optionIds.includes(o.id))
        .reduce((sum, o) => sum + Number(o.score), 0);
    }
    case 'NUMERIC': {
      if (!answer.textValue) return 0;
      const value = parseFloat(answer.textValue);
      if (isNaN(value)) return 0;
      const meta = question.metadata as NumericMetadata | null;
      const range = meta?.scoreRanges?.find((r) => value >= r.min && value <= r.max);
      return range?.score ?? 0;
    }
    case 'TEXT':
    default:
      return 0;
  }
}

function maxQuestionScore(question: QuestionForScore): number {
  switch (question.type) {
    case 'SINGLE_CHOICE':
    case 'BOOLEAN':
      return question.options.reduce((max, o) => Math.max(max, Number(o.score)), 0);
    case 'MULTIPLE_CHOICE':
      return question.options.reduce((sum, o) => sum + Math.max(0, Number(o.score)), 0);
    case 'NUMERIC': {
      const meta = question.metadata as NumericMetadata | null;
      return Math.max(...(meta?.scoreRanges?.map((r) => r.score) ?? [0]), 0);
    }
    default:
      return 0;
  }
}

export function computeTotalMaxScore(questions: QuestionForScore[]): number {
  return round2(questions.reduce((sum, q) => sum + maxQuestionScore(q) * Number(q.weight), 0));
}

export function computeTotalScore(
  questions: QuestionForScore[],
  answerScores: Map<string, number>,
): number {
  const total = questions.reduce(
    (sum, q) => sum + (answerScores.get(q.id) ?? 0) * Number(q.weight),
    0,
  );
  return round2(total);
}

export function computeDimensionScores(
  dimensions: Array<{ id: string; weight: unknown }>,
  questions: QuestionForScore[],
  answerScores: Map<string, number>,
): DimensionScoreResult[] {
  return dimensions.map((dim) => {
    const dimQuestions = questions.filter((q) => q.dimensionId === dim.id);

    const score = dimQuestions.reduce(
      (sum, q) => sum + (answerScores.get(q.id) ?? 0) * Number(q.weight),
      0,
    );

    const maxScore = dimQuestions.reduce(
      (sum, q) => sum + maxQuestionScore(q) * Number(q.weight),
      0,
    );

    const percentage = maxScore > 0 ? Math.min((score / maxScore) * 100, 100) : 0;

    return {
      dimensionId: dim.id,
      score: round2(score),
      maxScore: round2(maxScore),
      percentage: round2(percentage),
    };
  });
}

const VALID_RISK_LEVELS: readonly RiskLevel[] = ['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'];

export function classifyRisk(totalScore: number, riskConfig: RiskConfig): RiskLevel {
  const sorted = [...riskConfig.thresholds].sort((a, b) => b.min - a.min);
  const match = sorted.find((t) => totalScore >= t.min);
  if (!match) return 'LOW';
  const level = match.level.toUpperCase() as RiskLevel;
  return VALID_RISK_LEVELS.includes(level) ? level : 'LOW';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
