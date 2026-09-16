import { NextResponse } from "next/server";
import { participants, sessions } from "@/lib/serverStore";

export async function POST(request, { params }) {
  const sessionId = Number(params?.id);
  const foundSession = sessions.find((s) => s.id === sessionId);

  const existing = participants.find((p) => p.session_id === sessionId && p.user_id === 1);
  if (!existing) {
    participants.push({
      id: participants.length + 1,
      session_id: sessionId,
      user_id: 1,
      display_name: "Alex Vance (You)",
      invited_email: "alex@example.com",
      position: foundSession?.assigned_position || "Affirmative",
      team: foundSession?.team || "Government",
      participant_role: "Debater",
      invitation_status: "Accepted",
    });
  }

  return NextResponse.json({ success: true, message: "Joined debate session" });
}
