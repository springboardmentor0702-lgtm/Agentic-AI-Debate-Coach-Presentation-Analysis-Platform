import { NextResponse } from "next/server";
import { generateDebateResponse } from "@/lib/geminiHelper";
import { sessions, addDebateTurn } from "@/lib/serverStore";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:5000";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const {
      topic,
      user_input = "",
      user_argument = "",
      history = [],
      opponent_persona = "The Contrarian",
      format = "Parliamentary Debate",
      session_id,
      user_position = "Affirmative",
      opponent_position = null,
      difficulty = "Intermediate",
    } = body;

    const inputArg = user_input || user_argument || "";

    // Resolve accurate topic: prioritize explicitly provided topic, then session
    let currentTopic = (topic || "").trim();
    if (session_id) {
      const foundSession = sessions.find((s) => s.id === session_id || s.id === Number(session_id));
      if (foundSession) {
        if (!currentTopic && foundSession.topic) {
          currentTopic = foundSession.topic;
        } else if (currentTopic) {
          foundSession.topic = currentTopic;
        }
      }
    }
    if (!currentTopic) {
      currentTopic = "Autonomous AI Systems should be held legally liable for unintended damages.";
    }

    // 1. First attempt: call Backend API Gateway (which orchestrates the AI Engine)
    try {
      const backendRes = await fetch(`${BACKEND_URL}/api/v1/simulation/turn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id,
          topic: currentTopic,
          user_input: inputArg,
          user_argument: inputArg,
          history,
          opponent_persona,
          format,
          user_position,
          opponent_position,
          difficulty,
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (backendRes.ok) {
        const backendData = await backendRes.json();
        if (session_id) {
          addDebateTurn(session_id, {
            turn_number: backendData.turn_number || history.length + 1,
            user_input: inputArg,
            opponent_response: backendData.opponent_response || backendData.opponent_rebuttal,
            fallacies: backendData.fallacies_detected_in_user || (backendData.fallacy_detected ? [{
              fallacy_type: backendData.fallacy_type,
              offending_text: backendData.offending_text,
              explanation: backendData.explanation,
              correction_suggestion: backendData.correction_suggestion,
              severity: backendData.severity,
              confidence: backendData.confidence
            }] : []),
          });
        }
        return NextResponse.json(backendData);
      }
    } catch (backendErr) {
      // Backend not running on port 5000, seamlessly route through primary Next.js AI pipeline
    }

    // 2. Direct Gemini / Engine Fallback
    const result = await generateDebateResponse({
      topic: currentTopic,
      userInput: inputArg,
      history,
      opponentPersona: opponent_persona,
      format,
      userPosition: user_position,
      opponentPosition: opponent_position,
      difficulty,
    });

    const turnPayload = {
      success: true,
      turn_number: (history.length || 0) + 1,
      topic: currentTopic,
      user_input: inputArg,
      user_transcript: inputArg,
      opponent_response: result.opponentResponse,
      opponent_rebuttal: result.opponentResponse,
      rebuttal_strength_percent: result.scores?.rebuttal || 85,
      fallacy_detected: result.fallacy_detected,
      fallacy_type: result.fallacy_type,
      offending_text: result.offending_text,
      explanation: result.explanation,
      severity: result.severity,
      confidence: result.confidence,
      fallacies_detected_in_user: result.fallacies || [],
      primary_fallacy: result.fallacyDetected,
      audit: result.audit,
      scores: result.scores,
      coaching_tip: result.coachingTip,
      created_at: new Date().toISOString(),
    };

    if (session_id) {
      addDebateTurn(session_id, {
        turn_number: turnPayload.turn_number,
        user_input: inputArg,
        opponent_response: turnPayload.opponent_response,
        fallacies: result.fallacies || [],
      });
    }

    return NextResponse.json(turnPayload);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to process debate turn",
      },
      { status: 500 }
    );
  }
}

