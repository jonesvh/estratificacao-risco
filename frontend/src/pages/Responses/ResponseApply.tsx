import { useState, useCallback, useEffect, type ChangeEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Search, X, Check, ChevronLeft, ChevronRight, ClipboardCheck } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell/AppShell';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Select } from '../../components/ui/Select/Select';
import { Card, CardBody } from '../../components/ui/Card/Card';
import { Spinner } from '../../components/ui/Spinner/Spinner';
import { listBeneficiaries, updateBeneficiary, createBeneficiary, getBeneficiary } from '../../services/beneficiaries.service';
import { listQuestionnaires, getQuestionnaire } from '../../services/questionnaires.service';
import { createResponse, updateResponse, type UpdateResponseInput } from '../../services/responses.service';
import { getResponse } from '../../services/responses.service';
import { useDebounce } from '../../hooks/useDebounce';
import { formatCPF, calcAge } from '../../utils/format';
import { cn } from '../../utils/cn';
import type { Beneficiary, Dimension, Question } from '../../types';
import styles from './ResponseApply.module.css';

type AnswerMap = Record<string, { optionIds: string[]; textValue: string }>;

const EMPTY_ANSWER = { optionIds: [], textValue: '' };

const PLAN_TYPE_OPTIONS = [
  { value: '', label: 'Selecione...' },
  { value: 'Empresarial', label: 'Empresarial' },
  { value: 'Fisica', label: 'Física' },
  { value: 'Adesao', label: 'Adesão' },
];

const beneficiarySchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  cpf: z.string().length(11, 'CPF deve ter 11 dígitos').regex(/^\d+$/, 'Apenas números'),
  birthDate: z.string().min(1, 'Data de nascimento obrigatória'),
  phone: z.string().optional(),
  municipio: z.string().max(100).optional(),
  estado: z.string().length(2, 'UF deve ter 2 letras').or(z.literal('')).optional(),
  planCode: z.string().optional(),
});

type BeneficiaryFormData = z.infer<typeof beneficiarySchema>;

// ─── MAIN PAGE ───────────────────────────────────────────────────────────────

