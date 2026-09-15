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

export async function getAuthToken(): Promise<string> {
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
      try {
        const { data } = await supabase.auth.getSession();
        if (!data?.session) {
          console.warn('[apiClient] Sesión ausente o expirada en Supabase. Redirigiendo a login...');
          localStorage.removeItem('schoolos-auth');
          localStorage.removeItem('schoolos-user');
          localStorage.removeItem('schoolos_profile_cache');
          window.location.replace('/login?redirect=' + encodeURIComponent(window.location.pathname));
        } else {
          console.warn('[apiClient] 401 recibido pero sesión Supabase sigue activa. No se fuerza deslogueo.');
        }
      } catch (_) {}
    }
    throw new ApiError('Sesión no autorizada o expirada.', 401);
  }

  let payload: any = null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch (_) {
      payload = null;
    }
  } else {
    const rawText = await response.text();
    try {
      payload = JSON.parse(rawText);
    } catch (_) {
      payload = rawText;
    }
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

  download(url: string, defaultFilename?: string): Promise<void> {
    return downloadFile(url, defaultFilename);
  },
};

export async function downloadFile(url: string, defaultFilename = 'descarga'): Promise<void> {
  const token = await getAuthToken();
  const headers = new Headers();
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // Agrega token en query param si existe como respaldo para el servidor
  let finalUrl = url;
  if (token && !url.includes('token=')) {
    const separator = url.includes('?') ? '&' : '?';
    finalUrl = `${url}${separator}token=${encodeURIComponent(token)}`;
  }

  const res = await fetch(finalUrl, { headers });
  if (!res.ok) {
    let errorMsg = `Error ${res.status}`;
    try {
      const errJson = await res.json();
      if (errJson.error) errorMsg = errJson.error;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  const blob = await res.blob();
  const blobUrl = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = blobUrl;

  const disposition = res.headers.get('Content-Disposition');
  let filename = defaultFilename;
  if (disposition && disposition.includes('filename=')) {
    const match = disposition.match(/filename="?([^"]+)"?/);
    if (match && match[1]) filename = match[1];
  }
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(blobUrl);
}