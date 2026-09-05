export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://logos-ai-api.vercel.app/api/v1';

export function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('logos_ai_jwt');
}

export function getStoredUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem('logos_ai_user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function storeAuth(payload) {
  if (typeof window === 'undefined') return;
  if (payload?.access_token) window.localStorage.setItem('logos_ai_jwt', payload.access_token);
  window.localStorage.setItem('logos_ai_user', JSON.stringify(payload || {}));
}

export function clearAuth() {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem('logos_ai_jwt');
  window.localStorage.removeItem('logos_ai_user');
}

export async function apiFetch(path, options = {}) {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && options.body && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const raw = await response.text();
  let data = null;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }
  if (!response.ok) {
    const detail = data?.detail || data?.message || `Request failed with status ${response.status}`;
    const error = new Error(detail);
    error.status = response.status;
    error.payload = data;
    throw error;
  }
  return data;
}

export async function downloadReport(path, filename) {
  const token = getToken();
  const response = await fetch(`${API_BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error(`Report download failed with status ${response.status}`);
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(url);
}
