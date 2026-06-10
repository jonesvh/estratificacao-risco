import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Layers, Settings, HelpCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { AppShell } from '../../components/layout/AppShell/AppShell';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Select } from '../../components/ui/Select/Select';
import { Spinner } from '../../components/ui/Spinner/Spinner';
import { getQuestionnaire, updateQuestionnaireContent, type CreateQuestionnaireInput } from '../../services/questionnaires.service';
import { getErrorMessage } from '../../services/api';
import styles from './QuestionnaireNew.module.css';

const RISK_LEVELS = [
  { key: 'LOW', label: 'Baixo Risco' },
  { key: 'MEDIUM', label: 'Médio Risco' },
  { key: 'HIGH', label: 'Alto Risco' },
  { key: 'VERY_HIGH', label: 'Muito Alto Risco' },
];

const QUESTION_TYPES = [
  { value: 'SINGLE_CHOICE', label: 'Escolha única' },
  { value: 'MULTIPLE_CHOICE', label: 'Múltipla escolha' },
  { value: 'BOOLEAN', label: 'Sim / Não' },
  { value: 'NUMERIC', label: 'Numérico' },
  { value: 'TEXT', label: 'Texto livre' },
];

const optionSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1, 'Label obrigatório'),
  value: z.string().min(1, 'Valor obrigatório'),
  score: z.coerce.number().default(0),
  orderIndex: z.coerce.number().default(0),
});

const questionSchema = z.object({
  id: z.string().optional(),
  text: z.string().min(1, 'Texto da pergunta obrigatório'),
  type: z.string().min(1),
  orderIndex: z.coerce.number().default(0),
  isRequired: z.boolean().default(true),
  helpText: z.string().optional(),
  options: z.array(optionSchema).optional(),
});

const dimensionSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, 'Nome da dimensão obrigatório'),
  orderIndex: z.coerce.number().default(0),
  questions: z.array(questionSchema).min(1, 'Adicione ao menos uma pergunta'),
});

const schema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  description: z.string().optional(),
  riskConfig: z.object({
    thresholds: z.array(z.object({
      min: z.coerce.number(),
      max: z.coerce.number(),
      level: z.string(),
      label: z.string().min(1, 'Label obrigatório'),
    })),
  }),
  dimensions: z.array(dimensionSchema).min(1, 'Adicione ao menos uma dimensão'),
});

type FormData = z.infer<typeof schema>;
type FormErrors = ReturnType<typeof useForm<FormData>>['formState']['errors'];

