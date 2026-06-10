import { ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import styles from './Badge.module.css';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'orange';

interface BadgeProps {
  variant?: BadgeVariant;
  dot?: boolean;
  children: ReactNode;
  className?: string;
}

export function Badge({ variant = 'neutral', dot, children, className }: BadgeProps) {
  return (
    <span className={cn(styles.badge, styles[variant], className)}>
      {dot && <span className={styles.dot} />}
      {children}
    </span>
  );
}
