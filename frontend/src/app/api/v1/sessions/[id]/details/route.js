import { NextResponse } from "next/server";
import { sessions } from "@/lib/serverStore";

export async function GET(request, { params }) {
  const sessionId = Number(params?.id);
  const found = sessions.find((s) => s.id === sessionId);

  if (!found) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  return NextResponse.json(found);
}
