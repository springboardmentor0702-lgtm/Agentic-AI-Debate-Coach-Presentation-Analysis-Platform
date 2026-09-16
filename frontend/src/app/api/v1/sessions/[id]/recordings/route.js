import { NextResponse } from "next/server";
import { recordings } from "@/lib/serverStore";

export async function GET(request, { params }) {
  const sessionId = Number(params?.id);
  const sessionRecordings = recordings.filter((r) => r.session_id === sessionId);
  return NextResponse.json(sessionRecordings);
}
