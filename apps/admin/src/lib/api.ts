import { useAdminAuthStore } from '@/stores/auth';
import type { AuthPayload } from '@/types';

export const ADMIN_CLIENT_HEADERS: Record<string, string> = { 'X-KB-Client': 'admin' };

export class AdminApiError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = 'ERROR') {
    super(message);
    this.status = status;
    this.code = code;
  }
}

let refreshPromise: Promise<AuthPayload | null> | null = null;

export async function refreshAdminSession(): Promise<AuthPayload | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json', ...ADMIN_CLIENT_HEADERS },
      });
      if (!response.ok) {
        useAdminAuthStore.getState().clear();
        return null;
      }
      const payload = (await response.json()) as AuthPayload;
      if (payload.user?.role !== 'ADMIN') {
        useAdminAuthStore.getState().clear();
        return null;
      }
      useAdminAuthStore.getState().setSession(payload);
      return payload;
    } catch {
      useAdminAuthStore.getState().clear();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function bootstrapAdminSession(): Promise<boolean> {
  const state = useAdminAuthStore.getState();
  if (state.accessToken && state.user) {
    state.setReady(true);
    return true;
  }
  const payload = await refreshAdminSession();
  if (!payload) useAdminAuthStore.getState().setReady(true);
  return Boolean(payload);
}

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  noAuth?: boolean;
  noRefresh?: boolean;
}

async function parseError(response: Response): Promise<AdminApiError> {
  let message = 'هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵ بدەوە.';
  let code = 'ERROR';
  try {
    const body = (await response.json()) as { error?: { message?: string; code?: string } };
    if (body?.error?.message) message = body.error.message;
    if (body?.error?.code) code = body.error.code;
  } catch {
    // keep the default
  }
  if (response.status === 403 && !message) message = 'دەستگەیشتن ڕەتکرایەوە.';
  return new AdminApiError(response.status, message, code);
}

async function perform<T>(path: string, options: ApiOptions, retried = false): Promise<T> {
  const { body, noAuth, noRefresh, headers: extraHeaders, ...rest } = options;
  const { accessToken } = useAdminAuthStore.getState();
  const isFormData = body instanceof FormData;

  const headers = new Headers(extraHeaders);
  headers.set('Accept', 'application/json');
  headers.set('X-KB-Client', 'admin');
  if (!isFormData && body !== undefined) headers.set('Content-Type', 'application/json');
  if (!noAuth && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const request: RequestInit = { ...rest, headers, credentials: 'include' };
  if (body !== undefined) request.body = isFormData ? (body as FormData) : JSON.stringify(body);

  let response: Response;
  try {
    response = await fetch(path, request);
  } catch {
    throw new AdminApiError(0, 'پەیوەندی بە سێرڤەر نەکرا. دڵنیابە API چالاکە.');
  }

  if (response.status === 401 && !noAuth && !noRefresh && !retried) {
    const refreshed = await refreshAdminSession();
    if (refreshed) return perform<T>(path, { ...options, noRefresh: true }, true);
    useAdminAuthStore.getState().clear();
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export function adminApi<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  return perform<T>(path, options);
}

async function performBlob(path: string, retried = false): Promise<Blob> {
  const { accessToken } = useAdminAuthStore.getState();
  const headers = new Headers({ Accept: 'image/*,application/pdf', 'X-KB-Client': 'admin' });
  if (accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  let response: Response;
  try {
    response = await fetch(path, { headers, credentials: 'include' });
  } catch {
    throw new AdminApiError(0, 'پەیوەندی بە سێرڤەر نەکرا.');
  }

  if (response.status === 401 && !retried) {
    const refreshed = await refreshAdminSession();
    if (refreshed) return performBlob(path, true);
  }
  if (!response.ok) throw await parseError(response);
  return response.blob();
}

/** Fetches a private verification/receipt file with the admin bearer token. */
export function adminFileUrl(path: string): Promise<Blob> {
  return performBlob(path);
}

export async function adminLogin(identifier: string, password: string) {
  return adminApi<AuthPayload | { twoFactorRequired: true; challenge: string }>('/api/auth/login', {
    method: 'POST',
    body: { identifier, password },
    noAuth: true,
  });
}

export async function adminVerify2FA(challenge: string, code: string) {
  return adminApi<AuthPayload>('/api/auth/2fa/verify-login', {
    method: 'POST',
    body: { challenge, code },
    noAuth: true,
  });
}

export function adminLogoutRequest(): Promise<unknown> {
  return fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
    headers: ADMIN_CLIENT_HEADERS,
  }).catch(() => null);
}
