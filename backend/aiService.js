const AI_ENGINE_URL = process.env.AI_ENGINE_URL || "http://127.0.0.1:8000";

let genAI = null;
try {
  const { GoogleGenerativeAI } = require("@google/generative-ai");
  const key = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
  if (key) {
    genAI = new GoogleGenerativeAI(key);
  }
} catch (e) {
  console.warn("GoogleGenerativeAI package optional init warning:", e.message);
}

/**
 * Process a typed debate turn using the FastAPI AI Engine,
 * with graceful fallback to direct Gemini model invocation.
 */
async function processDebateTurn({
  sessionId = "session-default",
  format = "Oxford Debate",
  argument = "",
  history = [],
  opponentPersona = "The Contrarian",
  customScenario = null,
  difficulty = "Intermediate",
  durationSec = null,
}) {
  // 1. Try FastAPI AI Engine
  try {
    const res = await fetch(`${AI_ENGINE_URL}/api/v1/debate/turn-text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: String(sessionId),
        debate_format: format,
        argument: argument,
        history: history.map((h) => ({
          role: h.role || (h.speaker === "You" ? "user" : "assistant"),
          content: h.content || h.text || "",
        })),
        opponent_persona: opponentPersona,
        custom_scenario: customScenario,
        difficulty: difficulty,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        aiRebuttal: data.ai_rebuttal,
        userTranscript: data.user_transcript,
        presentationMetrics: data.presentation_metrics,
        fallacyMetrics: data.fallacy_metrics,
        deliveryMetrics: data.delivery_metrics,
        argumentAnalysis: data.argument_analysis,
        contextSummary: data.context_summary,
        // Flat score shortcuts for legacy models
        communicationScore: data.delivery_metrics?.clarity_score || 85,
        argumentScore: data.argument_analysis?.persuasiveness_score || 85,
        confidenceScore: data.delivery_metrics?.confidence_score || 85,
        feedback: data.ai_rebuttal,
      };
    }
  } catch (err) {
    console.warn("AI Engine unreachable, falling back to direct LLM:", err.message);
  }

  // 2. Fallback to Gemini SDK
  if (genAI) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-3.7-flash" });
      const prompt = `You are an elite AI debate opponent and coach (${opponentPersona}) in a ${format} debate.
Argument: "${argument}"

Provide:
1. Rebuttal (2-4 sentences challenging the argument)
2. Fallacy detection (flag if any fallacy like Straw Man, False Dilemma, Ad Hominem, or none)
3. Scores (0-100) for clarity, evidence, consistency, persuasiveness, confidence.
4. Coaching tip

Return ONLY JSON:
{
  "ai_rebuttal": "...",
  "fallacy_detected": false,
  "fallacy_type": null,
  "communicationScore": 85,
  "argumentScore": 85,
  "confidenceScore": 85,
  "coaching_tip": "..."
}`;
      const result = await model.generateContent(prompt);
      const text = result.response.text().replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      return {
        aiRebuttal: parsed.ai_rebuttal || "I challenge your premise directly based on empirical precedent.",
        feedback: parsed.ai_rebuttal || "I challenge your premise directly.",
        communicationScore: parsed.communicationScore || 85,
        argumentScore: parsed.argumentScore || 85,
        confidenceScore: parsed.confidenceScore || 85,
        fallacyMetrics: {
          fallacy_detected: !!parsed.fallacy_detected,
          fallacy_type: parsed.fallacy_type || null,
        },
        argumentAnalysis: {
          clarity_score: parsed.communicationScore || 85,
          relevance_score: parsed.argumentScore || 85,
          evidence_strength_score: 80,
          logical_consistency_score: 85,
          persuasiveness_score: parsed.argumentScore || 85,
          strengths: ["Clear core proposition"],
          weaknesses: [{ issue: "Could cite specific empirical data", strongerVersion: "Include audited metrics" }],
        },
      };
    } catch (e) {
      console.warn("Gemini fallback failed:", e.message);
    }
  }

  // 3. Deterministic safe fallback
  return {
    aiRebuttal: `While your assertion regarding this motion is noted, it fails to account for operational constraints and historical counter-examples. How do you reconcile this with systemic compliance requirements?`,
    feedback: `While your assertion is noted, consider grounding your points in stronger empirical evidence.`,
    communicationScore: 82,
    argumentScore: 84,
    confidenceScore: 80,
    fallacyMetrics: {
      fallacy_detected: false,
      fallacy_type: null,
      offending_quote: null,
      explanation: null,
      correction_suggestion: null,
    },
    argumentAnalysis: {
      clarity_score: 82,
      relevance_score: 85,
      evidence_strength_score: 80,
      logical_consistency_score: 84,
      persuasiveness_score: 83,
      strengths: ["Articulate structure", "Clear thesis"],
      weaknesses: [{ issue: "Evidence cited could be more concrete", strongerVersion: "Add specific case studies" }],
    },
  };
}

/**
 * Presentation vocal and prosody analysis
 */
async function analyzePresentation({ speechText, durationSeconds = 60 }) {
  try {
    const res = await fetch(`${AI_ENGINE_URL}/api/v1/presentation/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        speech_text: speechText,
        duration_seconds: parseFloat(durationSeconds) || 60,
      }),
      signal: AbortSignal.timeout(10000),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn("AI Engine presentation endpoint unreachable:", err.message);
  }

  // Fallback calculation
  const words = (speechText || "").trim().split(/\s+/).filter(Boolean);
  const minutes = Math.max(0.1, (parseFloat(durationSeconds) || 60) / 60);
  const wpm = Math.round(words.length / minutes) || 135;
  const fillers = ["um", "uh", "like", "basically", "you know"];
  let fillerCount = 0;
  const lower = (speechText || "").toLowerCase();
  fillers.forEach((f) => {
    fillerCount += (lower.split(f).length - 1);
  });

  return {
    speech_pace_wpm: wpm,
    words_per_minute: wpm,
    pace_status: wpm >= 120 && wpm <= 160 ? "Optimal" : wpm < 120 ? "Slow" : "Fast",
    filler_words_count: fillerCount,
    filler_word_count: fillerCount,
    confidence_score: 86,
    clarity_score: 89,
    engagement_score: 88,
    feedback: {
      strengths: ["Controlled delivery pace", "Clear thesis articulation"],
      areas_for_improvement: ["Minimize transitional filler words"],
    },
  };
}

/**
 * Legacy feedback wrapper
 */
const generateFeedback = async (topic, stance, argument) => {
  const result = await processDebateTurn({
    sessionId: "legacy-session",
    format: "One-on-One Debate",
    argument: argument,
    opponentPersona: "The Contrarian",
  });
  return {
    feedback: result.feedback || result.aiRebuttal,
    communicationScore: result.communicationScore,
    argumentScore: result.argumentScore,
    confidenceScore: result.confidenceScore,
    presentationMetrics: result.presentationMetrics,
    argumentAnalysis: result.argumentAnalysis,
    fallacyDetails: result.fallacyMetrics,
  };
};

module.exports = generateFeedback;
module.exports.generateFeedback = generateFeedback;
module.exports.processDebateTurn = processDebateTurn;
module.exports.analyzePresentation = analyzePresentation;
