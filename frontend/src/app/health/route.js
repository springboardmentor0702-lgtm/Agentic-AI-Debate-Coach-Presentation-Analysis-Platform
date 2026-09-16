import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "LOGOS.AI Rhetoric Platform",
    version: "4.0.0",
    timestamp: new Date().toISOString(),
  });
}
