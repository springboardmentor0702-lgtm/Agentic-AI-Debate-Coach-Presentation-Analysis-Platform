const API_BASE = "http://localhost:8000/api/v1";

function getAuthHeader() {
  const token = localStorage.getItem("debate_token");
  return token ? { "Authorization": `Bearer ${token}` } : {};
}

async function apiRequest(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    "Content-Type": "application/json",
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  try {
    const response = await fetch(url, {
      ...options,
      headers
    });

    if (response.status === 401) {
      // Clear token on unauthorized if not on auth routes
      if (!endpoint.startsWith("/auth/login") && !endpoint.startsWith("/auth/demo-login")) {
        localStorage.removeItem("debate_token");
        localStorage.removeItem("debate_user");
        window.location.hash = "#/login";
      }
    }

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.detail || `Request failed with status ${response.status}`);
    }
    return data;
  } catch (err) {
    console.error(`API Error on ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // Auth
  login: (email, password) => apiRequest("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  }),
  register: (full_name, email, password, role) => apiRequest("/auth/register", {
    method: "POST",
    body: JSON.stringify({ full_name, email, password, role })
  }),
  demoLogin: (role) => apiRequest(`/auth/demo-login/${role.toLowerCase().replace(' ', '')}`, {
    method: "POST"
  }),
  getMe: () => apiRequest("/auth/me"),

  // Users & Profiles
  getProfile: () => apiRequest("/users/profile"),
  updateProfile: (profileData) => apiRequest("/users/profile", {
    method: "PUT",
    body: JSON.stringify(profileData)
  }),
  listUsers: () => apiRequest("/users/"),
  updateUserRole: (userId, newRole) => apiRequest(`/users/${userId}/role?new_role=${encodeURIComponent(newRole)}`, {
    method: "PUT"
  }),

  // Debates
  createDebate: (debateData) => apiRequest("/debates/", {
    method: "POST",
    body: JSON.stringify(debateData)
  }),
  getDebates: (status) => apiRequest(`/debates/${status ? `?status_filter=${status}` : ''}`),
  getDebate: (id) => apiRequest(`/debates/${id}`),
  addTurn: (sessionId, content, audioPath = null) => apiRequest(`/debates/${sessionId}/turns`, {
    method: "POST",
    body: JSON.stringify({ content, audio_path: audioPath })
  }),
  completeDebate: (sessionId) => apiRequest(`/debates/${sessionId}/complete`, {
    method: "PUT"
  }),

  // Argument & Fallacy Analysis
  analyzeArgument: (text, sessionId = null) => apiRequest("/arguments/analyze", {
    method: "POST",
    body: JSON.stringify({ text, session_id: sessionId })
  }),
  detectFallacies: (text, sessionId = null) => apiRequest("/fallacies/detect", {
    method: "POST",
    body: JSON.stringify({ text, session_id: sessionId })
  }),
  generateCounterarguments: (text, context = "", sessionId = null) => apiRequest("/counterarguments/generate", {
    method: "POST",
    body: JSON.stringify({ text, context, session_id: sessionId })
  }),
  getGlossary: () => apiRequest("/arguments/glossary"),
  explainDifficultWords: (text) => apiRequest("/arguments/glossary/explain", {
    method: "POST",
    body: JSON.stringify({ text })
  }),

  // Presentation Analytics
  analyzePresentation: (title, transcript, durationSeconds = 60.0) => apiRequest("/presentation/analyze", {
    method: "POST",
    body: JSON.stringify({ title, transcript, duration_seconds: durationSeconds })
  }),
  getPresentationHistory: () => apiRequest("/presentation/history"),

  // AI Debate Simulation
  executeSimulationTurn: (sessionId, userArgument) => apiRequest("/simulation/turn", {
    method: "POST",
    body: JSON.stringify({ session_id: sessionId, user_argument: userArgument })
  }),

  // Performance Scoring
  evaluateDebate: (scoreData) => apiRequest("/scoring/evaluate", {
    method: "POST",
    body: JSON.stringify(scoreData)
  }),
  getSessionScore: (sessionId) => apiRequest(`/scoring/session/${sessionId}`),

  // Coaching & Recommendations
  getLearningPath: () => apiRequest("/coaching/learning-path"),
  toggleMilestone: (milestoneId) => apiRequest(`/coaching/learning-path/milestone/${milestoneId}/toggle`, {
    method: "PUT"
  }),
  getRecommendations: () => apiRequest("/coaching/recommendations"),

  // Analytics Dashboards
  getLearnerDashboard: () => apiRequest("/analytics/learner-dashboard"),
  getCoachDashboard: () => apiRequest("/analytics/coach-dashboard"),
  getEducatorDashboard: () => apiRequest("/analytics/educator-dashboard"),
  getAdminDashboard: () => apiRequest("/analytics/admin-dashboard"),

  // Notifications
  getNotifications: () => apiRequest("/notifications/"),
  markNotificationRead: (id) => apiRequest(`/notifications/${id}/read`, { method: "PUT" }),
  markAllNotificationsRead: () => apiRequest("/notifications/mark-all-read", { method: "POST" }),

  // Reports
  exportReport: (reportType, sessionId = null, format = "pdf") => apiRequest("/reports/export", {
    method: "POST",
    body: JSON.stringify({ report_type: reportType, session_id: sessionId, format })
  }),
  getDownloadUrl: (filename) => `${API_BASE}/reports/download/${filename}`
};
