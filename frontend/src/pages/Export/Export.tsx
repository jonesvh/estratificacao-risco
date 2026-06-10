import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download, Info } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell/AppShell';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { Select } from '../../components/ui/Select/Select';
import { listQuestionnaires } from '../../services/questionnaires.service';
import { exportResponsesXlsx } from '../../services/export.service';
import type { RiskLevel } from '../../types';
import styles from './Export.module.css';

const RISK_OPTIONS = [
  { value: '', label: 'Todos os níveis' },
  { value: 'LOW', label: 'Baixo' },
  { value: 'MEDIUM', label: 'Médio' },
  { value: 'HIGH', label: 'Alto' },
  { value: 'VERY_HIGH', label: 'Muito Alto' },
];

const BASE_COLUMNS = [
  'Beneficiário', 'CPF', 'Questionário', 'Data Aplicação',
  'Pontuação Total', 'Classificação de Risco', 'Observações',
];

export function ExportPage() {
  const [questionnaireId, setQuestionnaireId] = useState('');
  const [riskLevel, setRiskLevel] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: questionnaires } = useQuery({
    queryKey: ['questionnaires', false],
    queryFn: () => listQuestionnaires(false),
  });

  const qOptions = [
    { value: '', label: 'Selecione um questionário...' },
    ...(questionnaires?.map((q) => ({ value: q.id, label: q.title })) ?? []),
  ];

  async function handleExport() {
    setLoading(true);
    setError('');
    try {
      await exportResponsesXlsx({
        questionnaireId: questionnaireId || undefined,
        riskLevel: riskLevel as RiskLevel || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
    } catch {
      setError('Erro ao gerar o arquivo. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Exportar XLSX" subtitle="Exporte os dados de aplicações em planilha">
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Filtros de Exportação</h2>
            <p className={styles.cardSubtitle}>
              Selecione um questionário para exportar. Nível de risco e datas são opcionais.
            </p>
          </div>

          <div className={styles.form}>
            <div className={styles.info}>
              <Info size={16} className={styles.infoIcon} />
              <span>
                O arquivo será gerado com as colunas abaixo. Para exportações grandes, o download pode levar alguns segundos.
              </span>
            </div>

            <div className={styles.columns}>
              {BASE_COLUMNS.map((col) => (
                <span key={col} className={styles.column}>{col}</span>
              ))}
              <span className={styles.column}>+ Uma coluna por pergunta</span>
            </div>

            <Select label="Questionário" options={qOptions} value={questionnaireId}
              onChange={(e) => setQuestionnaireId(e.target.value)} />

            <Select label="Nível de Risco" options={RISK_OPTIONS} value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value)} />

            <div className={styles.row}>
              <Input label="Data início" type="date" value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)} />
              <Input label="Data fim" type="date" value={dateTo}
                onChange={(e) => setDateTo(e.target.value)} />
            </div>

            {error && <p className={styles.errorText}>{error}</p>}
          </div>

          <div className={styles.footer}>
            <Button leftIcon={<Download size={16} />} loading={loading} disabled={!questionnaireId} onClick={handleExport}>
              {loading ? 'Gerando arquivo...' : 'Exportar XLSX'}
            </Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
