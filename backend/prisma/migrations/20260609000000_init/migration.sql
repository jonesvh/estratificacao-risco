-- CreateEnum
CREATE TYPE "gender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'NOT_INFORMED');
CREATE TYPE "question_type" AS ENUM ('SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'BOOLEAN', 'NUMERIC', 'TEXT');
CREATE TYPE "risk_level" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH');

-- CreateTable users
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateTable beneficiaries
CREATE TABLE "beneficiaries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "cpf" CHAR(11) NOT NULL,
    "birth_date" DATE NOT NULL,
    "gender" "gender",
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "plan_code" VARCHAR(50),
    "municipio" VARCHAR(100),
    "estado" CHAR(2),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "beneficiaries_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "beneficiaries_cpf_key" ON "beneficiaries"("cpf");
CREATE INDEX "beneficiaries_plan_code_idx" ON "beneficiaries"("plan_code");
CREATE INDEX "beneficiaries_is_active_idx" ON "beneficiaries"("is_active");
CREATE INDEX "beneficiaries_name_idx" ON "beneficiaries"("name");

-- CreateTable questionnaires
CREATE TABLE "questionnaires" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "risk_config" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "questionnaires_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "questionnaires_is_active_idx" ON "questionnaires"("is_active");

-- CreateTable dimensions
CREATE TABLE "dimensions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "questionnaire_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "order_index" INTEGER NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dimensions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "dimensions_questionnaire_id_order_index_idx" ON "dimensions"("questionnaire_id", "order_index");

-- CreateTable questions
CREATE TABLE "questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "questionnaire_id" UUID NOT NULL,
    "dimension_id" UUID,
    "text" TEXT NOT NULL,
    "type" "question_type" NOT NULL,
    "order_index" INTEGER NOT NULL,
    "is_required" BOOLEAN NOT NULL DEFAULT true,
    "weight" DECIMAL(5,2) NOT NULL DEFAULT 1.00,
    "help_text" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "questions_questionnaire_id_order_index_idx" ON "questions"("questionnaire_id", "order_index");
CREATE INDEX "questions_dimension_id_idx" ON "questions"("dimension_id");

-- CreateTable question_options
CREATE TABLE "question_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_id" UUID NOT NULL,
    "label" VARCHAR(500) NOT NULL,
    "value" VARCHAR(100) NOT NULL,
    "score" DECIMAL(8,2) NOT NULL DEFAULT 0.00,
    "order_index" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "question_options_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "question_options_question_id_order_index_idx" ON "question_options"("question_id", "order_index");

-- CreateTable questionnaire_responses
CREATE TABLE "questionnaire_responses" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "beneficiary_id" UUID NOT NULL,
    "questionnaire_id" UUID NOT NULL,
    "applied_by_id" UUID NOT NULL,
    "applied_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "total_score" DECIMAL(10,2) NOT NULL,
    "risk_level" "risk_level" NOT NULL,
    "notes" TEXT,
    "medicacoes" TEXT,
    "metadata" JSONB,
    CONSTRAINT "questionnaire_responses_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "questionnaire_responses_beneficiary_id_idx" ON "questionnaire_responses"("beneficiary_id");
CREATE INDEX "questionnaire_responses_questionnaire_id_idx" ON "questionnaire_responses"("questionnaire_id");
CREATE INDEX "questionnaire_responses_applied_by_id_idx" ON "questionnaire_responses"("applied_by_id");
CREATE INDEX "questionnaire_responses_applied_at_idx" ON "questionnaire_responses"("applied_at");
CREATE INDEX "questionnaire_responses_risk_level_idx" ON "questionnaire_responses"("risk_level");
CREATE INDEX "questionnaire_responses_beneficiary_id_applied_at_idx" ON "questionnaire_responses"("beneficiary_id", "applied_at");
CREATE INDEX "questionnaire_responses_questionnaire_id_risk_level_idx" ON "questionnaire_responses"("questionnaire_id", "risk_level");

-- CreateTable answers
CREATE TABLE "answers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "response_id" UUID NOT NULL,
    "question_id" UUID NOT NULL,
    "text_value" TEXT,
    "score_snapshot" DECIMAL(8,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "answers_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "answers_response_id_question_id_key" ON "answers"("response_id", "question_id");
CREATE INDEX "answers_response_id_idx" ON "answers"("response_id");
CREATE INDEX "answers_question_id_idx" ON "answers"("question_id");

-- CreateTable answer_selected_options
CREATE TABLE "answer_selected_options" (
    "answer_id" UUID NOT NULL,
    "option_id" UUID NOT NULL,
    CONSTRAINT "answer_selected_options_pkey" PRIMARY KEY ("answer_id", "option_id")
);
CREATE INDEX "answer_selected_options_option_id_idx" ON "answer_selected_options"("option_id");

-- CreateTable dimension_scores
CREATE TABLE "dimension_scores" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "response_id" UUID NOT NULL,
    "dimension_id" UUID NOT NULL,
    "score" DECIMAL(10,2) NOT NULL,
    "max_score" DECIMAL(10,2) NOT NULL,
    "percentage" DECIMAL(5,2) NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "dimension_scores_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "dimension_scores_response_id_dimension_id_key" ON "dimension_scores"("response_id", "dimension_id");
CREATE INDEX "dimension_scores_response_id_idx" ON "dimension_scores"("response_id");
CREATE INDEX "dimension_scores_dimension_id_idx" ON "dimension_scores"("dimension_id");

-- AddForeignKey
ALTER TABLE "dimensions" ADD CONSTRAINT "dimensions_questionnaire_id_fkey"
    FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "questions" ADD CONSTRAINT "questions_questionnaire_id_fkey"
    FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "questions" ADD CONSTRAINT "questions_dimension_id_fkey"
    FOREIGN KEY ("dimension_id") REFERENCES "dimensions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "question_options" ADD CONSTRAINT "question_options_question_id_fkey"
    FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_beneficiary_id_fkey"
    FOREIGN KEY ("beneficiary_id") REFERENCES "beneficiaries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_questionnaire_id_fkey"
    FOREIGN KEY ("questionnaire_id") REFERENCES "questionnaires"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "questionnaire_responses" ADD CONSTRAINT "questionnaire_responses_applied_by_id_fkey"
    FOREIGN KEY ("applied_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "answers" ADD CONSTRAINT "answers_response_id_fkey"
    FOREIGN KEY ("response_id") REFERENCES "questionnaire_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "answers" ADD CONSTRAINT "answers_question_id_fkey"
    FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "answer_selected_options" ADD CONSTRAINT "answer_selected_options_answer_id_fkey"
    FOREIGN KEY ("answer_id") REFERENCES "answers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "answer_selected_options" ADD CONSTRAINT "answer_selected_options_option_id_fkey"
    FOREIGN KEY ("option_id") REFERENCES "question_options"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "dimension_scores" ADD CONSTRAINT "dimension_scores_response_id_fkey"
    FOREIGN KEY ("response_id") REFERENCES "questionnaire_responses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "dimension_scores" ADD CONSTRAINT "dimension_scores_dimension_id_fkey"
    FOREIGN KEY ("dimension_id") REFERENCES "dimensions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
