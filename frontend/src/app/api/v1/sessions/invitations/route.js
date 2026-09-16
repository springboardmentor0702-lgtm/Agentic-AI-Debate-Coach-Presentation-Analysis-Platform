import { NextResponse } from "next/server";
import { invitations } from "@/lib/serverStore";

export async function GET() {
  const sent = invitations.filter((i) => i.inviter_id === 1);
  const received = invitations.filter((i) => i.invited_user_id === 1 || i.invited_email === "alex@example.com");

  return NextResponse.json({
    sent,
    received,
  });
}
