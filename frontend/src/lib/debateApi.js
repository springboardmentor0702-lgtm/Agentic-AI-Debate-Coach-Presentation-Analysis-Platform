export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export function getStoredToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('logos_ai_jwt');
}

export function parseJwtPayload(token) {
  try {
    return JSON.parse(atob(token.split('.')[1]));
  } catch {
    return null;
  }
}

export function getCurrentUserFromToken() {
  const token = getStoredToken();
  if (!token) return null;
  return parseJwtPayload(token);
}

export function authHeaders(extraHeaders = {}) {
  const token = getStoredToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  };
}

export async function requestJson(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(options.headers || {}),
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function requestForm(path, formData, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    body: formData,
    headers: authHeaders(options.headers || {}),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Request failed with status ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export function combineDateAndTime(dateValue, timeValue) {
  if (!dateValue) return null;
  const timePart = timeValue || '00:00';
  return new Date(`${dateValue}T${timePart}:00`).toISOString();
}

export function formatDateTime(value) {
  if (!value) return 'Not scheduled';
  try {
    return new Intl.DateTimeFormat('en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value));
  } catch {
    return value;
  }
}
