import { NextResponse } from "next/server";
import { sessions, getDebateTurns } from "@/lib/serverStore";
import { generateDebateEndingReport } from "@/lib/geminiHelper";
import { getAuthUser } from "@/lib/authServer";

export async function POST(request, { params }) {
  const sessionId = Number(params?.id) || Date.now();
  const body = await request.json().catch(() => ({}));
  const authUser = getAuthUser(request);
  const found = sessions.find((s) => s.id === sessionId);

  const storedTurns = getDebateTurns(sessionId);
  const fallacies = Array.isArray(body.fallacies) && body.fallacies.length > 0 ? body.fallacies : [];
  storedTurns.forEach((t) => {
    if (t.fallacies && Array.isArray(t.fallacies)) {
      t.fallacies.forEach((f) => {
        if (f && f.fallacy_type && f.fallacy_type !== "None") {
          fallacies.push(f);
        }
      });
    }
  });

  const topic = (body.topic || found?.topic || "Autonomous AI Systems should be held legally liable for unintended damages.").trim();
  const format = body.format || found?.format || "Parliamentary Debate";
  const position = body.position || found?.assigned_position || "Affirmative";
  const opponentPersona = body.opponent_persona || found?.opponent_persona || "The Contrarian";
  const transcript = Array.isArray(body.transcript) && body.transcript.length > 0 ? body.transcript : [];

  let report = body.report;
  if (!report || !report.coaching_review) {
    report = await generateDebateEndingReport({
      topic,
      format,
      userPosition: position,
      opponentPersona,
      transcript,
      fallacies,
      finalScores: body.scores,
    });
  }

  const score = report?.scores?.overall || body.scores?.overall || body.scores?.argQuality || 86;

  const completedRecord = {
    id: sessionId,
    user_id: authUser?.id || authUser?.user_id || body.user_id || (found?.user_id) || 1,
    user_email: authUser?.email || body.user_email || (found?.user_email) || null,
    user_name: authUser?.name || body.user_name || (found?.user_name) || "Debater",
    topic,
    format,
    position,
    opponent_persona: opponentPersona,
    score: typeof score === "number" ? Math.round(score) : 86,
    status: "Completed",
    date: new Date().toISOString().split("T")[0],
    completed_at: new Date().toISOString(),
    fallacies,
    turnsCount: transcript.length > 0 ? transcript.length : storedTurns.length,
    transcript,
    scores: report?.scores || body.scores || {
      overall: score,
      argQuality: body.scores?.argQuality || 88,
      consistency: body.scores?.consistency || 88,
      evidence: body.scores?.evidence || 82,
      rebuttal: body.scores?.rebuttal || 84,
      communication: body.scores?.communication || 88,
    },
    executive_summary: report?.executive_summary || `Comprehensive debate round completed on "${topic}".`,
    verdict: report?.verdict || `${position} Ballot Awarded`,
    strengths: report?.strengths || [
      `Maintained consistent thematic focus on "${topic}".`,
      `Demonstrated active rebuttal against ${opponentPersona}.`,
    ],
    areas_for_improvement: report?.areas_for_improvement || [
      `Ground theoretical assertions with empirical case studies.`,
      `Reinforce causal warrants against opponent cross-examination.`,
    ],
    coaching_review: report?.coaching_review || `Formulate strategic cross-examination questions and substantiate your key points with empirical data to overcome ${opponentPersona}.`,
  };

  const authorization = request.headers.get("authorization");
  if (authorization) {
    const saveResponse = await fetch(`${process.env.BACKEND_URL || "http://127.0.0.1:5000"}/api/v1/debates/history`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authorization },
      body: JSON.stringify(completedRecord),
      cache: "no-store"
    });
    if (!saveResponse.ok) {
      return NextResponse.json({ error: "Debate completed, but MongoDB save failed." }, { status: 502 });
    }
  }

  if (found) {
    found.status = "Completed";
    found.completed_at = new Date().toISOString();
    found.scores = completedRecord.scores;
    found.coaching_review = completedRecord.coaching_review;
    found.report = completedRecord;
    if (completedRecord.user_email && !found.user_email) found.user_email = completedRecord.user_email;
  }

  return NextResponse.json(completedRecord);
}

