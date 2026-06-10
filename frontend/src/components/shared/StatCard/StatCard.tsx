import { ReactNode } from 'react';
import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: number | string;
  sub?: string;
  icon: ReactNode;
}

export function StatCard({ label, value, sub, icon }: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.content}>
        <div className={styles.label}>{label}</div>
        <div className={styles.value}>{value}</div>
        {sub && <div className={styles.sub}>{sub}</div>}
      </div>
      <div className={styles.iconWrapper}>{icon}</div>
    </div>
  );
}
