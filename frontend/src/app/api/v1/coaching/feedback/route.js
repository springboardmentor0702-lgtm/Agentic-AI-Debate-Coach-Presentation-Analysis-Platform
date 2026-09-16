import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authServer";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { historyId, feedback } = body;

    if (!historyId || !feedback) {
      return NextResponse.json(
        { success: false, error: "Both student identifier and feedback text are required." },
        { status: 400 }
      );
    }

    const role = getAuthUser(request)?.role?.toLowerCase() || "coach";
    const endpoint = role === "educator" ? `/educator/debate-history/${historyId}/review` : `/coach/debate-history/${historyId}/review`;
    const response = await fetch(`${process.env.BACKEND_URL || "http://127.0.0.1:5000"}${endpoint}`, { method: "PUT", headers: { "Content-Type": "application/json", Authorization: request.headers.get("authorization") || "" }, body: JSON.stringify({ feedback }), cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

