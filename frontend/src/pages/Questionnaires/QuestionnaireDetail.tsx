import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Hash, BarChart2, BookOpen, Pencil } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell/AppShell';
import { Button } from '../../components/ui/Button/Button';
import { Badge } from '../../components/ui/Badge/Badge';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card/Card';
import { RiskBadge } from '../../components/shared/RiskBadge/RiskBadge';
import { Spinner } from '../../components/ui/Spinner/Spinner';
import { getQuestionnaire, deactivateQuestionnaire } from '../../services/questionnaires.service';
import type { RiskLevel } from '../../types';
import styles from './QuestionnaireDetail.module.css';

const QUESTION_TYPE_LABELS: Record<string, string> = {
  SINGLE_CHOICE: 'Escolha única', MULTIPLE_CHOICE: 'Múltipla escolha',
  BOOLEAN: 'Sim/Não', NUMERIC: 'Numérico', TEXT: 'Texto',
};

export function QuestionnaireDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: q, isLoading } = useQuery({
    queryKey: ['questionnaire', id],
    queryFn: () => getQuestionnaire(id!),
    enabled: !!id,
  });

  const deactivate = useMutation({
    mutationFn: () => deactivateQuestionnaire(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      queryClient.invalidateQueries({ queryKey: ['questionnaire', id] });
    },
  });

  if (isLoading) return <AppShell title="Questionário"><Spinner center size="xl" /></AppShell>;
  if (!q) return <AppShell title="Questionário"><p>Não encontrado.</p></AppShell>;

  return (
    <AppShell title={q.title} subtitle={`Versão ${q.version} · ${q._count?.questions ?? 0} perguntas`}>
      <div className={styles.header}>
        <div className={styles.headerLeft}>
          <div className={styles.titleRow}>
            <h2 className={styles.title}>{q.title}</h2>
            <Badge variant={q.isActive ? 'success' : 'neutral'} dot>{q.isActive ? 'Ativo' : 'Inativo'}</Badge>
          </div>
          {q.description && <p className={styles.meta}>{q.description}</p>}
          <div className={styles.metaRow}>
            <Hash size={12} className={styles.inlineIcon} /> {q._count?.questions ?? 0} perguntas &nbsp;·&nbsp;
            <BarChart2 size={12} className={styles.inlineIcon} /> {q._count?.responses ?? 0} aplicações
          </div>
        </div>
        <div className={styles.headerActions}>
          <Button variant="outline" leftIcon={<ArrowLeft size={15} />} onClick={() => navigate('/questionnaires')}>
            Voltar
          </Button>
          <Button variant="secondary" leftIcon={<Pencil size={15} />} onClick={() => navigate(`/questionnaires/${id}/edit`)}>
            Editar
          </Button>
          {q.isActive && (
            <Button variant="danger" loading={deactivate.isPending} onClick={() => deactivate.mutate()}>
              Desativar
            </Button>
          )}
        </div>
      </div>

      <div className={styles.grid}>
        <Card>
          <CardHeader><CardTitle>Classificação de Risco</CardTitle></CardHeader>
          <CardBody>
            <div className={styles.thresholds}>
              {q.riskConfig.thresholds.map((t) => (
                <div key={t.level} className={styles.thresholdRow}>
                  <RiskBadge level={t.level as RiskLevel} />
                  <div className={styles.thresholdRight}>
                    <div className={styles.thresholdName}>{t.label}</div>
                    <div className={styles.thresholdRange}>{t.max != null ? `${t.min} – ${t.max} pts` : `a partir de ${t.min} pts`}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><CardTitle>Resumo</CardTitle></CardHeader>
          <CardBody>
            <div className={styles.summaryList}>
              <div className={styles.summaryRow}>
                <span className={styles.summaryKey}>Dimensões</span>
                <strong>{q.dimensions?.length ?? 0}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryKey}>Perguntas</span>
                <strong>{q._count?.questions ?? 0}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span className={styles.summaryKey}>Aplicações</span>
                <strong>{q._count?.responses ?? 0}</strong>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle><BookOpen size={16} className={styles.inlineIcon} />Estrutura do Questionário</CardTitle>
        </CardHeader>
        <CardBody>
          <div className={styles.dimensionList}>
            {q.dimensions?.map((dim) => (
              <div key={dim.id} className={styles.dimCard}>
                <div className={styles.dimHeader}>
                  <span className={styles.dimName}>{dim.name}</span>
                  <span className={styles.dimWeight}>Peso: {dim.weight} · {dim.questions.length} perguntas</span>
                </div>
                <div className={styles.questionList}>
                  {dim.questions.map((question, qi) => (
                    <div key={question.id} className={styles.questionItem}>
                      <div className={styles.questionMeta}>
                        <Badge variant="info">{qi + 1}</Badge>
                        <span>{QUESTION_TYPE_LABELS[question.type]}</span>
                        {question.isRequired && <Badge variant="neutral">Obrigatória</Badge>}
                        <span>Peso: {question.weight}</span>
                      </div>
                      <p className={styles.questionText}>{question.text}</p>
                      {question.helpText && (
                        <p className={styles.helpItalic}>{question.helpText}</p>
                      )}
                      {question.options.length > 0 && (
                        <div className={styles.optionList}>
                          {question.options.map((opt) => (
                            <div key={opt.id} className={styles.optionItem}>
                              <span>{opt.label}</span>
                              <span className={styles.score}>{opt.score} pts</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </AppShell>
  );
}