export function ResponseApplyPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const preselectedBeneficiaryId = searchParams.get('beneficiaryId');
  const editResponseId = searchParams.get('responseId');

  const [step, setStep] = useState(0);
  const [beneficiaryMode, setBeneficiaryMode] = useState<'search' | 'create'>('search');
  const [beneficiarySearch, setBeneficiarySearch] = useState('');
  const [selectedBeneficiary, setSelectedBeneficiary] = useState<Beneficiary | null>(null);
  const [municipio, setMunicipio] = useState('');
  const [estado, setEstado] = useState('');
  const [selectedQuestionnaireId, setSelectedQuestionnaireId] = useState(
    searchParams.get('questionnaireId') ?? ''
  );
  const [medicacoes, setMedicacoes] = useState('');
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [notes, setNotes] = useState('');
  const [editInitialized, setEditInitialized] = useState(false);

  const {
    register,
    handleSubmit,
    reset: resetCreate,
    formState: { errors: createErrors },
  } = useForm<BeneficiaryFormData>({ resolver: zodResolver(beneficiarySchema) });

  const debouncedSearch = useDebounce(beneficiarySearch);

  // ── Edit mode: load existing response ────────────────────────────────────
  const { data: existingResponse } = useQuery({
    queryKey: ['response', editResponseId],
    queryFn: () => getResponse(editResponseId!),
    enabled: !!editResponseId,
  });

  const { data: editBeneficiary } = useQuery({
    queryKey: ['beneficiary', existingResponse?.beneficiaryId],
    queryFn: () => getBeneficiary(existingResponse!.beneficiaryId),
    enabled: !!existingResponse?.beneficiaryId && !selectedBeneficiary,
  });

  useEffect(() => {
    if (existingResponse && editBeneficiary && !editInitialized) {
      setSelectedQuestionnaireId(existingResponse.questionnaireId);
      setMedicacoes(existingResponse.medicacoes ?? '');
      setNotes(existingResponse.notes ?? '');
      selectBeneficiary(editBeneficiary);
      const map: AnswerMap = {};
      for (const a of existingResponse.answers ?? []) {
        map[a.questionId] = {
          optionIds: a.selectedOptions.map((s) => s.option.id),
          textValue: a.textValue ?? '',
        };
      }
      setAnswers(map);
      setEditInitialized(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingResponse, editBeneficiary, editInitialized]);

  // ── New mode: search + preload ────────────────────────────────────────────
  const { data: searchResults, isLoading: loadingSearch } = useQuery({
    queryKey: ['beneficiaries-search', debouncedSearch],
    queryFn: () => listBeneficiaries({ search: debouncedSearch, isActive: 'true', limit: 6 }),
    enabled: debouncedSearch.length > 1 && !selectedBeneficiary && !editResponseId,
  });

  const { data: preloaded } = useQuery({
    queryKey: ['beneficiary-preload', preselectedBeneficiaryId],
    queryFn: () => listBeneficiaries({ search: preselectedBeneficiaryId!, limit: 1 }),
    enabled: !!preselectedBeneficiaryId && !selectedBeneficiary && !editResponseId,
    select: (d) => d.data[0],
  });

  if (preloaded && !selectedBeneficiary) {
    setSelectedBeneficiary(preloaded);
    setMunicipio(preloaded.municipio ?? '');
    setEstado(preloaded.estado ?? '');
  }

  const { data: questionnaires } = useQuery({
    queryKey: ['questionnaires', true],
    queryFn: () => listQuestionnaires(true),
    enabled: !editResponseId,
  });

  const { data: questionnaire, isLoading: loadingQ } = useQuery({
    queryKey: ['questionnaire', selectedQuestionnaireId],
    queryFn: () => getQuestionnaire(selectedQuestionnaireId),
    enabled: !!selectedQuestionnaireId,
  });

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const submit = useMutation({
    mutationFn: createResponse,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['responses'] });
      navigate(`/responses/${data.id}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (input: UpdateResponseInput) => updateResponse(editResponseId!, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['response', editResponseId] });
      queryClient.invalidateQueries({ queryKey: ['responses'] });
      navigate(`/responses/${editResponseId}`);
    },
  });

  const createBeneficiaryMutation = useMutation({
    mutationFn: createBeneficiary,
    onSuccess: (b) => {
      selectBeneficiary(b);
      resetCreate();
      setBeneficiaryMode('search');
      queryClient.invalidateQueries({ queryKey: ['beneficiaries'], refetchType: 'all' });
    },
  });

  const qOptions = [
    { value: '', label: 'Selecione um questionário...' },
    ...(questionnaires?.map((q) => ({ value: q.id, label: q.title })) ?? []),
  ];

  const dimensions: Dimension[] = questionnaire?.dimensions ?? [];
  const totalSteps = 1 + dimensions.length + 1;
  const lastStep = totalSteps - 1;

  function selectBeneficiary(b: Beneficiary) {
    setSelectedBeneficiary(b);
    setMunicipio(b.municipio ?? '');
    setEstado(b.estado ?? '');
    setBeneficiarySearch('');
  }

  function clearBeneficiary() {
    setSelectedBeneficiary(null);
    setMunicipio('');
    setEstado('');
    setBeneficiarySearch('');
  }

  const setAnswer = useCallback((questionId: string, update: Partial<AnswerMap[string]>) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] ?? EMPTY_ANSWER), ...update },
    }));
  }, []);

  function toggleOption(questionId: string, optionId: string, multi: boolean, isNoneValue?: boolean) {
    setAnswers((prev) => {
      const current = prev[questionId] ?? EMPTY_ANSWER;
      let optionIds: string[];
      if (!multi) {
        optionIds = [optionId];
      } else if (isNoneValue) {
        optionIds = current.optionIds.includes(optionId) ? [] : [optionId];
      } else {
        const withoutNone = current.optionIds.filter((id) => {
          const opt = questionnaire?.dimensions
            ?.flatMap((d) => d.questions)
            .find((q) => q.id === questionId)
            ?.options.find((o) => o.id === id);
          return opt?.value !== 'nenhuma' && opt?.value !== 'sem_diag';
        });
        optionIds = withoutNone.includes(optionId)
          ? withoutNone.filter((id) => id !== optionId)
          : [...withoutNone, optionId];
      }
      return { ...prev, [questionId]: { ...current, optionIds } };
    });
  }

  function canProceedStep0() {
    return !!selectedBeneficiary && !!selectedQuestionnaireId;
  }

  function canProceedDimension(dim: Dimension): boolean {
    const required = dim.questions.filter((q) => q.isRequired);
    return required.every((q) => {
      const ans = answers[q.id];
      if (!ans) return false;
      if (q.type === 'TEXT' || q.type === 'NUMERIC') return ans.textValue.trim().length > 0;
      return ans.optionIds.length > 0;
    });
  }

  async function advanceFromStep0() {
    if (!selectedBeneficiary) return;
    const changed =
      municipio !== (selectedBeneficiary.municipio ?? '') ||
      estado !== (selectedBeneficiary.estado ?? '');
    if (changed) {
      await updateBeneficiary(selectedBeneficiary.id, { municipio, estado });
    }
    setStep(1);
  }

  function handleFinalSubmit() {
    if (!selectedBeneficiary || !questionnaire) return;
    const answersPayload = Object.entries(answers)
      .filter(([, ans]) => ans.optionIds.length > 0 || ans.textValue.trim())
      .map(([questionId, ans]) => ({
        questionId,
        optionIds: ans.optionIds.length ? ans.optionIds : undefined,
        textValue: ans.textValue.trim() || undefined,
      }));

    if (editResponseId) {
      updateMutation.mutate({
        medicacoes: medicacoes.trim() || undefined,
        notes: notes.trim() || undefined,
        answers: answersPayload,
      });
    } else {
      submit.mutate({
        beneficiaryId: selectedBeneficiary.id,
        questionnaireId: questionnaire.id,
        medicacoes: medicacoes.trim() || undefined,
        notes: notes.trim() || undefined,
        answers: answersPayload,
      });
    }
  }

  async function onCreateSubmit(data: BeneficiaryFormData) {
    await createBeneficiaryMutation.mutateAsync({
      name: data.name,
      cpf: data.cpf,
      birthDate: data.birthDate,
      phone: data.phone || undefined,
      municipio: data.municipio || undefined,
      estado: data.estado || undefined,
      planCode: (data.planCode || undefined) as 'Empresarial' | 'Fisica' | 'Adesao' | undefined,
    });
  }

  const createApiError = createBeneficiaryMutation.error as {
    response?: { data?: { message?: string } };
  } | null;
  const createErrorMsg = createApiError?.response?.data?.message;

  const DIM_ABBREV: Record<string, string> = {
    'Condições Clínicas':                 'Cond. Clínicas',
    'Padrão de Utilização dos Serviços':  'Utilização',
    'Capacidade Funcional e Fragilidade': 'Cap. Funcional',
    'Sintomas e Saúde Mental':            'Sintomas',
    'Contexto Social e Adesão':           'Social',
  };
  const stepLabels = ['Dados', ...dimensions.map((d) => DIM_ABBREV[d.name] ?? d.name), 'Observações'];

  const isEditMode = !!editResponseId;
  const isSubmitting = isEditMode ? updateMutation.isPending : submit.isPending;
  const hasSubmitError = isEditMode ? updateMutation.isError : submit.isError;

  // Show loading while fetching existing response in edit mode
  if (isEditMode && !editInitialized) {
    return (
      <AppShell title="Editar Aplicação" subtitle="Carregando dados da aplicação...">
        <Spinner center size="xl" />
      </AppShell>
    );
  }

  return (
    <AppShell
      title={isEditMode ? 'Editar Aplicação' : 'Novo Questionário'}
      subtitle="Aplique o questionário de Estratificação de Risco"
    >
      <div className={styles.container}>

        {/* Progress bar */}
        <div className={styles.progress}>
          {stepLabels.map((label, i) => (
            <div key={i} className={cn(styles.stepItem, step === i && styles.stepActive, step > i && styles.stepDone)}>
              <div className={styles.stepCircle}>
                {step > i ? <Check size={13} /> : i + 1}
              </div>
              <span className={styles.stepLabel}>{label}</span>
              {i < stepLabels.length - 1 && <div className={styles.stepLine} />}
            </div>
          ))}
        </div>

        {/* Step 0: Dados do Beneficiário */}
        {step === 0 && (
          <Card>
            <CardBody>
              <h3 className={styles.blockTitle}>Dados do Beneficiário</h3>

              {/* Mode toggle — hidden in edit mode or when a beneficiary is selected */}
              {!selectedBeneficiary && !isEditMode && (
                <div className={styles.modeToggle}>
                  <button
                    type="button"
                    className={cn(styles.modeBtn, beneficiaryMode === 'search' && styles.modeBtnActive)}
                    onClick={() => setBeneficiaryMode('search')}
                  >
                    Buscar cadastro
                  </button>
                  <button
                    type="button"
                    className={cn(styles.modeBtn, beneficiaryMode === 'create' && styles.modeBtnActive)}
                    onClick={() => setBeneficiaryMode('create')}
                  >
                    Cadastrar novo
                  </button>
                </div>
              )}

              {/* SEARCH MODE */}
              {!selectedBeneficiary && !isEditMode && beneficiaryMode === 'search' && (
                <div className={styles.section}>
                  <div className={styles.searchRow}>
                    <Input
                      placeholder="Nome ou CPF..."
                      leftIcon={<Search size={15} />}
                      value={beneficiarySearch}
                      onChange={(e) => setBeneficiarySearch(e.target.value)}
                    />
                    {loadingSearch && <Spinner size="sm" />}
                  </div>
                  {searchResults?.data.map((b) => (
                    <div key={b.id} className={styles.beneficiaryResult} onClick={() => selectBeneficiary(b)}>
                      <span className={styles.beneficiaryName}>{b.name}</span>
                      <span className={styles.beneficiaryCpf}>
                        {formatCPF(b.cpf)}{b.planCode ? ` · Plano ${b.planCode}` : ''}
                      </span>
                    </div>
                  ))}
                  {!loadingSearch && beneficiarySearch.trim().length > 0 && searchResults?.data.length === 0 && (
                    <p className={styles.notFoundText}>
                      Nenhum beneficiário encontrado. Use "Cadastrar novo" para registrá-lo.
                    </p>
                  )}
                </div>
              )}

              {/* CREATE MODE */}
              {!selectedBeneficiary && !isEditMode && beneficiaryMode === 'create' && (
                <form onSubmit={handleSubmit(onCreateSubmit)} className={styles.section}>
                  <div className={styles.inlineGrid}>
                    <Input
                      label="Nome completo"
                      required
                      error={createErrors.name?.message}
                      {...register('name')}
                    />
                    <Input
                      label="CPF"
                      required
                      placeholder="Somente números"
                      maxLength={11}
                      error={createErrors.cpf?.message}
                      {...register('cpf')}
                    />
                    <Input
                      label="Data de nascimento"
                      type="date"
                      required
                      error={createErrors.birthDate?.message}
                      {...register('birthDate')}
                    />
                    <Input
                      label="Telefone"
                      placeholder="(00) 00000-0000"
                      {...register('phone')}
                    />
                    <Input
                      label="Município"
                      placeholder="Ex: São Paulo"
                      {...register('municipio')}
                    />
                    <Input
                      label="UF"
                      placeholder="SP"
                      maxLength={2}
                      error={createErrors.estado?.message}
                      {...register('estado')}
                    />
                    <Select
                      label="Tipo de Plano"
                      options={PLAN_TYPE_OPTIONS}
                      {...register('planCode')}
                    />
                  </div>

                  {createErrorMsg && (
                    <p className={styles.errorText}>{createErrorMsg}</p>
                  )}

                  <div className={styles.createActions}>
                    <Button
                      type="submit"
                      loading={createBeneficiaryMutation.isPending}
                      rightIcon={<ChevronRight size={15} />}
                    >
                      Cadastrar e selecionar
                    </Button>
                  </div>
                </form>
              )}

              {/* SELECTED beneficiary card */}
              {selectedBeneficiary && (
                <div className={styles.section}>
                  <div className={styles.beneficiaryCard}>
                    <div className={styles.beneficiaryInfo}>
                      <span className={styles.beneficiaryName}>{selectedBeneficiary.name}</span>
                      <span className={styles.beneficiaryCpf}>
                        {formatCPF(selectedBeneficiary.cpf)}
                        {selectedBeneficiary.birthDate && ` · ${calcAge(selectedBeneficiary.birthDate)} anos`}
                        {selectedBeneficiary.planCode && ` · Plano ${selectedBeneficiary.planCode}`}
                      </span>
                    </div>
                    {!isEditMode && (
                      <Button variant="ghost" size="sm" onClick={clearBeneficiary}>
                        <X size={14} />
                      </Button>
                    )}
                  </div>

                  <div className={styles.locationRow}>
                    <div className={styles.locationField}>
                      <Input
                        label="Município"
                        value={municipio}
                        onChange={(e) => setMunicipio(e.target.value)}
                        placeholder="Ex: São Paulo"
                      />
                    </div>
                    <div className={styles.ufField}>
                      <Input
                        label="UF"
                        value={estado}
                        onChange={(e) => setEstado(e.target.value.toUpperCase())}
                        placeholder="SP"
                        maxLength={2}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Questionnaire — editable in new mode, read-only in edit mode */}
              <div className={styles.section}>
                {isEditMode ? (
                  <div className={styles.readonlyField}>
                    <span className={styles.readonlyLabel}>Questionário</span>
                    <span className={styles.readonlyValue}>{questionnaire?.title ?? '—'}</span>
                  </div>
                ) : (
                  <Select
                    label="Questionário"
                    options={qOptions}
                    value={selectedQuestionnaireId}
                    onChange={(e) => setSelectedQuestionnaireId(e.target.value)}
                  />
                )}
              </div>

              {/* Medications */}
              <div className={styles.section}>
                <Input
                  as="textarea"
                  label="Medicações em uso"
                  value={medicacoes}
                  onChange={(e) => setMedicacoes((e.target as HTMLTextAreaElement).value)}
                  placeholder="Liste as medicações em uso pelo beneficiário..."
                />
              </div>

              {!selectedBeneficiary && (
                <p className={styles.requiredBeneficiaryText}>
                  Selecione ou cadastre um beneficiário para continuar.
                </p>
              )}
              <div className={styles.actions}>
                <Button variant="outline" onClick={() => navigate(isEditMode ? `/responses/${editResponseId}` : '/questionnaires')}>
                  Cancelar
                </Button>
                <Button
                  disabled={!canProceedStep0()}
                  rightIcon={<ChevronRight size={15} />}
                  onClick={advanceFromStep0}
                >
                  Próximo
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Steps 1..N: Dimension blocks */}
        {step >= 1 && step <= dimensions.length && (() => {
          const dim = dimensions[step - 1];
          const canAdvance = canProceedDimension(dim);
          return (
            <Card>
              <CardBody>
                <div className={styles.blockHeader}>
                  <h3 className={styles.blockTitle}>Bloco {step}: {dim.name}</h3>
                  <span className={styles.blockProgress}>{step}/{dimensions.length}</span>
                </div>

                {dim.questions.map((q) => (
                  <QuestionInput
                    key={q.id}
                    question={q}
                    answer={answers[q.id] ?? EMPTY_ANSWER}
                    onOptionToggle={(optId, multi, isNone) => toggleOption(q.id, optId, multi, isNone)}
                    onTextChange={(val) => setAnswer(q.id, { textValue: val })}
                  />
                ))}

                <div className={styles.actions}>
                  <Button variant="outline" leftIcon={<ChevronLeft size={15} />} onClick={() => setStep(step - 1)}>
                    Anterior
                  </Button>
                  <Button
                    disabled={!canAdvance}
                    rightIcon={<ChevronRight size={15} />}
                    onClick={() => setStep(step + 1)}
                  >
                    {step === dimensions.length ? 'Observações' : 'Próximo Bloco'}
                  </Button>
                </div>
              </CardBody>
            </Card>
          );
        })()}

        {/* Last step: Observações */}
        {step === lastStep && (
          <Card>
            <CardBody>
              <h3 className={styles.blockTitle}>Observações Clínicas</h3>
              <p className={styles.obsHelp}>
                Campo opcional. Registre informações clínicas relevantes não contempladas nas perguntas anteriores.
              </p>

              <Input
                as="textarea"
                label="Observações"
                value={notes}
                onChange={(e) => setNotes((e.target as HTMLTextAreaElement).value)}
                placeholder="Ex: Paciente apresentou dificuldade em responder as perguntas de mobilidade..."
              />

              {hasSubmitError && (
                <p className={styles.errorText}>
                  Erro ao salvar. Verifique se todas as perguntas obrigatórias foram respondidas.
                </p>
              )}

              <div className={styles.actions}>
                <Button variant="outline" leftIcon={<ChevronLeft size={15} />} onClick={() => setStep(step - 1)}>
                  Anterior
                </Button>
                <Button
                  loading={isSubmitting}
                  leftIcon={<ClipboardCheck size={15} />}
                  onClick={handleFinalSubmit}
                >
                  {isEditMode ? 'Salvar Alterações' : 'Finalizar Aplicação'}
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {loadingQ && step === 0 && !!selectedQuestionnaireId && (
          <div className={styles.loadingQ}>
            <Spinner size="sm" /><span>Carregando questionário...</span>
          </div>
        )}
      </div>
    </AppShell>
  );
}

// ─── QUESTION INPUT ───────────────────────────────────────────────────────────

interface QuestionInputProps {
  question: Question;
  answer: { optionIds: string[]; textValue: string };
  onOptionToggle: (optionId: string, multi: boolean, isNone: boolean) => void;
  onTextChange: (value: string) => void;
}

function QuestionInput({ question, answer, onOptionToggle, onTextChange }: QuestionInputProps) {
  const isChoice = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'BOOLEAN'].includes(question.type);
  const isMulti = question.type === 'MULTIPLE_CHOICE';

  return (
    <div className={cn(styles.questionBlock, !question.isRequired && styles.questionOptional)}>
      <p className={styles.questionText}>
        {question.text}
        {question.isRequired && <span className={styles.required}>*</span>}
        {!question.isRequired && <span className={styles.optionalTag}> (opcional)</span>}
      </p>
      {question.helpText && <p className={styles.helpText}>{question.helpText}</p>}

      {isChoice && (
        <div className={cn(styles.optionList, isMulti && styles.optionListMulti)}>
          {question.options.map((opt) => {
            const checked = answer.optionIds.includes(opt.id);
            const isNone = opt.value === 'nenhuma' || opt.value === 'sem_diag';
            return (
              <label key={opt.id} className={cn(styles.optionLabel, checked && styles.optionChecked)}>
                <input
                  type={isMulti ? 'checkbox' : 'radio'}
                  name={`q-${question.id}`}
                  checked={checked}
                  onChange={() => onOptionToggle(opt.id, isMulti, isNone)}
                />
                <span>{opt.label}</span>
              </label>
            );
          })}
        </div>
      )}

      {(question.type === 'NUMERIC' || question.type === 'TEXT') && (
        <Input
          as={question.type === 'TEXT' ? 'textarea' : undefined}
          type={question.type === 'NUMERIC' ? 'number' : undefined}
          value={answer.textValue}
          onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onTextChange(e.target.value)}
          placeholder={question.type === 'NUMERIC' ? 'Digite o valor...' : 'Digite sua resposta...'}
        />
      )}
    </div>
  );
}
