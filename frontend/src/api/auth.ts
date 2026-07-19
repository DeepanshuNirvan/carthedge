import { post } from './http';
import type { RegisterInput, Session } from './types';
import { useAuth } from '@/store/auth';

export async function login(email: string, password: string) {
  const session = await post<Session>('/api/v1/auth/login', { email, password }, 'none');
  useAuth.getState().setSession(session);
  return session;
}

export async function register(input: RegisterInput) {
  const session = await post<Session>('/api/v1/auth/register', input, 'none');
  useAuth.getState().setSession(session);
  return session;
}

export async function logout() {
  const { refreshToken, clear } = useAuth.getState();
  if (refreshToken) await post('/api/v1/auth/logout', { refreshToken }, 'none').catch(() => {});
  clear();
}

export const forgotPassword = (email: string) =>
  post<{ ok: boolean }>('/api/v1/auth/forgot-password', { email }, 'none');

export const resetPassword = (token: string, password: string) =>
  post<{ ok: boolean }>('/api/v1/auth/reset-password', { token, password }, 'none');
