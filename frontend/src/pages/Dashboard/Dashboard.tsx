import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Users, Activity, CalendarCheck, BarChart3 } from 'lucide-react';
import { cn } from '../../utils/cn';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { AppShell } from '../../components/layout/AppShell/AppShell';
import { StatCard } from '../../components/shared/StatCard/StatCard';
import { RiskBadge } from '../../components/shared/RiskBadge/RiskBadge';
import { Card, CardBody } from '../../components/ui/Card/Card';
import { Table } from '../../components/ui/Table/Table';
import { Spinner } from '../../components/ui/Spinner/Spinner';
import { getDashboardSummary, getRecentResponses } from '../../services/dashboard.service';
import { formatDateTime, formatCPF, RISK_LABELS } from '../../utils/format';
import type { QuestionnaireResponse, RiskLevel } from '../../types';
import styles from './Dashboard.module.css';

const RISK_COLORS: Record<RiskLevel, string> = {
  LOW: '#10B981',
  MEDIUM: '#F59E0B',
  HIGH: '#F97316',
  VERY_HIGH: '#EF4444',
};

const RECENT_COLUMNS = [
  { key: 'beneficiary', header: 'Beneficiário', render: (r: QuestionnaireResponse) => r.beneficiary.name },
  { key: 'cpf', header: 'CPF', render: (r: QuestionnaireResponse) => formatCPF(r.beneficiary.cpf) },
  { key: 'questionnaire', header: 'Questionário', render: (r: QuestionnaireResponse) => r.questionnaire.title },
  { key: 'appliedAt', header: 'Data', render: (r: QuestionnaireResponse) => formatDateTime(r.appliedAt) },
  { key: 'riskLevel', header: 'Risco', render: (r: QuestionnaireResponse) => <RiskBadge level={r.riskLevel} /> },
];

export function DashboardPage() {
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: getDashboardSummary,
  });

  const { data: recent, isLoading: loadingRecent } = useQuery({
    queryKey: ['dashboard-recent'],
    queryFn: getRecentResponses,
  });

  const riskData = summary
    ? (Object.entries(summary.riskDistribution) as [RiskLevel, number][])
        .filter(([, v]) => v > 0)
        .map(([level, count]) => ({ name: RISK_LABELS[level], value: count, level }))
    : [];

  return (
    <AppShell title="Dashboard" subtitle={today}>
      <div className={styles.statsGrid}>
        {loadingSummary ? (
          <Spinner center />
        ) : summary ? (
          <>
            <StatCard label="Total de Beneficiários" value={summary.beneficiaries.total} icon={<Users size={22} />} />
            <StatCard label="Beneficiários Ativos" value={summary.beneficiaries.active} icon={<Users size={22} />} />
            <StatCard label="Total de Aplicações" value={summary.responses.total} icon={<Activity size={22} />} />
            <StatCard label="Aplicações este mês" value={summary.responses.thisMonth} icon={<CalendarCheck size={22} />} />
          </>
        ) : null}
      </div>

      <div className={styles.chartsRow}>
        <Card>
          <CardBody>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Distribuição de Risco</h3>
              <BarChart3 size={18} color="var(--color-text-muted)" />
            </div>
            {riskData.length === 0 ? (
              <p className={styles.emptyChart}>Nenhuma aplicação registrada</p>
            ) : (
              <div className={styles.chartContainer}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={riskData} cx="40%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={3}>
                      {riskData.map((entry) => (
                        <Cell key={entry.level} fill={RISK_COLORS[entry.level as RiskLevel]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className={styles.legendList}>
              {riskData.map((item) => (
                <div key={item.level} className={styles.legendItem}>
                  <div className={styles.legendLeft}>
                    <span className={cn(styles.legendDot, styles[`legendDot${item.level}`])} />
                    <span>{item.name}</span>
                  </div>
                  <span className={styles.legendCount}>{item.value}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <div className={styles.cardHeader}>
              <h3 className={styles.cardTitle}>Aplicações Recentes</h3>
            </div>
            {loadingRecent ? (
              <Spinner center />
            ) : (
              <Table
                columns={RECENT_COLUMNS}
                data={recent ?? []}
                keyExtractor={(r) => r.id}
                onRowClick={(r) => navigate(`/responses/${r.id}`)}
              />
            )}
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}
