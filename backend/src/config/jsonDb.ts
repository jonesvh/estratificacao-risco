import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { randomUUID } from 'crypto';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER' | 'NOT_INFORMED';
export type QuestionType = 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'BOOLEAN' | 'NUMERIC' | 'TEXT';
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'VERY_HIGH';

export interface Beneficiary {
  id: string;
  name: string;
  cpf: string;
  birthDate: string;
  gender: Gender | null;
  phone: string | null;
  email: string | null;
  planCode: string | null;
  municipio: string | null;
  estado: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Questionnaire {
  id: string;
  title: string;
  description: string | null;
  version: number;
  isActive: boolean;
  riskConfig: unknown;
  createdAt: string;
  updatedAt: string;
}

export interface Dimension {
  id: string;
  questionnaireId: string;
  name: string;
  description: string | null;
  orderIndex: number;
  weight: number;
  createdAt: string;
}

export interface Question {
  id: string;
  questionnaireId: string;
  dimensionId: string | null;
  text: string;
  type: QuestionType;
  orderIndex: number;
  isRequired: boolean;
  weight: number;
  helpText: string | null;
  metadata: unknown | null;
  createdAt: string;
}

export interface QuestionOption {
  id: string;
  questionId: string;
  label: string;
  value: string;
  score: number;
  orderIndex: number;
  createdAt: string;
}

export interface QuestionnaireResponse {
  id: string;
  beneficiaryId: string;
  questionnaireId: string;
  appliedAt: string;
  totalScore: number;
  riskLevel: RiskLevel;
  notes: string | null;
  medicacoes: string | null;
  metadata: unknown | null;
}

export interface Answer {
  id: string;
  responseId: string;
  questionId: string;
  textValue: string | null;
  scoreSnapshot: number;
  createdAt: string;
}

export interface AnswerSelectedOption {
  answerId: string;
  optionId: string;
}

export interface DimensionScore {
  id: string;
  responseId: string;
  dimensionId: string;
  score: number;
  maxScore: number;
  percentage: number;
  createdAt: string;
}

export interface DbData {
  beneficiaries: Beneficiary[];
  questionnaires: Questionnaire[];
  dimensions: Dimension[];
  questions: Question[];
  questionOptions: QuestionOption[];
  responses: QuestionnaireResponse[];
  answers: Answer[];
  answerSelectedOptions: AnswerSelectedOption[];
  dimensionScores: DimensionScore[];
}

function getDbPath(): string {
  return process.env.JSON_DB_PATH ?? './MEDPREV/db.json';
}

export function readDb(): DbData {
  const dbPath = getDbPath();
  try {
    const raw = readFileSync(dbPath, 'utf-8');
    return JSON.parse(raw) as DbData;
  } catch {
    return {
      beneficiaries: [],
      questionnaires: [],
      dimensions: [],
      questions: [],
      questionOptions: [],
      responses: [],
      answers: [],
      answerSelectedOptions: [],
      dimensionScores: [],
    };
  }
}

export function writeDb(data: DbData): void {
  const dbPath = getDbPath();
  mkdirSync(dirname(dbPath), { recursive: true });
  writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
}

export function generateId(): string {
  return randomUUID();
}

export function now(): string {
  return new Date().toISOString();
}
