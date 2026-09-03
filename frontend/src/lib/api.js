const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export function getToken() {
  return typeof window === 'undefined' ? null : localStorage.getItem('logos_ai_jwt');
}

export function authHeaders(json = false) {
  const token = getToken();
  return {
    ...(json ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function apiFetch(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...authHeaders(Boolean(options.body)), ...(options.headers || {}) },
  });
  if (!response.ok) {
    let detail = 'Request failed.';
    try {
      const body = await response.json();
      detail = body.detail || detail;
    } catch {
      // Preserve the HTTP failure when the server does not return JSON.
    }
    throw new Error(detail);
  }
  return response;
}

export { API_BASE };
