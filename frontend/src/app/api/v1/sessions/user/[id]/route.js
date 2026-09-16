import { NextResponse } from "next/server";
import { sessions } from "@/lib/serverStore";

export async function GET(request, { params }) {
  const userId = Number(params?.id) || 1;
  const userSessions = sessions.filter((s) => s.user_id === userId);
  return NextResponse.json(userSessions);
}
