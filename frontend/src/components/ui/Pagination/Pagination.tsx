import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../../utils/cn';
import styles from './Pagination.module.css';

interface PaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, totalPages, total, limit, onPageChange }: PaginationProps) {
  const from = Math.min((page - 1) * limit + 1, total);
  const to = Math.min(page * limit, total);

  const pages: (number | 'ellipsis')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (page > 3) pages.push('ellipsis');
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
    if (page < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
  }

  return (
    <div className={styles.wrapper}>
      <span>Mostrando {from}–{to} de {total}</span>
      <div className={styles.controls}>
        <button className={styles.btn} disabled={page === 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft size={16} />
        </button>
        {pages.map((p, i) =>
          p === 'ellipsis' ? (
            <span key={`e${i}`} className={styles.ellipsis}>…</span>
          ) : (
            <button
              key={p}
              className={cn(styles.btn, p === page && styles.active)}
              onClick={() => onPageChange(p)}
            >
              {p}
            </button>
          ),
        )}
        <button className={styles.btn} disabled={page === totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
