import { cn } from '../../../utils/cn';
import { RISK_LABELS } from '../../../utils/format';
import type { RiskLevel } from '../../../types';
import styles from './RiskBadge.module.css';

interface RiskBadgeProps {
  level: RiskLevel;
  large?: boolean;
}

export function RiskBadge({ level, large }: RiskBadgeProps) {
  return (
    <span className={cn(styles.badge, styles[level], large && styles.large)}>
      <span className={styles.dot} />
      {RISK_LABELS[level]}
    </span>
  );
}
