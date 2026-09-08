const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api/v1";

export type User = {
  id: number;
  full_name: string;
  email: string;
  role: string;
  is_active: boolean;
};

export type AuthResponse = {
  user: User;
  access_token: string;
  refresh_token: string;
  token_type: string;
};

export type Debate = {
  id: number;
  user_id: number;
  title: string;
  topic: string;
  format: string;
  user_position: string;
  ai_position: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type DebateMessage = {
  id: number;
  sender: string;
  message: string;
  created_at: string;
};

export type DebateHistoryMessage = { id: number; sender: "USER" | "AI"; message: string; created_at: string };

export type DebateResponse = {
  transcript?: string;
  ai_response: string;
  argument_analysis: Record<string, unknown>;
  fallacies: Record<string, unknown>[];
  counterarguments: Record<string, unknown>[];
  coaching_tip: string;
};

export type UserProfile = {
  id: number;
  user_id: number;
  bio: string | null;
  expertise_areas: string | null;
  debate_count: number;
  win_rate: number;
  created_at: string;
};

export type Skill = {
  id: number;
  user_id: number;
  name: string;
  score: number;
  created_at: string;
};

export type Person = Pick<User, "id" | "full_name" | "email" | "role" | "is_active">;
export type LearnerProfile = Person & { experience_level: string; preferred_debate_topics: string | null; presentation_domains: string | null; learning_goals: string | null; coaching_preferences: string | null; skills: { id: number; name: string; score: number }[]; connected_expert_count: number; connected_experts: { id: number; full_name: string; email: string; role: string; is_active: boolean; request_count: number; debate_count: number; latest_status: string | null }[]; available_experts: ExpertProfile[] };
export type ExpertProfile = Person & { experience_level: string; presentation_domains: string | null; coaching_preferences: string | null; skills: { id: number; name: string; score: number }[] };
export type DebateRequest = { id: number; learner_id: number; expert_id: number; topic: string; status: string; created_at: string; updated_at: string };
export type HumanDebate = { id: number; request_id: number; learner_id: number; expert_id: number; topic: string; status: string; created_at: string; completed_at: string | null };
export type HumanDebateMessage = { id: number; debate_id: number; sender_id: number; message: string; message_type: "TEXT" | "AUDIO"; audio_url: string | null; created_at: string };
export type PracticeNotification = { id: number; title: string; message: string; is_read: boolean; created_at: string };

function parseAuthTokens() {
  if (typeof window === "undefined") return null;
  const access = window.localStorage.getItem("accessToken");
  const refresh = window.localStorage.getItem("refreshToken");
  if (!access || !refresh) return null;
  return { accessToken: access, refreshToken: refresh };
}

function authHeaders(): Record<string, string> {
  const tokens = parseAuthTokens();
  if (tokens) {
    return { Authorization: `Bearer ${tokens.accessToken}`, "Content-Type": "application/json" };
  }
  return { "Content-Type": "application/json" };
}

export async function registerUser(payload: {
  full_name: string;
  email: string;
  password: string;
  role: string;
  admin_key?: string;
}) {
  const response = await fetch(`${apiBaseUrl}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? "Registration failed");
  }

  const auth = (await response.json()) as AuthResponse;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("accessToken", auth.access_token);
    window.localStorage.setItem("refreshToken", auth.refresh_token);
  }
  return auth;
}

async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { ...options, headers: { ...authHeaders(), ...(options.headers ?? {}) } });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? "Request failed");
  }
  return (await response.json()) as T;
}

export function getExperts() { return apiRequest<Person[]>("/community/experts"); }
export function getExpertProfile(id: number) { return apiRequest<ExpertProfile>(`/community/experts/${id}`); }
export function getLearners() { return apiRequest<Person[]>("/community/learners"); }
export function getPracticeLearners() { return apiRequest<Person[]>("/community/practice/learners"); }
export function getLearnerProfile(id: number) { return apiRequest<LearnerProfile>(`/community/learners/${id}`); }
export function getDebateRequests() { return apiRequest<DebateRequest[]>("/community/requests"); }
export function requestExpertDebate(expert_id: number, topic: string) { return apiRequest<DebateRequest>("/community/requests", { method: "POST", body: JSON.stringify({ expert_id, topic }) }); }
export function updateDebateRequest(id: number, status: "ACCEPTED" | "REJECTED") { return apiRequest<HumanDebate | DebateRequest>(`/community/requests/${id}`, { method: "PUT", body: JSON.stringify({ status }) }); }
export function getHumanDebates() { return apiRequest<HumanDebate[]>("/community/debates"); }
export function startExpertDebate(learner_id: number, topic: string) { return apiRequest<HumanDebate>("/community/debates/start", { method: "POST", body: JSON.stringify({ learner_id, topic }) }); }
export function startPracticeDebate(learner_id: number, topic: string) { return apiRequest<DebateRequest>("/community/practice/debates/start", { method: "POST", body: JSON.stringify({ learner_id, topic }) }); }
export function getPracticeNotifications() { return apiRequest<PracticeNotification[]>("/community/practice/notifications"); }
export function getHumanDebateMessages(debateId: number) { return apiRequest<HumanDebateMessage[]>(`/community/debates/${debateId}/messages`); }
export function sendHumanDebateMessage(debateId: number, message: string) { return apiRequest<HumanDebateMessage>(`/community/debates/${debateId}/messages`, { method: "POST", body: JSON.stringify({ message, message_type: "TEXT" }) }); }
export function sendDebateFeedback(debateId: number, feedback: string) { return apiRequest<{ id: number; debate_id: number; author_id: number; feedback: string; created_at: string }>(`/community/debates/${debateId}/feedback`, { method: "POST", body: JSON.stringify({ feedback }) }); }
export async function sendVoiceDebateMessage(debateId: number, audio: Blob) {
  const form = new FormData();
  form.append("audio", audio, "voice.webm");
  const response = await fetch(`${apiBaseUrl}/debates/${debateId}/voice-message`, { method: "POST", headers: { Authorization: `Bearer ${parseAuthTokens()?.accessToken ?? ""}` }, body: form });
  const data = await response.json();
  if (!response.ok) throw new Error(data.detail ?? "Voice message failed");
  return data as DebateResponse;
}

export async function loginUser(payload: { email: string; password: string }) {
  const response = await fetch(`${apiBaseUrl}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? "Login failed");
  }

  const auth = (await response.json()) as AuthResponse;
  if (typeof window !== "undefined") {
    window.localStorage.setItem("accessToken", auth.access_token);
    window.localStorage.setItem("refreshToken", auth.refresh_token);
  }
  return auth;
}

