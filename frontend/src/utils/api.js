/**
 * LOGOS.AI - single API client for the FastAPI backend.
 *
 * Every path in this file was reconciled against the routers in backend/routers/
 * during Batch 4. The previous version had drifted badly: about two dozen calls
 * pointed at routes that had been renamed or never existed (/fallacy-detection/detect,
 * /scoring/user-scores, /simulation/send-turn), several sent body keys the schemas
 * reject (raw_speech_text instead of speech_text, persona instead of opponent_persona),
 * and Content-Type: application/json was set unconditionally, which corrupts the
 * multipart boundary on file uploads. All of that is fixed here.
 *
 * Three conventions worth knowing:
 *
 *   1. Nothing in this file invents data. If a request fails it throws APIError -
 *      callers render the error. No component should fall back to sample numbers.
 *   2. FastAPI returns 422 validation errors as `detail: [{loc, msg, type}, ...]`,
 *      not a string. getErrorMessage() flattens both shapes, so an invalid form
 *      shows "password: String should have at least 8 characters" rather than
 *      "[object Object]".
 *   3. File downloads go through apiFetchBlob(), not window.open(). The export
 *      routes now require an Authorization header, and window.open cannot send one.
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/+$/, '');
const API_V1 = `${API_BASE_URL}/api/v1`;

const TOKEN_KEY = 'logos_ai_jwt';
const USER_KEY = 'logos_ai_user';

// Pages that must not bounce to /login when a call 401s - otherwise a failed
// login attempt reloads the login page and the error message is lost.
const AUTH_ROUTES = ['/login', '/signup', '/auth'];

export { API_BASE_URL, API_V1, TOKEN_KEY };

// ---------------------------------------------------------------------------
// Token + cached identity
// ---------------------------------------------------------------------------
/**
 * Token storage is split across two backing stores so the "Remember Me"
 * checkbox on the login form actually does something - it used to be collected
 * and thrown away. Checked writes to localStorage and survives a browser
 * restart; unchecked writes to sessionStorage and dies with the tab. Reads
 * check localStorage first, then sessionStorage.
 */
function readStorage(key) {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(key) ?? window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value, persist) {
  if (typeof window === 'undefined') return;
  try {
    // Always clear both first, so switching Remember Me off cannot leave a
    // stale long-lived copy behind in localStorage.
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
    if (value === null || value === undefined) return;
    const store = persist ? window.localStorage : window.sessionStorage;
    store.setItem(key, value);
  } catch {
    /* private browsing / storage disabled - the session simply won't persist */
  }
}

export function getToken() {
  return readStorage(TOKEN_KEY);
}

export function setToken(token, persist = true) {
  writeStorage(TOKEN_KEY, token, persist);
}

export function clearToken() {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(USER_KEY);
    window.sessionStorage.removeItem(TOKEN_KEY);
    window.sessionStorage.removeItem(USER_KEY);
  } catch {
    /* ignore */
  }
}

/** Which store currently holds the token - so the user snapshot follows it. */
function tokenIsPersistent() {
  if (typeof window === 'undefined') return true;
  try {
    return window.localStorage.getItem(TOKEN_KEY) !== null;
  } catch {
    return true;
  }
}

/**
 * A small cached copy of the signed-in user, so the navbar can paint a name on
 * first render instead of flashing "Account" while /auth/me is in flight. It is
 * a convenience only - AuthContext always re-verifies against the server.
 */
