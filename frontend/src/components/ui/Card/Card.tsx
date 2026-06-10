import { ReactNode } from 'react';
import { cn } from '../../../utils/cn';
import styles from './Card.module.css';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className }: CardProps) {
  return <div className={cn(styles.card, className)}>{children}</div>;
}

export function CardHeader({ children, className }: CardProps) {
  return <div className={cn(styles.header, className)}>{children}</div>;
}

export function CardTitle({ children, className }: CardProps) {
  return <h3 className={cn(styles.title, className)}>{children}</h3>;
}

export function CardBody({ children, className }: CardProps) {
  return <div className={cn(styles.body, className)}>{children}</div>;
}

export function CardFooter({ children, className }: CardProps) {
  return <div className={cn(styles.footer, className)}>{children}</div>;
}
