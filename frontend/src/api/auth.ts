import { get, post } from './http';
import type { RegisterInput, Session, StoreCodeStatus } from './types';
import { useAuth } from '@/store/auth';

/** Live check for the seller's public store link. Advisory only — the API
 *  re-validates and re-checks at registration, so this can never be the gate. */
export const checkStoreCode = (code: string, city?: string) =>
  get<StoreCodeStatus>('/api/v1/auth/store-code', { code, city: city ?? '' }, 'none');

export async function login(email: string, password: string) {
  const session = await post<Session>('/api/v1/auth/login', { email, password }, 'none');
  useAuth.getState().setSession(session);
  return session;
}

// Seller mobile verification. The trial is only issued against a number that
// answered an OTP, which is what stops one person farming trials.
export const sendSignupOtp = (phone: string) =>
  post<{ ok: boolean }>('/api/v1/auth/signup/otp', { phone }, 'none');

export const verifySignupOtp = (phone: string, code: string) =>
  post<{ phoneToken: string }>('/api/v1/auth/signup/otp/verify', { phone, code }, 'none');

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