export function getStoredUser() {
  const raw = readStorage(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredUser(user) {
  writeStorage(USER_KEY, user ? JSON.stringify(user) : null, tokenIsPersistent());
}

/** Read the JWT payload without verifying it - useful only for a fast first paint. */
export function decodeToken(token = getToken()) {
  if (!token || typeof token !== 'string' || token.split('.').length !== 3) return null;
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

/** True when the token is absent, malformed, or past its exp claim. */
export function isTokenExpired(token = getToken()) {
  const payload = decodeToken(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 <= Date.now();
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------
export class APIError extends Error {
  constructor(message, status = 0, payload = null) {
    super(message);
    this.name = 'APIError';
    this.status = status;
    this.payload = payload;
  }
}

/**
 * Flatten whatever FastAPI put in `detail` into one readable sentence.
 * - 4xx from our own routers: detail is a string.
 * - 422 from Pydantic:        detail is [{loc: ["body","password"], msg: "..."}].
 */
function flattenDetail(payload, fallback) {
  if (!payload) return fallback;
  const detail = payload.detail !== undefined ? payload.detail : payload.message;

  if (typeof detail === 'string' && detail.trim()) return detail;

  if (Array.isArray(detail)) {
    const parts = detail
      .map((item) => {
        if (typeof item === 'string') return item;
        if (!item || typeof item !== 'object') return '';
        const loc = Array.isArray(item.loc)
          ? item.loc.filter((segment) => segment !== 'body' && segment !== 'query').join('.')
          : '';
        const msg = item.msg || item.message || '';
        if (!msg) return '';
        return loc ? `${loc}: ${msg}` : msg;
      })
      .filter(Boolean);
    if (parts.length) return parts.join('; ');
  }

  if (detail && typeof detail === 'object') {
    const msg = detail.msg || detail.message;
    if (typeof msg === 'string' && msg) return msg;
  }
  return fallback;
}

export function getErrorMessage(error) {
  if (!error) return 'An unexpected error occurred.';
  if (error instanceof APIError) return error.message;
  if (isNetworkError(error)) {
    return `Cannot reach the API at ${API_BASE_URL}. Is the backend running?`;
  }
  return error.message || 'An unexpected error occurred.';
}

export function isNetworkError(error) {
  return Boolean(error) && (error.name === 'TypeError' || error.status === 0);
}

// ---------------------------------------------------------------------------
// Core request helpers
// ---------------------------------------------------------------------------
function buildHeaders({ json = true, auth = true, extra = {} } = {}) {
  const headers = { Accept: 'application/json', ...extra };
  // Deliberately conditional: setting Content-Type on a FormData request
  // overwrites the multipart boundary the browser generates and the upload fails.
  if (json) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function handleUnauthorized() {
  clearToken();
  if (typeof window === 'undefined') return;
  const path = window.location.pathname || '';
  if (AUTH_ROUTES.some((route) => path.startsWith(route))) return;
  window.location.href = '/login';
}

async function parseBody(response) {
  const contentType = response.headers.get('content-type') || '';
  if (response.status === 204) return null;
  if (contentType.includes('application/json')) {
    try {
      return await response.json();
    } catch {
      return null;
    }
  }
  const text = await response.text();
  return text ? { detail: text } : null;
}

/**
 * JSON request. `body` is serialised when it is a plain object; pass a FormData
 * instance to upload files and the JSON header is skipped automatically.
 */
export async function apiFetch(path, { method = 'GET', body, auth = true, headers = {}, signal } = {}) {
  const isForm = typeof FormData !== 'undefined' && body instanceof FormData;
  const url = path.startsWith('http') ? path : `${API_V1}${path}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: buildHeaders({ json: !isForm && body !== undefined, auth, extra: headers }),
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new APIError(`Cannot reach the API at ${API_BASE_URL}. Is the backend running?`, 0, null);
  }

  if (response.status === 401) {
    handleUnauthorized();
    const payload = await parseBody(response);
    throw new APIError(flattenDetail(payload, 'Your session has expired. Please sign in again.'), 401, payload);
  }

  const payload = await parseBody(response);
  if (!response.ok) {
    throw new APIError(flattenDetail(payload, `Request failed (HTTP ${response.status}).`), response.status, payload);
  }
  return payload;
}

/**
 * Binary request for PDF / CSV exports. Returns { blob, filename }.
 *
 * The export routes are authenticated now, so window.open() and plain <a href>
 * downloads return 401 - the browser sends no Authorization header on a
 * navigation. Callers should hand the result to downloadBlob().
 */
export async function apiFetchBlob(path, { method = 'GET', body, signal } = {}) {
  const url = path.startsWith('http') ? path : `${API_V1}${path}`;

  let response;
  try {
    response = await fetch(url, {
      method,
      headers: buildHeaders({ json: body !== undefined, auth: true, extra: { Accept: '*/*' } }),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error.name === 'AbortError') throw error;
    throw new APIError(`Cannot reach the API at ${API_BASE_URL}. Is the backend running?`, 0, null);
  }

  if (response.status === 401) {
    handleUnauthorized();
    throw new APIError('Your session has expired. Please sign in again.', 401, null);
  }
  if (!response.ok) {
    const payload = await parseBody(response);
    throw new APIError(flattenDetail(payload, `Export failed (HTTP ${response.status}).`), response.status, payload);
  }

  // FastAPI sets Content-Disposition on the export routes; fall back to the last
  // path segment when a proxy strips it.
  const disposition = response.headers.get('content-disposition') || '';
  const match = disposition.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  const filename = match ? decodeURIComponent(match[1]) : path.split('/').pop() || 'logos-ai-export';

  return { blob: await response.blob(), filename };
}

/** Save a blob returned by apiFetchBlob() to the user's downloads. */
export function downloadBlob(blob, filename) {
  if (typeof window === 'undefined') return;
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = filename || 'logos-ai-export';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking immediately can cancel the download in Safari.
  window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 2000);
}

function queryString(params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') search.append(key, value);
  });
  const encoded = search.toString();
  return encoded ? `?${encoded}` : '';
}

// ---------------------------------------------------------------------------
// Authentication  -  backend/routers/auth.py
// ---------------------------------------------------------------------------
export const authAPI = {
  /** POST /auth/register - returns a Token, so the user is signed in immediately. */
  register: (payload) => apiFetch('/auth/register', { method: 'POST', body: payload, auth: false }),

  /** POST /auth/login */
  login: (email, password) =>
    apiFetch('/auth/login', { method: 'POST', body: { email, password }, auth: false }),

  /**
   * POST /auth/oauth2/login - development handoff. The backend takes these as
   * query parameters, not a JSON body, so they are encoded into the URL.
   */
  oauth2Login: ({ provider = 'Google', email, role = 'Learner' } = {}) =>
    apiFetch(`/auth/oauth2/login${queryString({ provider, email, role })}`, { method: 'POST', auth: false }),

  /** GET /auth/me - who does this token belong to? */
  me: () => apiFetch('/auth/me'),

  /** GET /auth/profile */
  getProfile: () => apiFetch('/auth/profile'),

  /** PUT /auth/profile - JSON body, patches only the fields you send. */
  updateProfile: (payload) => apiFetch('/auth/profile', { method: 'PUT', body: payload }),
};

// ---------------------------------------------------------------------------
// Debate sessions  -  backend/routers/sessions.py
// ---------------------------------------------------------------------------
export const sessionsAPI = {
  /** POST /sessions/create */
  create: (payload) => apiFetch('/sessions/create', { method: 'POST', body: payload }),

  /** POST /sessions/{id}/complete */
  complete: (sessionId) => apiFetch(`/sessions/${sessionId}/complete`, { method: 'POST' }),

  /** GET /sessions/user/me - the signed-in user's sessions. */
  listMine: () => apiFetch('/sessions/user/me'),

  /** GET /sessions/user/{user_id} - staff view of someone else's sessions. */
  listForUser: (userId) => apiFetch(`/sessions/user/${userId}`),

  /** GET /sessions/{id} */
  get: (sessionId) => apiFetch(`/sessions/${sessionId}`),
};

// ---------------------------------------------------------------------------
// Argument analysis  -  backend/routers/argument_analysis.py
// ---------------------------------------------------------------------------
export const argumentAPI = {
  /** POST /argument-analysis/evaluate */
  evaluate: (sessionId, speechText) =>
    apiFetch('/argument-analysis/evaluate', {
      method: 'POST',
      body: { session_id: sessionId, speech_text: speechText },
    }),

  /** POST /argument-analysis/analyze - same payload, kept because both routes exist. */
  analyze: (sessionId, speechText) =>
    apiFetch('/argument-analysis/analyze', {
      method: 'POST',
      body: { session_id: sessionId, speech_text: speechText },
    }),

  /** GET /argument-analysis/session/{id} - every analysis in a session. */
  listBySession: (sessionId) => apiFetch(`/argument-analysis/session/${sessionId}`),

  /** GET /argument-analysis/{analysis_id} */
  get: (analysisId) => apiFetch(`/argument-analysis/${analysisId}`),
};

// ---------------------------------------------------------------------------
// Fallacy detection  -  backend/routers/fallacy_detection.py
// ---------------------------------------------------------------------------
export const fallacyAPI = {
  /** GET /fallacy-detection/supported-fallacies - the eight types the engine knows. */
  getSupported: () => apiFetch('/fallacy-detection/supported-fallacies'),

  /**
   * POST /fallacy-detection/audit
   * session_id is optional - the checker works on loose text too.
   */
  audit: (speechText, sessionId = null) =>
    apiFetch('/fallacy-detection/audit', {
      method: 'POST',
      body: { speech_text: speechText, session_id: sessionId || undefined },
    }),
};

// ---------------------------------------------------------------------------
// Counterargument generation  -  backend/routers/counterarguments.py
// ---------------------------------------------------------------------------
export const counterargumentAPI = {
  /** GET /counterarguments/rebuttal-types - the five strategy families. */
  getRebuttalTypes: () => apiFetch('/counterarguments/rebuttal-types'),

  /** POST /counterarguments/generate */
  generate: ({ speechText, sessionId = null, topic = '', position = '' }) =>
    apiFetch('/counterarguments/generate', {
      method: 'POST',
      body: {
        speech_text: speechText,
        session_id: sessionId || undefined,
        topic,
        position,
      },
    }),
};

// ---------------------------------------------------------------------------
// Presentation / speech analysis  -  backend/routers/presentation_analysis.py
// ---------------------------------------------------------------------------
export const presentationAPI = {
  /** GET /presentation-analysis/capabilities - is Whisper installed on this host? */
  getCapabilities: () => apiFetch('/presentation-analysis/capabilities'),

  /** POST /presentation-analysis/evaluate - text-only delivery analysis. */
  evaluate: ({ sessionId, speechText, durationSeconds = 60 }) =>
    apiFetch('/presentation-analysis/evaluate', {
      method: 'POST',
      body: {
        session_id: sessionId,
        speech_text: speechText,
        audio_duration_seconds: durationSeconds,
      },
    }),

  /** POST /presentation-analysis/transcribe - audio in, text out, nothing stored. */
  transcribe: (file) => {
    const form = new FormData();
    form.append('audio', file);
    return apiFetch('/presentation-analysis/transcribe', { method: 'POST', body: form });
  },

  /** POST /presentation-analysis/evaluate-audio - transcript + measured prosody, stored. */
  evaluateAudio: (sessionId, file) => {
    const form = new FormData();
    form.append('session_id', String(sessionId));
    form.append('audio', file);
    return apiFetch('/presentation-analysis/evaluate-audio', { method: 'POST', body: form });
  },

  /** GET /presentation-analysis/session/{id} - stored metrics, newest first. */
  listBySession: (sessionId) => apiFetch(`/presentation-analysis/session/${sessionId}`),
};

// ---------------------------------------------------------------------------
// AI debate simulation  -  backend/routers/simulation.py
// ---------------------------------------------------------------------------
export const simulationAPI = {
  /** GET /simulation/personas - The Contrarian / The Academic / The Strategist. */
  getPersonas: () => apiFetch('/simulation/personas'),

  /** POST /simulation/opening - let the AI speak first. */
  opening: ({ sessionId = null, topic, persona = 'The Contrarian', userPosition = 'Affirmative' }) =>
    apiFetch('/simulation/opening', {
      method: 'POST',
      body: {
        session_id: sessionId || undefined,
        topic,
        opponent_persona: persona,
        user_position: userPosition,
      },
    }),

  /** POST /simulation/turn - one exchange: your argument in, the rebuttal out. */
  sendTurn: ({ sessionId, userArgument, persona = 'The Contrarian', difficulty = 'medium' }) =>
    apiFetch('/simulation/turn', {
      method: 'POST',
      body: {
        session_id: sessionId,
        user_argument: userArgument,
        opponent_persona: persona,
        difficulty,
      },
    }),

  /** GET /simulation/turns/{session_id} - the full transcript of a round. */
  getTurns: (sessionId) => apiFetch(`/simulation/turns/${sessionId}`),
};

// ---------------------------------------------------------------------------
// Performance scoring  -  backend/routers/scoring.py
// ---------------------------------------------------------------------------
export const scoringAPI = {
  /** GET /scoring/weights - the 30/20/20/15/15 rubric. */
  getWeights: () => apiFetch('/scoring/weights'),

  /** POST /scoring/calculate - server derives all five sub-scores from the session. */
  calculate: ({ sessionId, argumentText = '', includeSpeechMetrics = true }) =>
    apiFetch('/scoring/calculate', {
      method: 'POST',
      body: {
        session_id: sessionId,
        argument_text: argumentText,
        include_speech_metrics: includeSpeechMetrics,
      },
    }),

  /** POST /scoring/manual - Coach / Educator / Administrator override. */
  manual: (payload) => apiFetch('/scoring/manual', { method: 'POST', body: payload }),

  /** GET /scoring/session/{id} */
  listBySession: (sessionId) => apiFetch(`/scoring/session/${sessionId}`),
};

// ---------------------------------------------------------------------------
// Coaching  -  backend/routers/coaching.py
// ---------------------------------------------------------------------------
export const coachingAPI = {
  /** GET /coaching/plan/{user_id} - self-only on the backend. */
  getPlan: (userId) => apiFetch(`/coaching/plan/${userId}`),
};

// ---------------------------------------------------------------------------
// Dashboards  -  backend/routers/dashboards.py
// ---------------------------------------------------------------------------
export const dashboardAPI = {
  /** GET /dashboards/stats - headline numbers for the signed-in user. */
  getStats: () => apiFetch('/dashboards/stats'),

  /** GET /dashboards/learner/{user_id} */
  getLearner: (userId) => apiFetch(`/dashboards/learner/${userId}`),

  /** GET /dashboards/coach/{user_id} */
  getCoach: (userId) => apiFetch(`/dashboards/coach/${userId}`),

  /** GET /dashboards/educator/{user_id} */
  getEducator: (userId) => apiFetch(`/dashboards/educator/${userId}`),

  /** GET /dashboards/admin */
  getAdmin: () => apiFetch('/dashboards/admin'),
};

// ---------------------------------------------------------------------------
// Reports & exports  -  backend/routers/reports.py
// ---------------------------------------------------------------------------
export const reportsAPI = {
  /** GET /reports/session/{id} - the JSON behind the exports. */
  getSessionReport: (sessionId) => apiFetch(`/reports/session/${sessionId}`),

  /** GET /reports/progress/{user_id} - trend over time. */
  getProgress: (userId) => apiFetch(`/reports/progress/${userId}`),

  /** GET /reports/export/pdf/{session_id} */
  downloadSessionPdf: (sessionId) => apiFetchBlob(`/reports/export/pdf/${sessionId}`),

  /**
   * GET /reports/export/excel/{session_id}
   * The payload is CSV - Excel opens it natively and the route name was kept so
   * existing links do not break.
   */
  downloadSessionCsv: (sessionId) => apiFetchBlob(`/reports/export/excel/${sessionId}`),

  /** GET /reports/export/progress/pdf/{user_id} */
  downloadProgressPdf: (userId) => apiFetchBlob(`/reports/export/progress/pdf/${userId}`),

  /** GET /reports/export/coaching/pdf/{user_id} */
  downloadCoachingPdf: (userId) => apiFetchBlob(`/reports/export/coaching/pdf/${userId}`),
};

// ---------------------------------------------------------------------------
// Notifications  -  backend/routers/notifications.py
// ---------------------------------------------------------------------------
export const notificationsAPI = {
  /**
   * GET /notifications/my-alerts
   *
   * KNOWN BACKEND LIMITATION: this route takes user_id as a query parameter and
   * has no authentication dependency, defaulting to user 1. We pass the signed-in
   * user's id explicitly so the reminders and milestones are at least the right
   * person's. The route also appends one hardcoded "Coach Sofia Vance" feedback
   * item server-side. Fixing that means editing notifications.py, which is
   * outside the approved change plan - flagged rather than patched around.
   */
  getMyAlerts: (userId) => apiFetch(`/notifications/my-alerts${queryString({ user_id: userId })}`),

  /** POST /notifications/read/{id} */
  markAsRead: (notificationId) => apiFetch(`/notifications/read/${notificationId}`, { method: 'POST' }),
};

// ---------------------------------------------------------------------------
// Health  -  backend/main.py
// ---------------------------------------------------------------------------
export const systemAPI = {
  /** GET /health - lives outside /api/v1, hence the absolute URL. */
  health: () => apiFetch(`${API_BASE_URL}/health`, { auth: false }),
};

const api = {
  API_BASE_URL,
  API_V1,
  apiFetch,
  apiFetchBlob,
  downloadBlob,
  getToken,
  setToken,
  clearToken,
  getStoredUser,
  setStoredUser,
  decodeToken,
  isTokenExpired,
  APIError,
  getErrorMessage,
  isNetworkError,
  authAPI,
  sessionsAPI,
  argumentAPI,
  fallacyAPI,
  counterargumentAPI,
  presentationAPI,
  simulationAPI,
  scoringAPI,
  coachingAPI,
  dashboardAPI,
  reportsAPI,
  notificationsAPI,
  systemAPI,
};

export default api;