export async function logoutUser() {
  const tokens = parseAuthTokens();
  if (tokens) {
    await fetch(`${apiBaseUrl}/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: tokens.refreshToken }),
    });
  }
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("accessToken");
    window.localStorage.removeItem("refreshToken");
    window.localStorage.removeItem("user_role");
  }
}

export async function getCurrentUser() {
  const response = await fetch(`${apiBaseUrl}/auth/me`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Unable to load current user");
  }

  return (await response.json()) as User;
}

export async function getDebates() {
  const response = await fetch(`${apiBaseUrl}/debates`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Unable to load debates");
  }

  return (await response.json()) as Debate[];
}

export async function createDebate(payload: {
  title: string;
  topic: string;
  format: string;
  user_position: string;
  ai_position: string;
}) {
  const response = await fetch(`${apiBaseUrl}/debates`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? "Failed to create debate");
  }

  return (await response.json()) as Debate;
}

export async function getDebateById(debateId: number) {
  const response = await fetch(`${apiBaseUrl}/debates/${debateId}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Unable to load debate");
  }

  return (await response.json()) as Debate;
}

export async function getDebateMessages(debateId: number) {
  const response = await fetch(`${apiBaseUrl}/debates/${debateId}/messages`, {
    headers: authHeaders(),
  });
  if (!response.ok) throw new Error("Unable to load debate conversation");
  return (await response.json()) as DebateHistoryMessage[];
}

export async function sendDebateMessage(debateId: number, message: string) {
  const response = await fetch(`${apiBaseUrl}/debates/${debateId}/message`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? "Failed to send message");
  }

  return (await response.json()) as DebateResponse;
}

export async function completeDebate(debateId: number) {
  const response = await fetch(`${apiBaseUrl}/debates/${debateId}/complete`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? "Failed to complete debate");
  }

  return (await response.json()) as DebateResponse;
}

export async function getUserProfile() {
  const response = await fetch(`${apiBaseUrl}/profile`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Unable to load profile");
  }

  return (await response.json()) as UserProfile;
}

