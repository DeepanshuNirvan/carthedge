import { useAuth } from '@/store/auth';
import { useAdminAuth } from '@/store/adminAuth';
import { activeSupport, useSupport } from '@/store/support';
import { useUi } from '@/store/ui';
import type { Tokens } from './types';

const base = import.meta.env.VITE_API_BASE_URL || '';

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(status: number, message: string, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

type RequestOptions = {
  method?: string;
  body?: unknown;
  formData?: FormData;
  auth?: 'seller' | 'admin' | 'none';
  query?: Record<string, string | number | boolean | undefined>;
};

let refreshing: Promise<boolean> | null = null;

async function refreshSellerToken(): Promise<boolean> {
  refreshing ||= (async () => {
    const { refreshToken, setTokens, clear } = useAuth.getState();
    if (!refreshToken) return false;
    try {
      const res = await fetch(`${base}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!res.ok) throw new Error();
      const tokens = (await res.json()) as Tokens;
      setTokens(tokens.accessToken, tokens.refreshToken);
      return true;
    } catch {
      clear();
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, formData, auth = 'seller', query } = opts;

  let url = base + path;
  if (query) {
    const qs = new URLSearchParams();
    for (const [k, val] of Object.entries(query)) {
      if (val !== undefined && val !== '') qs.set(k, String(val));
    }
    const s = qs.toString();
    if (s) url += `?${s}`;
  }

  const doFetch = () => {
    const headers: Record<string, string> = {};
    if (!formData) headers['Content-Type'] = 'application/json';
    if (auth === 'seller') {
      // an admin's read-only support view uses its own short-lived token
      const token = activeSupport()?.accessToken ?? useAuth.getState().accessToken;
      if (token) headers.Authorization = `Bearer ${token}`;
    } else if (auth === 'admin') {
      const token = useAdminAuth.getState().accessToken;
      if (token) headers.Authorization = `Bearer ${token}`;
    }
    return fetch(url, { method, headers, body: formData ?? (body ? JSON.stringify(body) : undefined) });
  };

  let res = await doFetch();

  // silent refresh + replay, sellers only (a support view has nothing to refresh)
  const support = auth === 'seller' && !!activeSupport();
  if (res.status === 401 && auth === 'seller' && !support && (await refreshSellerToken())) {
    res = await doFetch();
  }

  if (!res.ok) {
    let message = res.statusText;
    let code: string | undefined;
    try {
      const data = await res.json();
      message = data.error || message;
      code = data.code;
    } catch {
      // non-JSON error body
    }
    if (res.status === 401 && auth === 'seller') {
      if (support) useSupport.getState().end();
      else useAuth.getState().clear();
    }
    if (res.status === 401 && auth === 'admin') useAdminAuth.getState().clear();
    if (res.status === 402 && code === 'subscriptionExpired') useUi.getState().setPaywall(true);
    // suspension is not a billing problem: sign out, and login explains it
    if (res.status === 403 && code === 'accountSuspended') useAuth.getState().clear();
    if (res.status === 403 && code === 'accountDeleted') useUi.getState().setAccountDeleted(true);
    if (res.status === 403 && code === 'readOnly') message = 'This is a read-only support view.';
    if (res.status === 429) message = 'Too many attempts, take a breath and retry in a minute.';
    throw new ApiError(res.status, message, code);
  }
  return res.json() as Promise<T>;
}

export const get = <T>(path: string, query?: RequestOptions['query'], auth?: RequestOptions['auth']) =>
  request<T>(path, { query, auth });
export const post = <T>(path: string, body?: unknown, auth?: RequestOptions['auth']) =>
  request<T>(path, { method: 'POST', body, auth });
export const put = <T>(path: string, body?: unknown, auth?: RequestOptions['auth']) =>
  request<T>(path, { method: 'PUT', body, auth });
export const patch = <T>(path: string, body?: unknown, auth?: RequestOptions['auth']) =>
  request<T>(path, { method: 'PATCH', body, auth });
export const del = <T>(path: string, auth?: RequestOptions['auth']) =>
  request<T>(path, { method: 'DELETE', auth });
