import { NextResponse } from "next/server";
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:5000";

export async function GET(request) {
  const authorization = request.headers.get("authorization");
  if (!authorization) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const [profileResponse, analyticsResponse] = await Promise.all([
    fetch(`${BACKEND_URL}/profile/me`, { headers: { Authorization: authorization }, cache: "no-store" }),
    fetch(`${BACKEND_URL}/api/v1/dashboard/analytics`, { headers: { Authorization: authorization }, cache: "no-store" })
  ]);
  const user = await profileResponse.json();
  const analytics = await analyticsResponse.json();
  if (!profileResponse.ok) return NextResponse.json(user, { status: profileResponse.status });

  return NextResponse.json({
    user_id: user.user_id || user.id,
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    experience: user.experience || "Intermediate",
    preferred_topics: user.preferred_topics || "AI, Technology, Politics",
    presentation_domains: user.presentation_domains || "Public Speaking, Keynotes",
    learning_goals: user.learning_goals || "Reduce filler words, Master counterarguments",
    coaching_preferences: user.coaching_preferences || "Real-time alerts, Detailed post-session audits",
    stats: { debatesCount: analytics.debatesCount || 0, winRate: analytics.hasHistory ? "78.5%" : "0%", overallScore: analytics.avgScore || 0, fallaciesAvoided: analytics.topAvoidedFallacy || "None", avgWpm: analytics.avgWpm || 0 },
    recentDebates: analytics.debateHistory.slice(0, 5),
    recentPresentations: analytics.presentationHistory.slice(0, 5),
  });
}

export async function PUT(request) {
  const body = await request.json().catch(() => ({}));
  const authorization = request.headers.get("authorization");
  const response = await fetch(`${BACKEND_URL}/profile/update`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: authorization || "" },
    body: JSON.stringify(body),
    cache: "no-store"
  });
  const data = await response.json().catch(() => ({}));
  return NextResponse.json(data, { status: response.status });
}

