import { NextResponse } from "next/server";
import { sessions, persistStoreToDisk } from "@/lib/serverStore";
import { getAuthUser } from "@/lib/authServer";

export async function PATCH(request, { params }) {
  const sessionId = Number(params?.id);
  const body = await request.json().catch(() => ({}));
  const found = sessions.find((s) => s.id === sessionId);

  if (!found) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const authUser = getAuthUser(request);

  if (body.status) {
    found.status = body.status;
    if (body.status === "Completed") {
      found.completed_at = new Date().toISOString();
      const completedRecord = {
        id: found.id,
        user_id: authUser?.id || authUser?.user_id || found.user_id || 1,
        user_email: authUser?.email || found.user_email || null,
        user_name: authUser?.name || found.user_name || "Debater",
        topic: found.topic || found.title || "Debate Session",
        format: found.format || "Oxford Debate",
        position: found.assigned_position || "Affirmative",
        score: found.score || 88,
        status: "Completed",
        date: new Date().toISOString().split("T")[0],
        completed_at: new Date().toISOString(),
        fallacies: found.fallacies || [],
        scores: {
          overall: found.score || 88,
          argQuality: 88,
          consistency: 85,
          evidence: 84,
          rebuttal: 86,
          communication: 88,
        },
      };
      const authorization = request.headers.get("authorization");
      if (authorization) {
        const saveResponse = await fetch(`${process.env.BACKEND_URL || "http://127.0.0.1:5000"}/api/v1/debates/history`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: authorization },
          body: JSON.stringify(completedRecord),
          cache: "no-store"
        });
        if (!saveResponse.ok) return NextResponse.json({ error: "Status updated, but MongoDB debate save failed." }, { status: 502 });
      }
    }
  }

  persistStoreToDisk();

  return NextResponse.json(found);
}
