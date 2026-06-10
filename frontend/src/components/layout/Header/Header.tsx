import { LogOut, Menu } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../hooks/useAuth';
import { logout } from '../../../services/auth.service';
import styles from './Header.module.css';

interface HeaderProps {
  title: string;
  subtitle?: string;
  onMenuToggle: () => void;
}

export function Header({ title, subtitle, onMenuToggle }: HeaderProps) {
  const navigate = useNavigate();
  const { logout: clearAuth } = useAuth();

  async function handleLogout() {
    try { await logout(); } catch { /* ignore */ }
    clearAuth();
    navigate('/login', { replace: true });
  }

  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <button className={styles.menuBtn} onClick={onMenuToggle} aria-label="Abrir menu">
          <Menu size={20} />
        </button>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
      </div>
      <div className={styles.right}>
        <button className={styles.logoutBtn} onClick={handleLogout}>
          <LogOut size={15} />
          Sair
        </button>
      </div>
    </header>
  );
}
