import { Menu } from 'lucide-react';
import styles from './Header.module.css';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuToggle: () => void;
}

export function Header({ title, subtitle, onMenuToggle }: HeaderProps) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onMenuToggle} aria-label="Abrir menu">
          <Menu size={20} />
        </button>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>
    </header>
  );
}