export function QuestionnaireEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: q, isLoading } = useQuery({
    queryKey: ['questionnaire', id],
    queryFn: () => getQuestionnaire(id!),
    enabled: !!id,
  });

  const { register, control, handleSubmit, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      riskConfig: {
        thresholds: RISK_LEVELS.map((r, i) => ({
          level: r.key, label: r.label,
          min: i * 10, max: i === RISK_LEVELS.length - 1 ? 999 : (i + 1) * 10 - 1,
        })),
      },
      dimensions: [],
    },
  });

  useEffect(() => {
    if (!q) return;
    const thresholds = (q.riskConfig as { thresholds: Array<{ min: number; max: number; level: string; label: string }> }).thresholds;
    reset({
      title: q.title,
      description: q.description ?? '',
      riskConfig: { thresholds },
      dimensions: (q.dimensions ?? []).map((dim) => ({
        id: dim.id,
        name: dim.name,
        orderIndex: dim.orderIndex,
        questions: dim.questions.map((question) => ({
          id: question.id,
          text: question.text,
          type: question.type,
          orderIndex: question.orderIndex,
          isRequired: question.isRequired,
          helpText: question.helpText ?? '',
          options: question.options.map((opt) => ({
            id: opt.id,
            label: opt.label,
            value: opt.value,
            score: Number(opt.score),
            orderIndex: opt.orderIndex,
          })),
        })),
      })),
    });
  }, [q, reset]);

  const { fields: dimensions, append: addDimension, remove: removeDimension } = useFieldArray({ control, name: 'dimensions' });

  const mutation = useMutation({
    mutationFn: (data: CreateQuestionnaireInput) => updateQuestionnaireContent(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      queryClient.invalidateQueries({ queryKey: ['questionnaire', id] });
      navigate('/questionnaires');
    },
  });

  function onSubmit(data: FormData) {
    const payload = {
      ...data,
      dimensions: data.dimensions.map((d, di) => ({
        ...d,
        weight: 1,
        orderIndex: di,
        questions: d.questions.map((question, qi) => ({
          ...question,
          weight: 1,
          orderIndex: qi,
          options: question.options?.map((o, oi) => ({ ...o, orderIndex: oi })),
        })),
      })),
    };
    mutation.mutate(payload as CreateQuestionnaireInput);
  }

  if (isLoading) return <AppShell title="Editar Questionário"><Spinner center size="xl" /></AppShell>;
  if (!q) return <AppShell title="Editar Questionário"><p>Questionário não encontrado.</p></AppShell>;

  return (
    <AppShell title="Editar Questionário" subtitle={q.title}>
      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}><Settings size={15} /> Informações Gerais</span>
          </div>
          <div className={styles.sectionBody}>
            <Input label="Título" required error={errors.title?.message} {...register('title')} placeholder="Ex: Estratificação Cardiovascular" />
            <Input as="textarea" label="Descrição (opcional)" {...register('description')} placeholder="Descreva o objetivo deste questionário..." />
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}><Settings size={15} /> Configuração de Risco</span>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.thresholdGrid}>
              {RISK_LEVELS.map((r, i) => (
                <div key={r.key} className={styles.thresholdCard}>
                  <span className={cn(styles.thresholdLabel, styles[`thresholdLabel${r.key}`])}>{r.label}</span>
                  <Input label="Label" error={errors.riskConfig?.thresholds?.[i]?.label?.message} {...register(`riskConfig.thresholds.${i}.label`)} />
                  <div className={styles.row}>
                    <Input label="Pontuação mín." type="number" {...register(`riskConfig.thresholds.${i}.min`)} />
                    <Input label="Pontuação máx." type="number" {...register(`riskConfig.thresholds.${i}.max`)} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}><Layers size={15} /> Dimensões e Perguntas</span>
            <Button type="button" variant="secondary" size="sm" leftIcon={<Plus size={14} />}
              onClick={() => addDimension({ name: '', orderIndex: dimensions.length, questions: [] })}>
              Dimensão
            </Button>
          </div>
          <div className={styles.sectionBody}>
            {dimensions.map((dim, di) => (
              <DimensionBlock key={dim.id} dimIndex={di} control={control} register={register} watch={watch}
                errors={errors} onRemove={() => removeDimension(di)} />
            ))}
            {dimensions.length === 0 && (
              <p className={styles.emptyDimensions}>Clique em "Dimensão" para adicionar.</p>
            )}
            {errors.dimensions?.root?.message && (
              <p className={styles.errorText}>{errors.dimensions.root.message}</p>
            )}
          </div>
        </div>

        {mutation.isError && (
          <p className={styles.errorText}>{getErrorMessage(mutation.error)}</p>
        )}

        <div className={styles.formActions}>
          <Button type="button" variant="outline" onClick={() => navigate('/questionnaires')}>Cancelar</Button>
          <Button type="submit" loading={mutation.isPending}>Salvar Alterações</Button>
        </div>
      </form>
    </AppShell>
  );
}

function DimensionBlock({ dimIndex, control, register, watch, errors, onRemove }: {
  dimIndex: number;
  control: ReturnType<typeof useForm<FormData>>['control'];
  register: ReturnType<typeof useForm<FormData>>['register'];
  watch: ReturnType<typeof useForm<FormData>>['watch'];
  errors: FormErrors;
  onRemove: () => void;
}) {
  const { fields: questions, append: addQuestion, remove: removeQuestion } = useFieldArray({
    control, name: `dimensions.${dimIndex}.questions`,
  });

  const dimErrors = errors.dimensions?.[dimIndex] as {
    name?: { message?: string };
    questions?: { root?: { message?: string }; message?: string };
  } | undefined;

  return (
    <div className={styles.dimensionCard}>
      <div className={styles.dimensionHeader}>
        <div className={styles.dimRow}>
          <Input placeholder="Nome da dimensão" {...register(`dimensions.${dimIndex}.name`)}
            error={dimErrors?.name?.message} />
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}><Trash2 size={15} /></Button>
      </div>
      <div className={styles.dimensionBody}>
        {questions.map((q, qi) => (
          <QuestionBlock key={q.id} dimIndex={dimIndex} qIndex={qi} control={control}
            register={register} watch={watch} errors={errors} onRemove={() => removeQuestion(qi)} />
        ))}
        {(dimErrors?.questions as { message?: string } | undefined)?.message && (
          <p className={styles.errorText}>{(dimErrors?.questions as { message?: string }).message}</p>
        )}
        <div className={styles.addActions}>
          <Button type="button" variant="outline" size="sm" leftIcon={<Plus size={13} />}
            onClick={() => addQuestion({ text: '', type: 'SINGLE_CHOICE', orderIndex: questions.length, isRequired: true, options: [] })}>
            Pergunta
          </Button>
        </div>
      </div>
    </div>
  );
}