export async function updateUserProfile(payload: {
  bio?: string;
  expertise_areas?: string;
}) {
  const response = await fetch(`${apiBaseUrl}/profile`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? "Failed to update profile");
  }

  return (await response.json()) as UserProfile;
}

export async function getUserSkills() {
  const response = await fetch(`${apiBaseUrl}/profile/skills`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Unable to load skills");
  }

  return (await response.json()) as Skill[];
}

export async function updateUserSkills(
  skills: Array<{ skill_name: string; score: number }>
) {
  const response = await fetch(`${apiBaseUrl}/profile/skills`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify(skills),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? "Failed to update skills");
  }

  return (await response.json()) as Skill[];
}

// ============================================================================
// Presentation API
// ============================================================================

export type Presentation = {
  id: number;
  user_id: number;
  title: string;
  file_name: string;
  file_path: string;
  status: string;
  created_at: string;
  updated_at: string;
};

export async function getPresentations() {
  const response = await fetch(`${apiBaseUrl}/presentations`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Unable to load presentations");
  }

  return (await response.json()) as Presentation[];
}

export async function createPresentation(payload: {
  title: string;
  file_name: string;
  file_path: string;
}) {
  const response = await fetch(`${apiBaseUrl}/presentations`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? "Failed to create presentation");
  }

  return (await response.json()) as Presentation;
}

// ============================================================================
// Analytics & Reports API
// ============================================================================

export async function getPerformanceReport() {
  const response = await fetch(`${apiBaseUrl}/analytics/me/performance-report`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Unable to load performance report");
  }

  return await response.json();
}

export async function getActivityLog(days: number = 7) {
  const response = await fetch(`${apiBaseUrl}/analytics/dashboard/activity-log?days=${days}`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Unable to load activity log");
  }

  return await response.json();
}

export async function getRecommendations() {
  const response = await fetch(`${apiBaseUrl}/analytics/me/recommendations`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Unable to load recommendations");
  }

  return (await response.json()) as {
    user_id: number;
    weak_areas: string[];
    recommendations: string[];
    practice_plan: string[];
    summary: string;
  };
}

export async function askCoach(message: string, context?: Record<string, string>) {
  const response = await fetch(`${apiBaseUrl}/analysis/coach`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ message, context: context ?? {} }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.detail ?? "Unable to get coaching advice");
  }

  return (await response.json()) as {
    response: string;
    practice_prompt: string;
    focus_areas: string[];
    topic: string;
    position: string;
  };
}

// ============================================================================
// Notifications API
// ============================================================================

export type Notification = {
  id: number;
  user_id: number;
  notification_type: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

export async function getNotifications(unreadOnly: boolean = false) {
  const url = new URL(`${apiBaseUrl}/notifications`);
  if (unreadOnly) {
    url.searchParams.append("unread_only", "true");
  }

  const response = await fetch(url.toString(), {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Unable to load notifications");
  }

  return (await response.json()) as Notification[];
}

export async function getUnreadCount() {
  const response = await fetch(`${apiBaseUrl}/notifications/unread-count`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Unable to load unread count");
  }

  return (await response.json()) as { unread_count: number };
}

export async function markNotificationAsRead(notificationId: number) {
  const response = await fetch(`${apiBaseUrl}/notifications/${notificationId}/read`, {
    method: "PUT",
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to mark notification as read");
  }

  return (await response.json()) as Notification;
}

// ============================================================================
// Admin API
// ============================================================================

export async function getAdminUsers() {
  const response = await fetch(`${apiBaseUrl}/admin/users`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Unable to load users");
  }

  return await response.json();
}

export async function getAdminStatistics() {
  const response = await fetch(`${apiBaseUrl}/admin/statistics`, {
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Unable to load statistics");
  }

  return await response.json();
}

export async function deactivateUser(userId: number) {
  const response = await fetch(`${apiBaseUrl}/admin/users/${userId}/deactivate`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to deactivate user");
  }

  return await response.json();
}

export async function activateUser(userId: number) {
  const response = await fetch(`${apiBaseUrl}/admin/users/${userId}/activate`, {
    method: "POST",
    headers: authHeaders(),
  });

  if (!response.ok) {
    throw new Error("Failed to activate user");
  }

  return await response.json();
}
