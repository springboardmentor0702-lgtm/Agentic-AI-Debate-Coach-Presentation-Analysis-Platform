const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function fetchWithHandler(url, options = {}) {
  try {
    const response = await fetch(`${API_BASE}${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch (e) {
        throw new ApiError('An unexpected error occurred.', response.status);
      }
      throw new ApiError(errorData.detail || 'An error occurred', response.status);
    }

    return await response.json();
  } catch (error) {
    console.error(`API Request failed for ${url}:`, error);
    throw error;
  }
}

// --- Analysis API ---
export const analyzeArgument = (text) => 
  fetchWithHandler('/analysis/argument', { method: 'POST', body: JSON.stringify({ argument_text: text }) });

export const detectFallacies = (text) => 
  fetchWithHandler('/analysis/fallacy', { method: 'POST', body: JSON.stringify({ argument_text: text }) });

export const fullAnalysis = (text) => 
  fetchWithHandler('/analysis/full', { method: 'POST', body: JSON.stringify({ argument_text: text }) });

// --- Debate Simulation API ---
export const startDebate = (topic, stance, difficulty = 'intermediate') => 
  fetchWithHandler('/debate/start', { method: 'POST', body: JSON.stringify({ topic, opponent_stance: stance, difficulty }) });

export const submitDebateTurn = (sessionId, userMessage) => 
  fetchWithHandler(`/debate/${sessionId}/turn`, { method: 'POST', body: JSON.stringify({ user_message: userMessage }) });

export const getDebateTranscript = (sessionId) => 
  fetchWithHandler(`/debate/${sessionId}/transcript`, { method: 'GET' });

export const endDebate = (sessionId) => 
  fetchWithHandler(`/debate/${sessionId}/end`, { method: 'POST' });

// --- Pipeline (Evaluation/Coaching) API ---
export const evaluateDebate = (topic, transcript) => 
  fetchWithHandler('/pipeline/evaluate', { method: 'POST', body: JSON.stringify({ topic, transcript }) });

export const generateCoaching = (evaluation) => 
  fetchWithHandler('/pipeline/coaching', { method: 'POST', body: JSON.stringify({ evaluation }) });

// --- History API ---
export const getSessions = () => 
  fetchWithHandler('/history/sessions', { method: 'GET' });

export const getSessionDetail = (sessionId) => 
  fetchWithHandler(`/history/sessions/${sessionId}`, { method: 'GET' });
