import { NextResponse } from "next/server";
import { participants } from "@/lib/serverStore";

export async function DELETE(request, { params }) {
  const participantId = Number(params?.participantId);
  const index = participants.findIndex((p) => p.id === participantId);

  if (index !== -1) {
    participants.splice(index, 1);
  }

  return NextResponse.json({ success: true, message: "Participant removed" });
}
