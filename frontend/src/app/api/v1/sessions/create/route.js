import { NextResponse } from "next/server";
import { sessions, participants, persistStoreToDisk } from "@/lib/serverStore";
import { getAuthUser } from "@/lib/authServer";

export async function POST(request) {
  try {
    const authUser = getAuthUser(request);
    const url = new URL(request.url);
    const userIdQuery = url.searchParams.get("user_id");
    const body = await request.json().catch(() => ({}));

    const newSession = {
      id: sessions.length + 1,
      user_id: authUser?.id || authUser?.user_id || Number(userIdQuery) || Number(body.user_id) || 1,
      user_email: authUser?.email || body.user_email || null,
      user_name: authUser?.name || body.user_name || null,
      title: body.title || "Untitled Debate Session",
      topic: body.topic || "Debate Topic",
      description: body.description || "",
      format: body.format || "Oxford Debate",
      assigned_position: body.assigned_position || "Affirmative",
      scheduled_at: body.scheduled_at || new Date().toISOString(),
      timezone: body.timezone || "UTC",
      duration_minutes: Number(body.duration_minutes) || 45,
      visibility: body.visibility || "Public",
      status: "Active",
      team: body.team || "Creator Team",
      created_at: new Date().toISOString(),
    };

    sessions.unshift(newSession);

    // Also add creator as participant
    participants.push({
      id: participants.length + 1,
      session_id: newSession.id,
      user_id: newSession.user_id,
      display_name: newSession.user_name || "You (Creator)",
      invited_email: newSession.user_email || "creator@logos.ai",
      position: newSession.assigned_position,
      team: newSession.team,
      participant_role: "Debater",
      invitation_status: "Accepted",
    });

    persistStoreToDisk();

    return NextResponse.json(newSession, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to create session" },
      { status: 500 }
    );
  }
}
