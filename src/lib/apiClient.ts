import { supabase } from './supabase';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  ok?: boolean;
}

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function getAuthToken(): Promise<string> {
  try {
    const { data } = await supabase.auth.getSession();
    return data?.session?.access_token || '';
  } catch (err) {
    console.warn('[apiClient] Error obteniendo sesión de Supabase:', err);
    return '';
  }
}

export async function fetchAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

async function request<T = any>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  const config: RequestInit = {
    ...options,
    headers,
  };

  const response = await fetch(url, config);

  if (response.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      console.warn('[apiClient] 401 Unauthorized detectado. Redirigiendo a login...');
      try {
        localStorage.removeItem('schoolos-auth');
        localStorage.removeItem('schoolos-user');
      } catch (_) {}
      window.location.replace('/login?redirect=' + encodeURIComponent(window.location.pathname));
    }
    throw new ApiError('Sesión no autorizada o expirada.', 401);
  }

  let payload: any = null;
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch (_) {
      payload = null;
    }
  } else {
    payload = await response.text();
  }

  if (!response.ok) {
    const errorMessage =
      (payload && typeof payload === 'object' && (payload.error || payload.message)) ||
      `Error HTTP ${response.status}: ${response.statusText}`;
    throw new ApiError(errorMessage, response.status, payload);
  }

  return payload as T;
}

export const apiClient = {
  get<T = any>(url: string, headers?: HeadersInit): Promise<T> {
    return request<T>(url, { method: 'GET', headers });
  },

  post<T = any>(url: string, body?: any, headers?: HeadersInit): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request<T>(url, {
      method: 'POST',
      body: isFormData ? body : JSON.stringify(body || {}),
      headers,
    });
  },

  put<T = any>(url: string, body?: any, headers?: HeadersInit): Promise<T> {
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    return request<T>(url, {
      method: 'PUT',
      body: isFormData ? body : JSON.stringify(body || {}),
      headers,
    });
  },

  delete<T = any>(url: string, body?: any, headers?: HeadersInit): Promise<T> {
    return request<T>(url, {
      method: 'DELETE',
      body: body ? JSON.stringify(body) : undefined,
      headers,
    });
  },
};