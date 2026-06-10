import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  ClipboardCheck,
  Download,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../../utils/cn';
import { useAuth } from '../../../hooks/useAuth';
import logo from '../../../assets/logo.png';
import styles from './Sidebar.module.css';

const NAV_ITEMS = [
  {
    section: 'PRINCIPAL',
    links: [
      { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, extraPaths: [] },
      { to: '/beneficiaries', label: 'Beneficiários', icon: Users, extraPaths: [] },
      { to: '/questionnaires', label: 'Questionários', icon: ClipboardList, extraPaths: [] },
      { to: '/responses', label: 'Aplicações', icon: ClipboardCheck, extraPaths: [] },
    ],
  },
  {
    section: 'RELATÓRIOS',
    links: [{ to: '/export', label: 'Exportar XLSX', icon: Download, extraPaths: [] }],
  },
];

function NavItem({ to, label, icon: Icon, extraPaths, onClose }: {
  to: string;
  label: string;
  icon: LucideIcon;
  extraPaths: string[];
  onClose: () => void;
}) {
  const { pathname } = useLocation();
  const extraActive = extraPaths.some((p) => pathname.startsWith(p));
  return (
    <NavLink
      to={to}
      onClick={onClose}
      className={({ isActive }) => cn(styles.navItem, (isActive || extraActive) && styles.active)}
    >
      <Icon size={18} />
      {label}
    </NavLink>
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { email } = useAuth();
  const initial = email?.[0]?.toUpperCase() ?? 'A';

  return (
    <aside className={cn(styles.sidebar, isOpen && styles.open)}>
      <div className={styles.logoArea}>
        <NavLink to="/dashboard" className={styles.logoLink} onClick={onClose}>
          <img src={logo} alt="Logo" className={styles.logoImg} />
        </NavLink>
      </div>

      <nav className={styles.nav}>
        {NAV_ITEMS.map((section) => (
          <div key={section.section} className={styles.section}>
            <p className={styles.sectionTitle}>{section.section}</p>
            {section.links.map(({ to, label, icon, extraPaths }) => (
              <NavItem key={to} to={to} label={label} icon={icon} extraPaths={extraPaths} onClose={onClose} />
            ))}
          </div>
        ))}
      </nav>

      <div className={styles.footer}>
        <div className={styles.userInfo}>
          <div className={styles.avatar}>{initial}</div>
          <span className={styles.email}>{email}</span>
        </div>
      </div>
    </aside>
  );
}
