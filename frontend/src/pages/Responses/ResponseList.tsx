import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Plus, FileCheck } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell/AppShell';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Select } from '../../components/ui/Select/Select';
import { Table } from '../../components/ui/Table/Table';
import { Pagination } from '../../components/ui/Pagination/Pagination';
import { Spinner } from '../../components/ui/Spinner/Spinner';
import { RiskBadge } from '../../components/shared/RiskBadge/RiskBadge';
import { EmptyState } from '../../components/shared/EmptyState/EmptyState';
import { listResponses } from '../../services/responses.service';
import { listQuestionnaires } from '../../services/questionnaires.service';
import { formatCPF, formatDateTime } from '../../utils/format';
import type { QuestionnaireResponse, RiskLevel } from '../../types';
import styles from './ResponseList.module.css';

const RISK_OPTIONS = [
  { value: '', label: 'Todos os riscos' },
  { value: 'LOW', label: 'Baixo' }, { value: 'MEDIUM', label: 'Médio' },
  { value: 'HIGH', label: 'Alto' }, { value: 'VERY_HIGH', label: 'Muito Alto' },
];

const PLAN_TYPE_FILTER_OPTIONS = [
  { value: '', label: 'Todos os planos' },
  { value: 'Empresarial', label: 'Empresarial' },
  { value: 'Fisica', label: 'Física' },
  { value: 'Adesao', label: 'Adesão' },
];

export function ResponseListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [riskLevel, setRiskLevel] = useState('');
  const [questionnaireId, setQuestionnaireId] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [beneficiarySearch, setBeneficiarySearch] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [planCode, setPlanCode] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['responses', page, riskLevel, questionnaireId, dateFrom, dateTo, beneficiarySearch, municipio, planCode],
    queryFn: () => listResponses({
      page, limit: 20,
      riskLevel: riskLevel as RiskLevel || undefined,
      questionnaireId: questionnaireId || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      beneficiarySearch: beneficiarySearch || undefined,
      municipio: municipio || undefined,
      planCode: planCode || undefined,
    }),
  });

  const { data: questionnaires } = useQuery({
    queryKey: ['questionnaires', true],
    queryFn: () => listQuestionnaires(true),
  });

  const qOptions = [
    { value: '', label: 'Todos os questionários' },
    ...(questionnaires?.map((q) => ({ value: q.id, label: q.title })) ?? []),
  ];

  const columns = [
    { key: 'name', header: 'Beneficiário', render: (r: QuestionnaireResponse) => r.beneficiary.name },
    { key: 'cpf', header: 'CPF', render: (r: QuestionnaireResponse) => formatCPF(r.beneficiary.cpf) },
    { key: 'questionnaire', header: 'Questionário', render: (r: QuestionnaireResponse) => r.questionnaire.title },
    { key: 'appliedAt', header: 'Data', render: (r: QuestionnaireResponse) => formatDateTime(r.appliedAt) },
    { key: 'totalScore', header: 'Score', render: (r: QuestionnaireResponse) => Number(r.totalScore).toFixed(2) },
    { key: 'riskLevel', header: 'Risco', render: (r: QuestionnaireResponse) => <RiskBadge level={r.riskLevel} /> },
  ];

  return (
    <AppShell title="Aplicações" subtitle="Histórico de questionários aplicados">
      <div className={styles.topBar}>
        <div className={styles.filters}>
          <div className={styles.filterItem}>
            <Input label="Beneficiário (nome ou CPF)" value={beneficiarySearch}
              onChange={(e) => { setBeneficiarySearch(e.target.value); setPage(1); }}
              placeholder="Buscar..." />
          </div>
          <div className={styles.filterItem}>
            <Select label="Questionário" options={qOptions} value={questionnaireId}
              onChange={(e) => { setQuestionnaireId(e.target.value); setPage(1); }} />
          </div>
          <div className={styles.filterItem}>
            <Select label="Nível de Risco" options={RISK_OPTIONS} value={riskLevel}
              onChange={(e) => { setRiskLevel(e.target.value); setPage(1); }} />
          </div>
          <div className={styles.filterItem}>
            <Input label="Data início" type="date" value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} />
          </div>
          <div className={styles.filterItem}>
            <Input label="Data fim" type="date" value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(1); }} />
          </div>
          <div className={styles.filterItem}>
            <Input label="Município" value={municipio} placeholder="Filtrar por município..."
              onChange={(e) => { setMunicipio(e.target.value); setPage(1); }} />
          </div>
          <div className={styles.filterItem}>
            <Select label="Tipo de Plano" options={PLAN_TYPE_FILTER_OPTIONS} value={planCode}
              onChange={(e) => { setPlanCode(e.target.value); setPage(1); }} />
          </div>
        </div>
        <Button leftIcon={<Plus size={16} />} onClick={() => navigate('/responses/apply')}>
          Nova Aplicação
        </Button>
      </div>

      {isLoading ? <Spinner center size="lg" /> : !data?.data.length ? (
        <EmptyState icon={<FileCheck size={28} />} title="Nenhuma aplicação encontrada"
          description="Aplique um questionário para começar." />
      ) : (
        <>
          <Table columns={columns} data={data.data} keyExtractor={(r) => r.id}
            onRowClick={(r) => navigate(`/responses/${r.id}`)} />
          <Pagination page={data.meta.page} totalPages={data.meta.totalPages}
            total={data.meta.total} limit={data.meta.limit} onPageChange={setPage} />
        </>
      )}
    </AppShell>
  );
}
