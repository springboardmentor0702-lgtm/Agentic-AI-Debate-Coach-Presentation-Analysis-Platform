import { NextResponse } from "next/server";
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:5000";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const authorization = request.headers.get("authorization");
    if (!authorization) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    const response = await fetch(`${BACKEND_URL}/api/v1/dashboard/analytics`, {
      headers: { Authorization: authorization },
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error.message || "Failed to sync client data" }, { status: 500 });
  }
}
