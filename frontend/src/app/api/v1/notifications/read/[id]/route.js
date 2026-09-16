import { NextResponse } from "next/server";
import { notifications } from "@/lib/serverStore";

export async function POST(request, { params }) {
  const notifId = Number(params?.id);
  const found = notifications.find((n) => n.id === notifId);
  if (found) {
    found.read = true;
  }
  return NextResponse.json({ success: true, message: "Marked as read" });
}
