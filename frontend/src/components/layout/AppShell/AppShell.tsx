import { ReactNode, useState } from 'react';
import { Sidebar } from '../Sidebar/Sidebar';
import { Header } from '../Header/Header';
import { cn } from '../../../utils/cn';
import styles from './AppShell.module.css';

interface AppShellProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
}

export function AppShell({ title, subtitle, children }: AppShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const close = () => setSidebarOpen(false);

  return (
    <div className={styles.shell}>
      <div
        className={cn(styles.backdrop, sidebarOpen && styles.backdropVisible)}
        onClick={close}
      />
      <Sidebar isOpen={sidebarOpen} onClose={close} />
      <div className={styles.main}>
        <Header
          title={title}
          subtitle={subtitle}
          onMenuToggle={() => setSidebarOpen((o) => !o)}
        />
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
