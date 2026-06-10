import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Layers, Settings, HelpCircle } from 'lucide-react';
import { cn } from '../../utils/cn';
import { AppShell } from '../../components/layout/AppShell/AppShell';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Select } from '../../components/ui/Select/Select';
import { createQuestionnaire, type CreateQuestionnaireInput } from '../../services/questionnaires.service';
import { getErrorMessage } from '../../services/api';
import styles from './QuestionnaireNew.module.css';

const RISK_LEVELS = [
  { key: 'LOW', label: 'Baixo Risco', color: '#10B981' },
  { key: 'MEDIUM', label: 'Médio Risco', color: '#F59E0B' },
  { key: 'HIGH', label: 'Alto Risco', color: '#F97316' },
  { key: 'VERY_HIGH', label: 'Muito Alto Risco', color: '#EF4444' },
];

const QUESTION_TYPES = [
  { value: 'SINGLE_CHOICE', label: 'Escolha única' },
  { value: 'MULTIPLE_CHOICE', label: 'Múltipla escolha' },
  { value: 'BOOLEAN', label: 'Sim / Não' },
  { value: 'NUMERIC', label: 'Numérico' },
  { value: 'TEXT', label: 'Texto livre' },
];

const optionSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  score: z.coerce.number().default(0),
  orderIndex: z.number().default(0),
});

const questionSchema = z.object({
  text: z.string().min(1, 'Texto da pergunta obrigatório'),
  type: z.string().min(1),
  orderIndex: z.number().default(0),
  isRequired: z.boolean().default(true),
  helpText: z.string().optional(),
  options: z.array(optionSchema).optional(),
});

const dimensionSchema = z.object({
  name: z.string().min(1, 'Nome da dimensão obrigatório'),
  orderIndex: z.number().default(0),
  questions: z.array(questionSchema).min(1, 'Adicione ao menos uma pergunta'),
});

const schema = z.object({
  title: z.string().min(1, 'Título obrigatório'),
  description: z.string().optional(),
  riskConfig: z.object({
    thresholds: z.array(z.object({
      min: z.coerce.number(),
      max: z.coerce.number().nullable(),
      level: z.string(),
      label: z.string().min(1),
    })),
  }),
  dimensions: z.array(dimensionSchema).min(1, 'Adicione ao menos uma dimensão'),
});

type FormData = z.infer<typeof schema>;

