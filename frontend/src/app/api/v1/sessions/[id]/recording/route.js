import { NextResponse } from "next/server";
import { recordings, sessions } from "@/lib/serverStore";
import { getAuthUser } from "@/lib/authServer";

export async function POST(request, { params }) {
  try {
    const sessionId = Number(params?.id) || Date.now();
    const authUser = getAuthUser(request);
    let recordingType = "audio";
    let durationSeconds = 120;
    let transcript = "Debate speech recording";
    let recordingPath = "";
    let userId = authUser?.id || authUser?.user_id || 1;

    const contentType = request.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      recordingType = formData.get("recording_type")?.toString() || "audio";
      const dur = formData.get("duration_seconds");
      if (dur) durationSeconds = Number(dur) || 120;
      transcript = formData.get("transcript")?.toString() || "";
      recordingPath = formData.get("recording_path")?.toString() || `/uploads/recordings/session-${sessionId}-${Date.now()}.webm`;
      const uid = formData.get("user_id");
      if (uid) userId = Number(uid) || userId;
    } else {
      const body = await request.json().catch(() => ({}));
      recordingType = body.recording_type || "audio";
      durationSeconds = Number(body.duration_seconds) || 120;
      transcript = body.transcript || "";
      recordingPath = body.recording_path || `/uploads/recordings/session-${sessionId}-${Date.now()}.webm`;
      if (body.user_id) userId = Number(body.user_id) || userId;
    }

    const newRecording = {
      id: recordings.length + 1,
      session_id: sessionId,
      recording_type: recordingType,
      duration_seconds: durationSeconds,
      recording_path: recordingPath,
      transcript: transcript || "Recorded speech segment",
      created_at: new Date().toISOString(),
      user_id: userId
    };

    recordings.unshift(newRecording);

    // Find and update session if present
    const session = sessions.find((s) => s.id === sessionId);
    if (session) {
      session.recording_path = recordingPath;
      session.duration_seconds = durationSeconds;
      session.transcript = transcript || session.transcript;
      session.status = "Recorded";
      if (!session.user_id) session.user_id = userId;
    }

    // Explicitly record to debateHistory so Analytics & Dashboard immediately reflect it
    const debateRecord = {
      id: sessionId,
      user_id: userId,
      user_email: authUser?.email || session?.user_email || null,
      user_name: authUser?.name || session?.user_name || "Debater",
      topic: session?.topic || session?.title || "Live Debate Recording Session",
      format: session?.format || "Parliamentary Debate",
      position: session?.assigned_position || "Affirmative",
      score: 86,
      status: "Recorded",
      date: new Date().toISOString().split("T")[0],
      completed_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
      duration: `${durationSeconds}s`,
      recording_path: recordingPath,
      recording_type: recordingType,
      transcript: transcript || "Speech audio captured and recorded.",
      turnsCount: 1,
      fallacies: [],
      scores: {
        overall: 86,
        argQuality: 88,
        consistency: 86,
        evidence: 84,
        rebuttal: 85,
        communication: 87
      },
      verdict: `${session?.assigned_position || "Affirmative"} Recording Archived`,
      executive_summary: `Live debate speech recording captured (${durationSeconds}s). Audio and transcript saved to debate archive.`,
      coaching_review: `Review pacing and delivery cadence against counterarguments. Practice cross-examination transitions.`
    };

    const authorization = request.headers.get("authorization");
    if (authorization) {
      const saveResponse = await fetch(`${process.env.BACKEND_URL || "http://127.0.0.1:5000"}/api/v1/debates/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: authorization },
        body: JSON.stringify(debateRecord),
        cache: "no-store"
      });
      if (!saveResponse.ok) throw new Error("Recording created, but MongoDB debate save failed.");
    }


    return NextResponse.json({
      success: true,
      recording: newRecording,
      debateRecord
    }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to save recording" },
      { status: 500 }
    );
  }
}
