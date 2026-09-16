import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authServer";

export async function GET(request) {
  const user = getAuthUser(request);
  const { searchParams } = new URL(request.url);
  const prefix = searchParams.get("role") === "educator" || user?.role?.toLowerCase() === "educator" ? "educator" : "coach";
  const backend = process.env.BACKEND_URL || "http://127.0.0.1:5000";
  const response = await fetch(`${backend}/${prefix}/class-dashboard`, {
    headers: { Authorization: request.headers.get("authorization") || "" },
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}
