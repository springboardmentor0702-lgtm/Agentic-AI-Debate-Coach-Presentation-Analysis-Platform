const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('mindarena_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = `HTTP Error ${response.status}`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.error || errJson.message || errorMsg;
    } catch {}
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  // Auth
  register: (data: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  getMe: () => request<any>('/auth/me'),
  updateProfile: (data: any) => request<any>('/profiles/me', { method: 'PATCH', body: JSON.stringify(data) }),

  // Pattern 1: Argument Analysis
  analyzeArgument: (data: { topic: string; argument: string }) => 
    request<any>('/arguments/analyze', { method: 'POST', body: JSON.stringify(data) }),
  getArgumentHistory: () => request<any[]>('/arguments/history'),
  detectFallacies: (data: { argument: string }) => 
    request<any>('/fallacies/detect', { method: 'POST', body: JSON.stringify(data) }),
  generateCounterarguments: (data: { topic: string; argument: string }) => 
    request<any>('/counterarguments/generate', { method: 'POST', body: JSON.stringify(data) }),
  synthesizeCaseReview: (data: { topic: string; argument: string }) => 
    request<any>('/case-reviews/synthesize', { method: 'POST', body: JSON.stringify(data) }),

  // Pattern 2: Multi-Agent Debate
  createDebate: (data: { topic: string; mode?: string; user_stance?: string; opponent_email?: string }) => 
    request<any>('/debates/create', { method: 'POST', body: JSON.stringify(data) }),
  getDebates: () => request<any[]>('/debates'),
  getDebate: (id: string) => request<any>(`/debates/${id}`),
  submitDebateRound: (id: string, data: { speech_text: string }) => 
    request<any>(`/debates/${id}/round`, { method: 'POST', body: JSON.stringify(data) }),
  respondDebateInvite: (id: string, action: 'accept' | 'reject') => 
    request<any>(`/debates/${id}/respond-invite`, { method: 'POST', body: JSON.stringify({ action }) }),

  // Pattern 3: ReAct Research
  generateResearchBrief: (topic: string) => 
    request<any>('/research/brief', { method: 'POST', body: JSON.stringify({ topic }) }),
  getResearchHistory: () => request<any[]>('/research/history'),

  // Pattern 4: Tool-Calling Coach
  askCoach: (question: string) => 
    request<any>('/coaching-agent/ask', { method: 'POST', body: JSON.stringify({ question }) }),
  getCoachingSessions: () => request<any[]>('/coaching-agent/sessions'),

  // RAG Coaching
  getCoachingPlan: (focus_areas: string[]) => 
    request<any>('/coaching/plan', { method: 'POST', body: JSON.stringify({ focus_areas }) }),
  getCoachingKnowledge: () => request<any[]>('/coaching/knowledge'),

  // Presentation Analysis
  analyzePresentation: (data: { title: string; transcript: string; duration_seconds: number }) => 
    request<any>('/presentations/analyze', { method: 'POST', body: JSON.stringify(data) }),
  getPresentationHistory: () => request<any[]>('/presentations/history'),

  // Performance & Peer Comparison
  getPerformanceSummary: () => request<any>('/performance/summary'),
  getPeerComparison: () => request<any>('/performance/peer-comparison'),

  // Goals
  getGoals: () => request<any[]>('/goals'),
  createGoal: (data: any) => request<any>('/goals', { method: 'POST', body: JSON.stringify(data) }),
  updateGoal: (id: string, data: any) => request<any>(`/goals/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),

  // Classes (Educator)
  getClasses: () => request<any[]>('/classes'),
  createClass: (data: { name: string; description?: string }) => 
    request<any>('/classes', { method: 'POST', body: JSON.stringify(data) }),
  addClassMember: (classId: string, learner_email: string) => 
    request<any>(`/classes/${classId}/members`, { method: 'POST', body: JSON.stringify({ learner_email }) }),

  // Coach Feedback
  submitCoachFeedback: (data: any) => request<any>('/coach-feedback', { method: 'POST', body: JSON.stringify(data) }),
  getCoachFeedback: () => request<any[]>('/coach-feedback'),

  // Notifications
  getNotifications: () => request<any[]>('/notifications'),
  markNotificationRead: (id: string) => request<any>(`/notifications/${id}/read`, { method: 'PATCH' }),

  // Admin & Export
  getAdminUsers: () => request<any[]>('/admin/users'),
  getAdminAnalytics: () => request<any>('/admin/analytics'),
  getExportUrl: (format: 'json' | 'csv') => `${API_BASE}/export?format=${format}`
};
