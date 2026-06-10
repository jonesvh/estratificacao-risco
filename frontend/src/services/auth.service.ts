import { api } from './api';

export async function login(email: string, password: string): Promise<{ email: string }> {
  const { data } = await api.post<{ user: { email: string } }>('/auth/login', { email, password });
  return data.user;
}

export async function logout(): Promise<void> {
  await api.post('/auth/logout');
}

export async function getMe(): Promise<{ email: string }> {
  const { data } = await api.get<{ user: { email: string } }>('/auth/me');
  return data.user;
}
