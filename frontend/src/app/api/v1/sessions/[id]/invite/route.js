import { NextResponse } from "next/server";
import { invitations, participants } from "@/lib/serverStore";

export async function POST(request, { params }) {
  try {
    const sessionId = Number(params?.id);
    const body = await request.json().catch(() => ({}));

    const newInvitation = {
      id: invitations.length + 1,
      session_id: sessionId,
      session_title: body.session_title || `Debate Session #${sessionId}`,
      inviter_id: 1,
      inviter_name: "Alex Vance",
      invited_user_id: body.user_id ? Number(body.user_id) : null,
      invited_name: body.email ? body.email.split("@")[0] : `User #${body.user_id}`,
      invited_email: body.email || null,
      position: body.position || "Affirmative",
      team: body.team || null,
      message: body.message || null,
      expires_at: body.expires_at || null,
      status: "Pending",
      created_at: new Date().toISOString(),
    };

    invitations.unshift(newInvitation);

    // Also register pending participant record
    participants.push({
      id: participants.length + 1,
      session_id: sessionId,
      user_id: newInvitation.invited_user_id || 99,
      display_name: newInvitation.invited_name,
      invited_email: newInvitation.invited_email,
      position: newInvitation.position,
      team: newInvitation.team,
      participant_role: "Invited Debater",
      invitation_status: "Pending",
    });

    return NextResponse.json(newInvitation, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error.message || "Failed to send invitation" },
      { status: 500 }
    );
  }
}
