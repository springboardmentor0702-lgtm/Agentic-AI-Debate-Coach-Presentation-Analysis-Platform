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

export async function PUT(request, { params }) {
  const sessionId = Number(params?.id);
  const body = await request.json().catch(() => ({}));
  const found = sessions.find((s) => s.id === sessionId);

  if (!found) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  if (body.title) found.title = body.title;
  if (body.topic) found.topic = body.topic;
  if (body.description !== undefined) found.description = body.description;
  if (body.format) found.format = body.format;
  if (body.assigned_position) found.assigned_position = body.assigned_position;
  if (body.scheduled_at) found.scheduled_at = body.scheduled_at;
  if (body.timezone) found.timezone = body.timezone;
  if (body.duration_minutes) found.duration_minutes = Number(body.duration_minutes);
  if (body.visibility) found.visibility = body.visibility;
  if (body.status) found.status = body.status;

  return NextResponse.json(found);
}

export async function DELETE(request, { params }) {
  const sessionId = Number(params?.id);
  const index = sessions.findIndex((s) => s.id === sessionId);
  if (index !== -1) {
    sessions.splice(index, 1);
  }
  return NextResponse.json({ success: true, message: "Session deleted" });
}
