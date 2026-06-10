import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle } from 'lucide-react';
import { login } from '../../services/auth.service';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../../components/ui/Input/Input';
import { Button } from '../../components/ui/Button/Button';
import { getErrorMessage } from '../../services/api';
import logo from '../../assets/logo.png';
import styles from './Login.module.css';

const schema = z.object({
  email: z.string().email('E-mail inválido'),
  password: z.string().min(1, 'Senha obrigatória'),
});

type FormData = z.infer<typeof schema>;

export function LoginPage() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const [apiError, setApiError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  async function onSubmit(data: FormData) {
    setApiError('');
    try {
      const user = await login(data.email, data.password);
      setUser(user.email);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setApiError(getErrorMessage(err));
    }
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logoArea}>
          <img src={logo} alt="Logo" className={styles.logo} />
          <div className={styles.heading}>
            <h1 className={styles.title}>Estratificação de Risco</h1>
            <p className={styles.subtitle}>Faça login para continuar</p>
          </div>
        </div>

        <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
          {apiError && (
            <div className={styles.error}>
              <AlertCircle size={16} />
              {apiError}
            </div>
          )}

          <Input
            label="E-mail"
            type="email"
            placeholder="admin@empresa.com"
            required
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Senha"
            type="password"
            placeholder="••••••••"
            required
            error={errors.password?.message}
            {...register('password')}
          />

          <Button type="submit" fullWidth loading={isSubmitting} size="lg">
            Entrar
          </Button>
        </form>

        <p className={styles.footer}>Sistema de uso exclusivo para administradores</p>
      </div>
    </div>
  );
}