function QuestionBlock({ dimIndex, qIndex, control, register, watch, errors, onRemove }: {
  dimIndex: number;
  qIndex: number;
  control: ReturnType<typeof useForm<FormData>>['control'];
  register: ReturnType<typeof useForm<FormData>>['register'];
  watch: ReturnType<typeof useForm<FormData>>['watch'];
  errors: FormErrors;
  onRemove: () => void;
}) {
  const { fields: options, append: addOption, remove: removeOption } = useFieldArray({
    control, name: `dimensions.${dimIndex}.questions.${qIndex}.options`,
  });

  const qType = watch(`dimensions.${dimIndex}.questions.${qIndex}.type`);
  const hasOptions = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'BOOLEAN'].includes(qType);

  const qErrors = (errors.dimensions?.[dimIndex] as {
    questions?: Array<{
      text?: { message?: string };
      weight?: { message?: string };
      options?: Array<{ label?: { message?: string }; value?: { message?: string } }>;
    }>;
  })?.questions?.[qIndex];

  return (
    <div className={styles.questionCard}>
      <div className={styles.questionHeader}>
        <span className={styles.questionNum}>P{qIndex + 1}</span>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}><Trash2 size={14} /></Button>
      </div>
      <Input placeholder="Texto da pergunta..." error={qErrors?.text?.message}
        {...register(`dimensions.${dimIndex}.questions.${qIndex}.text`)} />
      <div className={styles.row3}>
        <Controller control={control} name={`dimensions.${dimIndex}.questions.${qIndex}.type`}
          render={({ field }) => (
            <Select label="Tipo" options={QUESTION_TYPES} {...field} />
          )} />
        <label className={styles.checkRow}>
          <input type="checkbox" {...register(`dimensions.${dimIndex}.questions.${qIndex}.isRequired`)} />
          Obrigatória
        </label>
      </div>
      <Input placeholder="Texto de ajuda (opcional)" leftIcon={<HelpCircle size={14} />}
        {...register(`dimensions.${dimIndex}.questions.${qIndex}.helpText`)} />

      {hasOptions && (
        <div className={styles.optionsContainer}>
          <p className={styles.optionsLabel}>OPÇÕES</p>
          {options.map((opt, oi) => (
            <div key={opt.id} className={styles.optionRow}>
              <Input placeholder="Label" error={qErrors?.options?.[oi]?.label?.message}
                {...register(`dimensions.${dimIndex}.questions.${qIndex}.options.${oi}.label`)} />
              <Input placeholder="Valor" error={qErrors?.options?.[oi]?.value?.message}
                {...register(`dimensions.${dimIndex}.questions.${qIndex}.options.${oi}.value`)} />
              <Input placeholder="Score" type="number" step="0.5"
                {...register(`dimensions.${dimIndex}.questions.${qIndex}.options.${oi}.score`)} />
              <Button type="button" variant="ghost" size="sm" onClick={() => removeOption(oi)}><Trash2 size={13} /></Button>
            </div>
          ))}
          <Button type="button" variant="ghost" size="sm" leftIcon={<Plus size={12} />}
            onClick={() => addOption({ label: '', value: String(options.length), score: 0, orderIndex: options.length })}>
            Opção
          </Button>
        </div>
      )}
    </div>
  );
}
