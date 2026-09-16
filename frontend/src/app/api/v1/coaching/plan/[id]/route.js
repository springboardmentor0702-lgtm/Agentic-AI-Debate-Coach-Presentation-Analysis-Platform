import { NextResponse } from "next/server";
import { calculateUserAnalytics, users } from "@/lib/serverStore";

export async function GET(request, { params }) {
  const userId = Number(params?.id) || 1;
  const user = users.find((u) => u.id === userId) || users[0];
  const analytics = calculateUserAnalytics(userId);

  const plan = {
    id: userId,
    studentId: userId,
    studentName: user.name,
    coachName: "AI Rhetorical Engine",
    updatedAt: new Date().toISOString(),
    primaryFocus: analytics.hasHistory ? "Adaptive Mastery & Advanced Rebuttal" : "Baseline Rhetorical Calibration",
    strengths: analytics.hasHistory
      ? [
          `Completed ${analytics.debatesCount} live debate simulation(s) and ${analytics.presentationsCount} speech evaluations.`,
          `Maintains an average calculated performance rating of ${analytics.avgScore}.`,
          `Logical audit baseline: ${analytics.topAvoidedFallacy}.`
        ]
      : [
          "Ready to begin calibration on foundational debate structures.",
          "Profile initialized for real-time logic audit and prosody scoring."
        ],
    weaknesses: analytics.hasHistory
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
        ],
    skillGaps: analytics.skillsMatrix.map((s) => ({
      skill: s.name,
      current: typeof s.rawValue === "number" && s.rawValue > 0 ? s.rawValue : 0,
      target: 95
    })),
    actionItems: analytics.coachingInsights.recommendations.map((rec, i) => ({
      id: `act-${i + 1}`,
      task: rec,
      status: i === 0 ? "In Progress" : "Pending"
    })),
    notes: analytics.coachingInsights.summary
  };

  return NextResponse.json(plan);
}

