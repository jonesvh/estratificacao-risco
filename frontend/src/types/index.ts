export interface User {
  id: string;
  email: string;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';
export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_INFORMED';
export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'BOOLEAN' | 'NUMERIC' | 'TEXT';

export interface Beneficiary {
  id: string;
  name: string;
  cpf: string;
  birthDate: string;
  gender?: Gender;
  phone?: string;
  email?: string;
  planCode?: string;
  municipio?: string;
  estado?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface QuestionOption {
  id: string;
  questionId: string;
  label: string;
  value: string;
  score: number;
  orderIndex: number;
}

export interface Question {
  id: string;
  questionnaireId: string;
  dimensionId?: string;
  text: string;
  type: QuestionType;
  orderIndex: number;
  isRequired: boolean;
  weight: number;
  helpText?: string;
  metadata?: Record<string, unknown>;
  options: QuestionOption[];
}

export interface Dimension {
  id: string;
  questionnaireId: string;
  name: string;
  description?: string;
  orderIndex: number;
  weight: number;
  questions: Question[];
}

export interface RiskThreshold {
  min: number;
  max: number;
  level: RiskLevel;
  label: string;
}

export interface Questionnaire {
  id: string;
  title: string;
  description?: string;
  version: number;
  isActive: boolean;
  riskConfig: { thresholds: RiskThreshold[] };
  createdAt: string;
  updatedAt: string;
  dimensions?: Dimension[];
  _count?: { questions: number; responses: number };
}

export interface DimensionScore {
  id: string;
  dimensionId: string;
  score: number;
  maxScore: number;
  percentage: number;
  dimension: { name: string };
}

export interface Answer {
  id: string;
  questionId: string;
  textValue?: string;
  scoreSnapshot: number;
  question: {
    id: string;
    text: string;
    type: QuestionType;
    orderIndex: number;
  };
  selectedOptions: Array<{
    option: { id: string; label: string; value: string };
  }>;
}

export interface QuestionnaireResponse {
  id: string;
  beneficiaryId: string;
  questionnaireId: string;
  appliedById: string;
  appliedAt: string;
  totalScore: number;
  riskLevel: RiskLevel;
  notes?: string;
  medicacoes?: string;
  beneficiary: Pick<Beneficiary, 'id' | 'name' | 'cpf'> & { planCode?: string };
  questionnaire: Pick<Questionnaire, 'id' | 'title'>;
  appliedBy: { email: string };
  dimensionScores: DimensionScore[];
  answers?: Answer[];
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface DashboardSummary {
  beneficiaries: { total: number; active: number };
  responses: { total: number; thisMonth: number };
  riskDistribution: Record<RiskLevel, number>;
}
