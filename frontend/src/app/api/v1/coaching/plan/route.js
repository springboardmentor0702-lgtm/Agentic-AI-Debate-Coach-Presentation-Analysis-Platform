import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authServer";
import { calculateUserAnalytics, users, coachingPlans } from "@/lib/serverStore";

export async function GET(request) {
  const authUser = getAuthUser(request);
  let userId = authUser ? authUser.id : 1;

  try {
    const url = new URL(request.url);
    const qUserId = url.searchParams.get("userId") || url.searchParams.get("studentId");
    if (qUserId) userId = Number(qUserId);
  } catch {}

  const user = users.find((u) => u.id === userId || u.user_id === userId) || authUser || users[0];
  const analytics = calculateUserAnalytics(user.id, user.email, user.role);

  const existingPlan = coachingPlans[userId];

  const plan = {
    id: userId,
    studentId: userId,
    studentName: user.name,
    coachName: existingPlan?.coachName || "AI Rhetorical Engine",
    updatedAt: new Date().toISOString(),
    primaryFocus: existingPlan?.primaryFocus || (analytics.hasHistory ? "Adaptive Mastery & Advanced Rebuttal" : "Baseline Rhetorical Calibration"),
    strengths: existingPlan?.strengths || (analytics.hasHistory
      ? [
          `Completed ${analytics.debatesCount} live debate simulation(s) and ${analytics.presentationsCount} speech evaluations.`,
          `Maintains an average calculated performance rating of ${analytics.avgScore}.`,
          `Logical audit baseline: ${analytics.topAvoidedFallacy}.`
        ]
      : [
          "Ready to begin calibration on foundational debate structures.",
          "Profile initialized for real-time logic audit and prosody scoring."
        ]),
    weaknesses: existingPlan?.weaknesses || (analytics.hasHistory
      ? [
          analytics.topAvoidedFallacy.includes("None")
            ? "Refine rapid rebuttal tempo against aggressive counter-arguments."
            : `Shielding against logical traps such as ${analytics.topAvoidedFallacy}.`,
          analytics.avgWpm !== "N/A"
            ? `Pacing regulation around ${analytics.avgWpm}.`
            : "Vocal cadence needs calibration in the presentation lab."
        ]
      : [
          "No completed debates yet — complete a session to uncover rhetorical blind spots.",
          "No recorded presentations yet — submit speech audio to measure WPM and filler frequency."
        ]),
    skillGaps: analytics.skillsMatrix.map((s) => ({
      skill: s.name,
      current: typeof s.rawValue === "number" && s.rawValue > 0 ? s.rawValue : 0,
      target: 95
    })),
    actionItems: existingPlan?.actionItems?.length
      ? existingPlan.actionItems
      : analytics.coachingInsights.recommendations.map((rec, i) => ({
          id: `act-${i + 1}`,
          task: rec,
          status: i === 0 ? "In Progress" : "Pending"
        })),
    notes: existingPlan?.notes || analytics.coachingInsights.summary
  };

  return NextResponse.json(plan);
}

export async function POST(request) {
  const authUser = getAuthUser(request);
  const body = await request.json().catch(() => ({}));
  const userId = body.studentId || (authUser ? authUser.id : 1);

  coachingPlans[userId] = {
    ...coachingPlans[userId],
    ...body,
    updatedAt: new Date().toISOString()
  };

  return NextResponse.json({
    success: true,
    plan: coachingPlans[userId],
    message: "Coaching plan updated successfully"
  });
}


