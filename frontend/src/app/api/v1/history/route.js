import { NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:5000";

export async function DELETE(request) {
  const type = new URL(request.url).searchParams.get("type");
  const endpoint = type === "presentations" ? "/api/v1/presentations" : type === "debates" ? "/api/v1/debates/history" : null;
  if (!endpoint) return NextResponse.json({ error: "Invalid history type" }, { status: 400 });

  const response = await fetch(`${BACKEND_URL}${endpoint}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      Authorization: request.headers.get("authorization") || ""
    },
    body: JSON.stringify(await request.json().catch(() => ({}))),
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}