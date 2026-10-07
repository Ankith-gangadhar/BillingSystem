// API Client for POS Backend

const API_BASE_URL = '/api';

export async function apiRequest<T = any>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('mangalore_pos_token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorMsg = `Server returned status ${response.status}`;
    try {
      const errorJson = await response.json();
      errorMsg = errorJson.error || errorMsg;
    } catch {
      // Ignore text parse error
    }
    throw new Error(errorMsg);
  }

  return response.json();
}
