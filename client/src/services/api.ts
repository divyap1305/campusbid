const API_BASE = '/api';

export const getAuthToken = (): string | null => {
  return localStorage.getItem('campusbid_token');
};

export const setAuthToken = (token: string): void => {
  localStorage.setItem('campusbid_token', token);
};

export const removeAuthToken = (): void => {
  localStorage.removeItem('campusbid_token');
};

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const api = {
  get: <T>(endpoint: string) => request<T>(endpoint, { method: 'GET' }),
  post: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'POST', body: body ? JSON.stringify(body) : undefined }),
  upload: <T>(endpoint: string, file: File) => {
    const formData = new FormData();
    formData.append('photo', file);
    return request<T>(endpoint, { method: 'POST', body: formData });
  },
  put: <T>(endpoint: string, body?: any) =>
    request<T>(endpoint, { method: 'PUT', body: body ? JSON.stringify(body) : undefined }),
  del: <T>(endpoint: string) => request<T>(endpoint, { method: 'DELETE' }),
};
