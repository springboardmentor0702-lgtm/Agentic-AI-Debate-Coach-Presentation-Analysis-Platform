import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "LOGOS.AI API Gateway",
    version: "4.0.0",
    engine: "online",
    timestamp: new Date().toISOString(),
  });
}