export function QuestionnaireNewPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      riskConfig: {
        thresholds: RISK_LEVELS.map((r, i) => ({
          level: r.key, label: r.label,
          min: i * 10, max: i === RISK_LEVELS.length - 1 ? null : (i + 1) * 10 - 1,
        })),
      },
      dimensions: [{ name: '', orderIndex: 0, questions: [] }],
    },
  });

  const { fields: dimensions, append: addDimension, remove: removeDimension } = useFieldArray({ control, name: 'dimensions' });

  const mutation = useMutation({
    mutationFn: createQuestionnaire,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      navigate(`/questionnaires/${data.id}`);
    },
  });

  async function onSubmit(data: FormData) {
    const payload = {
      ...data,
      dimensions: data.dimensions.map((d, di) => ({
        ...d,
        weight: 1,
        orderIndex: di,
        questions: d.questions.map((q, qi) => ({
          ...q,
          weight: 1,
          orderIndex: qi,
          options: q.options?.map((o, oi) => ({ ...o, orderIndex: oi })),
        })),
      })),
    };
    mutation.mutate(payload as CreateQuestionnaireInput);
  }

  return (
    <AppShell title="Novo Questionário" subtitle="Preencha as informações abaixo">
      <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>

        {/* General Info */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}><Settings size={15} /> Informações Gerais</span>
          </div>
          <div className={styles.sectionBody}>
            <Input label="Título" required error={errors.title?.message} {...register('title')} placeholder="Ex: Estratificação Cardiovascular" />
            <Input as="textarea" label="Descrição (opcional)" {...register('description')} placeholder="Descreva o objetivo deste questionário..." />
          </div>
        </div>

        {/* Risk Config */}
        <div className={styles.section}>
          <div className={styles.sectionHeader}>
            <span className={styles.sectionTitle}><Settings size={15} /> Configuração de Risco</span>
          </div>
          <div className={styles.sectionBody}>
            <div className={styles.thresholdGrid}>
              {RISK_LEVELS.map((r, i) => (
                <div key={r.key} className={styles.thresholdCard}>
                  <span className={cn(styles.thresholdLabel, styles[`thresholdLabel${r.key}`])}>{r.label}</span>
                  <Input label="Label" {...register(`riskConfig.thresholds.${i}.label`)} />
                  <div className={styles.row}>
                    <Input label="Pontuação mín." type="number" {...register(`riskConfig.thresholds.${i}.min`)} />
                    {r.key !== 'VERY_HIGH' && (
                      <Input label="Pontuação máx." type="number" {...register(`riskConfig.thresholds.${i}.max`)} />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Dimensions */}
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
          </div>
        </div>

        {mutation.isError && (
          <p className={styles.errorText}>{getErrorMessage(mutation.error)}</p>
        )}

        <div className={styles.formActions}>
          <Button type="button" variant="outline" onClick={() => navigate('/questionnaires')}>Cancelar</Button>
          <Button type="submit" loading={mutation.isPending}>Criar Questionário</Button>
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
  errors: ReturnType<typeof useForm<FormData>>['formState']['errors'];
  onRemove: () => void;
}) {
  const { fields: questions, append: addQuestion, remove: removeQuestion } = useFieldArray({
    control, name: `dimensions.${dimIndex}.questions`,
  });

  return (
    <div className={styles.dimensionCard}>
      <div className={styles.dimensionHeader}>
        <div className={styles.dimRow}>
          <Input placeholder="Nome da dimensão" {...register(`dimensions.${dimIndex}.name`)}
            error={(errors.dimensions?.[dimIndex] as { name?: { message?: string } })?.name?.message} />
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}><Trash2 size={15} /></Button>
      </div>
      <div className={styles.dimensionBody}>
        {questions.map((q, qi) => (
          <QuestionBlock key={q.id} dimIndex={dimIndex} qIndex={qi} control={control}
            register={register} watch={watch} onRemove={() => removeQuestion(qi)} />
        ))}
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

function QuestionBlock({ dimIndex, qIndex, control, register, watch, onRemove }: {
  dimIndex: number;
  qIndex: number;
  control: ReturnType<typeof useForm<FormData>>['control'];
  register: ReturnType<typeof useForm<FormData>>['register'];
  watch: ReturnType<typeof useForm<FormData>>['watch'];
  onRemove: () => void;
}) {
  const { fields: options, append: addOption, remove: removeOption } = useFieldArray({
    control, name: `dimensions.${dimIndex}.questions.${qIndex}.options`,
  });

  const qType = watch(`dimensions.${dimIndex}.questions.${qIndex}.type`);
  const hasOptions = ['SINGLE_CHOICE', 'MULTIPLE_CHOICE', 'BOOLEAN'].includes(qType);

  return (
    <div className={styles.questionCard}>
      <div className={styles.questionHeader}>
        <span className={styles.questionNum}>P{qIndex + 1}</span>
        <Button type="button" variant="ghost" size="sm" onClick={onRemove}><Trash2 size={14} /></Button>
      </div>
      <Input placeholder="Texto da pergunta..." {...register(`dimensions.${dimIndex}.questions.${qIndex}.text`)} />
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
              <Input placeholder="Label" {...register(`dimensions.${dimIndex}.questions.${qIndex}.options.${oi}.label`)} />
              <Input placeholder="Valor" {...register(`dimensions.${dimIndex}.questions.${qIndex}.options.${oi}.value`)} />
              <Input placeholder="Score" type="number" step="0.5" {...register(`dimensions.${dimIndex}.questions.${qIndex}.options.${oi}.score`)} />
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
