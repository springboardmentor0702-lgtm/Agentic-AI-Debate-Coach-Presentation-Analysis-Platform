import { NextResponse } from "next/server";
import { invitations, participants } from "@/lib/serverStore";

export async function PATCH(request, { params }) {
  const invId = Number(params?.id);
  const found = invitations.find((i) => i.id === invId);

  if (found) {
    found.status = "Declined";
    const part = participants.find((p) => p.session_id === found.session_id && (p.user_id === found.invited_user_id || p.invited_email === found.invited_email));
    if (part) {
      part.invitation_status = "Declined";
    }
  }

  return NextResponse.json({ success: true, message: "Invitation declined", invitation: found });
}
