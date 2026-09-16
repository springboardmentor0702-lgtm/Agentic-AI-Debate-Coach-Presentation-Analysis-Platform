import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authServer";
import { calculateUserAnalytics, users } from "@/lib/serverStore";
import { generateCoachingRecommendationsWithGemini } from "@/lib/geminiHelper";

export async function GET(request) {
  const user = getAuthUser(request) || users[0];
  const analytics = calculateUserAnalytics(user.id, user.email, user.role);

  const recommendations = await generateCoachingRecommendationsWithGemini({
    userStats: analytics.skillsMatrix,
    debateCount: analytics.debatesCount,
    avgScore: analytics.avgScore,
    fallaciesFlagged: analytics.debateHistory.flatMap((d) => d.fallacies || []),
  });

  return NextResponse.json({
    success: true,
    user_id: user.id,
    user_name: user.name,
    drill_status: analytics.drillStatus,
    ...recommendations,
  });
}

export async function POST(request) {
  const user = getAuthUser(request) || users[0];
  const body = await request.json().catch(() => ({}));
  const analytics = calculateUserAnalytics(user.id, user.email, user.role);

  const recommendations = await generateCoachingRecommendationsWithGemini({
    userStats: body.userStats || analytics.skillsMatrix,
    debateCount: body.debateCount !== undefined ? body.debateCount : analytics.debatesCount,
    avgScore: body.avgScore || analytics.avgScore,
    fallaciesFlagged: body.fallaciesFlagged || analytics.debateHistory.flatMap((d) => d.fallacies || []),
  });

  return NextResponse.json({
    success: true,
    user_id: user.id,
    user_name: user.name,
    drill_status: analytics.drillStatus,
    ...recommendations,
  });
}
