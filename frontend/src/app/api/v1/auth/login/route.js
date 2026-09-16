import { NextResponse } from "next/server";
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:5000";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const response = await fetch(`${BACKEND_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Login failed" },
      { status: 500 }
    );
  }
}
