import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Play, ClipboardList, Hash, BarChart2, Plus } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell/AppShell';
import { Button } from '../../components/ui/Button/Button';
import { Badge } from '../../components/ui/Badge/Badge';
import { Spinner } from '../../components/ui/Spinner/Spinner';
import { EmptyState } from '../../components/shared/EmptyState/EmptyState';
import { listQuestionnaires } from '../../services/questionnaires.service';
import { formatDate } from '../../utils/format';
import styles from './QuestionnaireList.module.css';

export function QuestionnaireListPage() {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['questionnaires', true],
    queryFn: () => listQuestionnaires(true),
  });

  return (
    <AppShell title="Questionários" subtitle="Inicie uma nova aplicação ou visualize o questionário">
      <div className={styles.topBar}>
        <span />
        <Button leftIcon={<Plus size={16} />} onClick={() => navigate('/questionnaires/new')}>
          Novo Questionário
        </Button>
      </div>
      {isLoading ? (
        <Spinner center size="lg" />
      ) : !data?.length ? (
        <EmptyState
          icon={<ClipboardList size={28} />}
          title="Nenhum questionário disponível"
          description="Nenhum questionário ativo encontrado."
        />
      ) : (
        <div className={styles.grid}>
          {data.map((q) => (
            <div key={q.id} className={styles.qCard} onClick={() => navigate(`/questionnaires/${q.id}`)}>
              <div className={styles.qCardHeader}>
                <h3 className={styles.qTitle}>{q.title}</h3>
                <Badge variant={q.isActive ? 'success' : 'neutral'} dot>
                  {q.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </div>

              {q.description && (
                <p className={styles.qDescription}>{q.description}</p>
              )}

              <div className={styles.qMeta}>
                <span className={styles.qMetaItem}>
                  <Hash size={13} />
                  {q._count?.questions ?? 0} perguntas
                </span>
                <span className={styles.qMetaItem}>
                  <BarChart2 size={13} />
                  {q._count?.responses ?? 0} aplicações
                </span>
              </div>

              <div className={styles.qFooter}>
                <span>v{q.version} · {formatDate(q.createdAt)}</span>
                <Button
                  size="sm"
                  leftIcon={<Play size={13} />}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/responses/apply?questionnaireId=${q.id}`);
                  }}
                >
                  Iniciar
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}
