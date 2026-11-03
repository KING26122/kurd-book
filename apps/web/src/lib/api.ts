import { useAuthStore } from '@/stores/auth';
import type { ApiErrorShape, AuthPayload } from '@/types';

export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, message: string, code = 'ERROR', details?: unknown) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

let refreshPromise: Promise<AuthPayload | null> | null = null;

export function setSession(payload: AuthPayload) {
  useAuthStore.getState().setSession(payload);
}

export async function refreshAccessToken(): Promise<AuthPayload | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { Accept: 'application/json' },
      });
      if (!response.ok) {
        useAuthStore.getState().clear();
        return null;
      }
      const payload = (await response.json()) as AuthPayload;
      useAuthStore.getState().setSession(payload);
      return payload;
    } catch {
      useAuthStore.getState().clear();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

export async function bootstrapSession(): Promise<boolean> {
  const state = useAuthStore.getState();
  if (state.accessToken && state.user) {
    state.setReady(true);
    return true;
  }
  const payload = await refreshAccessToken();
  if (!payload) {
    useAuthStore.getState().setReady(true);
    return false;
  }
  return true;
}

interface ApiOptions extends Omit<RequestInit, 'body'> {
  body?: unknown;
  noAuth?: boolean;
  noRefresh?: boolean;
}

async function parseError(response: Response): Promise<ApiError> {
  let body: Partial<ApiErrorShape> | null = null;
  try {
    body = (await response.json()) as ApiErrorShape;
  } catch {
    // ignore
  }
  const message =
    body?.error?.message ||
    (response.status === 413
      ? 'فایلەکە زۆر گەورەیە.'
      : response.status === 429
        ? 'هەوڵەکان زۆر بوون. کەمێک چاوەڕوان بە.'
        : 'هەڵەیەک ڕوویدا. تکایە دووبارە هەوڵ بدەوە.');
  return new ApiError(response.status, message, body?.error?.code, body?.error?.details);
}

export async function api<T = unknown>(path: string, options: ApiOptions = {}): Promise<T> {
  const { body, noAuth, noRefresh, headers: extraHeaders, ...rest } = options;
  const { accessToken } = useAuthStore.getState();
  const isFormData = body instanceof FormData;

  const headers = new Headers(extraHeaders);
  if (!isFormData && body !== undefined) headers.set('Content-Type', 'application/json');
  headers.set('Accept', 'application/json');
  if (!noAuth && accessToken) headers.set('Authorization', `Bearer ${accessToken}`);

  const request: RequestInit = {
    ...rest,
    headers,
    credentials: 'include',
  };
  if (body !== undefined) {
    request.body = isFormData ? (body as FormData) : JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(path, request);
  } catch {
    throw new ApiError(0, 'پەیوەندی بە سێرڤەر نەکرا. ئینتەرنێتەکەت بپشکنە.');
  }

  if (response.status === 401 && !noAuth && !noRefresh) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return api<T>(path, { ...options, noRefresh: true } as ApiOptions);
    }
    useAuthStore.getState().clear();
  }

  if (!response.ok) throw await parseError(response);
  if (response.status === 204) return undefined as T;
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return (await response.text()) as T;
  }
  return (await response.json()) as T;
}

export function logoutRequest(): Promise<unknown> {
  return fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => null);
}
