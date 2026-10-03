import { get, post, put, request } from './http';
import type { RegisterInput, Session, StoreCodeStatus, Tokens } from './types';
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

/** New password; every other device is signed out and this one keeps going. */
export async function changePassword(currentPassword: string, newPassword: string) {
  const t = await put<Tokens>('/api/v1/auth/password', { currentPassword, newPassword });
  useAuth.getState().setTokens(t.accessToken, t.refreshToken);
}

export async function signOutOtherDevices() {
  const t = await post<Tokens>('/api/v1/auth/sessions/revoke');
  useAuth.getState().setTokens(t.accessToken, t.refreshToken);
}

/** Downloads everything the seller keeps in CartHedge as one JSON file. */
export async function downloadExport() {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  const token = useAuth.getState().accessToken;
  const res = await fetch(`${base}/api/v1/account/export`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(res.status === 429 ? 'Try again in a while — exports are limited to a few an hour.' : 'Export failed');
  const blob = await res.blob();
  const name = res.headers.get('content-disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'carthedge-export.json';
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: name });
  a.click();
  URL.revokeObjectURL(a.href);
}

export const deleteAccount = (password: string, confirm: string) =>
  request<{ ok: boolean }>('/api/v1/account/delete', { method: 'POST', body: { password, confirm } });

export const restoreAccount = () => post<{ ok: boolean }>('/api/v1/account/restore');
