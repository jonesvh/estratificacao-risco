import { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode, forwardRef, type Ref } from 'react';
import { cn } from '../../../utils/cn';
import styles from './Input.module.css';

interface BaseProps {
  label?: string;
  error?: string;
  helper?: string;
  required?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

type InputProps = BaseProps &
  Omit<InputHTMLAttributes<HTMLInputElement>, 'required'> & {
    as?: 'input';
  };

type TextareaProps = BaseProps &
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'required'> & {
    as: 'textarea';
  };

type Props = InputProps | TextareaProps;

export const Input = forwardRef<HTMLInputElement | HTMLTextAreaElement, Props>(function Input(
  { label, error, helper, required, leftIcon, rightIcon, className, as: Tag = 'input', ...props },
  ref,
) {
  const inputClass = cn(
    styles.input,
    error && styles.error,
    !!leftIcon && styles.hasLeftIcon,
    !!rightIcon && styles.hasRightIcon,
    className,
  );

  return (
    <div className={styles.field}>
      {label && (
        <label className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      <div className={styles.wrapper}>
        {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
        {Tag === 'textarea' ? (
          <textarea
            ref={ref as Ref<HTMLTextAreaElement>}
            className={inputClass}
            {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          />
        ) : (
          <input
            ref={ref as Ref<HTMLInputElement>}
            className={inputClass}
            {...(props as InputHTMLAttributes<HTMLInputElement>)}
          />
        )}
        {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
      </div>
      {error && <span className={styles.errorMsg}>{error}</span>}
      {helper && !error && <span className={styles.helper}>{helper}</span>}
    </div>
  );
});
