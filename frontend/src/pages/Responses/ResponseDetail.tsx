import type React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Pencil } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell/AppShell';
import { Button } from '../../components/ui/Button/Button';
import { Card, CardBody, CardHeader, CardTitle } from '../../components/ui/Card/Card';
import { RiskBadge } from '../../components/shared/RiskBadge/RiskBadge';
import { Spinner } from '../../components/ui/Spinner/Spinner';
import { getResponse } from '../../services/responses.service';
import { formatCPF, formatDateTime } from '../../utils/format';
import styles from './ResponseDetail.module.css';

export function ResponseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: r, isLoading } = useQuery({
    queryKey: ['response', id],
    queryFn: () => getResponse(id!),
    enabled: !!id,
  });

  if (isLoading) return <AppShell title="Resultado"><Spinner center size="xl" /></AppShell>;
  if (!r) return <AppShell title="Resultado"><p>Não encontrado.</p></AppShell>;

  return (
    <AppShell title="Resultado da Aplicação" subtitle={formatDateTime(r.appliedAt)}>
      <div className={styles.topBar}>
        <Button variant="outline" leftIcon={<ArrowLeft size={15} />} onClick={() => navigate('/responses')}>
          Voltar
        </Button>
        <Button variant="outline" leftIcon={<Pencil size={15} />}
          onClick={() => navigate(`/responses/apply?responseId=${r.id}`)}>
          Editar
        </Button>
      </div>

      <div className={styles.grid}>
        <div className={styles.resultCard}>
          <p className={styles.resultLabel}>Classificação de Risco</p>
          <RiskBadge level={r.riskLevel} large />
          <p className={styles.score}>{Number(r.totalScore).toFixed(2)} pts</p>
        </div>

        <Card>
          <CardHeader><CardTitle>Informações</CardTitle></CardHeader>
          <CardBody>
            <div className={styles.infoGrid}>
              <InfoItem label="Beneficiário" value={r.beneficiary.name} />
              <InfoItem label="CPF" value={formatCPF(r.beneficiary.cpf)} />
              <InfoItem label="Questionário" value={r.questionnaire.title} />
              <InfoItem label="Aplicado em" value={formatDateTime(r.appliedAt)} />
              <InfoItem label="Aplicado por" value={r.appliedBy.email} />
              {r.medicacoes && <InfoItem label="Medicações em uso" value={r.medicacoes} />}
              {r.notes && <InfoItem label="Observações clínicas" value={r.notes} />}
            </div>
          </CardBody>
        </Card>
      </div>

      {r.dimensionScores.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Pontuação por Dimensão</CardTitle></CardHeader>
          <CardBody>
            <div className={styles.dimensionScores}>
              {r.dimensionScores.map((ds) => (
                <div key={ds.id} className={styles.dimScoreRow}>
                  <div className={styles.dimScoreInfo}>
                    <span className={styles.dimName}>{ds.dimension.name}</span>
                    <span className={styles.dimScore}>{Number(ds.score).toFixed(2)} / {Number(ds.maxScore).toFixed(2)} pts</span>
                  </div>
                  <div className={styles.progressBar}>
                    <div className={styles.progressFill} style={{ '--fill-width': `${Math.min(Number(ds.percentage), 100)}%` } as React.CSSProperties} />
                  </div>
                  <span className={styles.dimPercent}>{Number(ds.percentage).toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      )}

      {r.answers && r.answers.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Respostas Detalhadas</CardTitle></CardHeader>
          <CardBody className={styles.noPadding}>
            {r.answers.map((a, i) => (
              <div key={a.id} className={styles.answerRow}>
                <div className={styles.answerNum}>{i + 1}</div>
                <div className={styles.answerContent}>
                  <p className={styles.answerQuestion}>{a.question.text}</p>
                  <p className={styles.answerValue}>
                    {a.selectedOptions.length > 0
                      ? a.selectedOptions.map((s) => s.option.label).join(', ')
                      : a.textValue ?? '—'}
                  </p>
                </div>
                <div className={styles.answerScore}>{Number(a.scoreSnapshot).toFixed(1)} pts</div>
              </div>
            ))}
          </CardBody>
        </Card>
      )}
    </AppShell>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.infoItem}>
      <span className={styles.infoLabel}>{label}</span>
      <span className={styles.infoValue}>{value}</span>
    </div>
  );
}
