import { cn } from '../../../utils/cn';
import styles from './Spinner.module.css';

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  center?: boolean;
  className?: string;
}

export function Spinner({ size = 'md', center, className }: SpinnerProps) {
  const spinner = <span className={cn(styles.spinner, styles[size], className)} aria-label="Carregando" />;
  if (center) return <div className={styles.center}>{spinner}</div>;
  return spinner;
}
