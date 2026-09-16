import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authServer";

export async function GET(request, { params }) {
  const user = getAuthUser(request);
  const role = user?.role?.toLowerCase();
  const prefix = role === "educator" ? "educator" : "coach";
  const backend = process.env.BACKEND_URL || "http://127.0.0.1:5000";
  const historyId = new URL(request.url).searchParams.get("historyId");
  const response = await fetch(`${backend}/${prefix}/learner/${params.id}/debate-history${historyId ? `/${historyId}` : ""}`, {
    headers: { Authorization: request.headers.get("authorization") || "" },
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(historyId ? data : { history: Array.isArray(data) ? data : [] }, { status: response.status });
}
