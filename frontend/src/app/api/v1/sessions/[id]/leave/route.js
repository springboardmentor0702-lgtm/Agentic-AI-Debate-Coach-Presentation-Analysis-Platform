import { NextResponse } from "next/server";
import { participants } from "@/lib/serverStore";

export async function POST(request, { params }) {
  const sessionId = Number(params?.id);
  const index = participants.findIndex((p) => p.session_id === sessionId && p.user_id === 1);
  if (index !== -1) {
    participants.splice(index, 1);
  }
  return NextResponse.json({ success: true, message: "Left debate session" });
}
