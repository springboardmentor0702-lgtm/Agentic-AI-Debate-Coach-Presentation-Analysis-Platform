import { NextResponse } from "next/server";
import { participants } from "@/lib/serverStore";

export async function GET(request, { params }) {
  const sessionId = Number(params?.id);
  const sessionParticipants = participants.filter((p) => p.session_id === sessionId);
  return NextResponse.json(sessionParticipants);
}

export async function POST(request, { params }) {
  const sessionId = Number(params?.id);
  const body = await request.json().catch(() => ({}));

  const newParticipant = {
    id: participants.length + 1,
    session_id: sessionId,
    user_id: body.user_id || participants.length + 1,
    display_name: body.display_name || body.name || "Debate Participant",
    invited_email: body.email || "participant@example.com",
    position: body.position || "Affirmative",
    team: body.team || "Team A",
    participant_role: body.role || "Debater",
    invitation_status: "Accepted",
  };

  participants.push(newParticipant);
  return NextResponse.json(newParticipant, { status: 201 });
}
