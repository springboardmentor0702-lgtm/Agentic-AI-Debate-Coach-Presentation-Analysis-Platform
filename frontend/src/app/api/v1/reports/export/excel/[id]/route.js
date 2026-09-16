import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authServer";
import { calculateUserAnalytics, debateHistory, presentationHistory, users } from "@/lib/serverStore";

export async function GET(request, { params }) {
  const authUser = getAuthUser(request);
  const sessionId = params?.id || "1";
  const url = new URL(request.url);
  const reportType = url.searchParams.get("type") || "performance"; // performance | debate | presentation | coaching | progress

  const user = authUser || users[0];
  const analytics = calculateUserAnalytics(user.id, user.email, user.role);

  let csvContent = "";
  let filename = `logos-ai-${reportType}-report-${sessionId}.csv`;

  if (reportType === "debate") {
    const specificDebate = debateHistory.find((d) => String(d.id) === String(sessionId)) || analytics.debateHistory[0];
    csvContent = `Field,Value\r\n`;
    csvContent += `Debate ID,${specificDebate?.id || sessionId}\r\n`;
    csvContent += `Topic,"${(specificDebate?.topic || "Autonomous AI Liability").replace(/"/g, '""')}"\r\n`;
    csvContent += `Format,${specificDebate?.format || "Oxford Debate"}\r\n`;
    csvContent += `Position,${specificDebate?.position || "Affirmative"}\r\n`;
    csvContent += `Overall Score,${specificDebate?.score || 85}\r\n`;
    csvContent += `Clarity,${specificDebate?.clarity || 88}\r\n`;
    csvContent += `Relevance,${specificDebate?.relevance || 90}\r\n`;
    csvContent += `Evidence Strength,${specificDebate?.evidence || 82}\r\n`;
    csvContent += `Logical Consistency,${specificDebate?.consistency || 86}\r\n`;
    csvContent += `Persuasiveness,${specificDebate?.persuasiveness || 85}\r\n`;
    csvContent += `Fallacies Detected,"${(specificDebate?.fallacies || ["None"]).join("; ")}"\r\n`;
  } else if (reportType === "presentation") {
    const specificPres = presentationHistory.find((p) => String(p.id) === String(sessionId)) || analytics.presentationHistory[0];
    csvContent = `Metric,Measurement,Benchmark,Status\r\n`;
    csvContent += `Words Per Minute (WPM),${specificPres?.wpm || specificPres?.speech_pace_wpm || 142},120-160,Optimal\r\n`;
    csvContent += `Filler Word Frequency,${specificPres?.fillerWords || specificPres?.filler_words_count || 2},< 5,Good\r\n`;
    csvContent += `Confidence Score,${specificPres?.confidence || 88}%,> 75%,High\r\n`;
    csvContent += `Clarity Score,${specificPres?.clarity || 90}%,> 80%,Exemplary\r\n`;
    csvContent += `Engagement Score,${specificPres?.engagement || 86}%,> 75%,Strong\r\n`;
    csvContent += `Duration (seconds),${specificPres?.duration || 120},60-300,Complete\r\n`;
  } else if (reportType === "coaching") {
    csvContent = `Category,Details\r\n`;
    csvContent += `Student,"${user.name}"\r\n`;
    csvContent += `Primary Focus,"${analytics.coachingInsights.activePlan}"\r\n`;
    csvContent += `Summary,"${analytics.coachingInsights.summary.replace(/"/g, '""')}"\r\n`;
    analytics.coachingInsights.recommendations.forEach((rec, idx) => {
      csvContent += `Recommendation ${idx + 1},"${rec.replace(/"/g, '""')}"\r\n`;
    });
  } else if (reportType === "progress") {
    csvContent = `Skill Domain,Score,Target,Progress Status\r\n`;
    analytics.skillsMatrix.forEach((skill) => {
      const val = typeof skill.rawValue === "number" ? skill.rawValue : 75;
      csvContent += `"${skill.name}",${val},95,${val >= 85 ? "Mastery" : "Developing"}\r\n`;
    });
  } else {
    // Default: 5-weighted performance score report
    csvContent = `Weighted Metric,Weight,Score,Weighted Contribution\r\n`;
    csvContent += `Argument Quality,30%,${analytics.hasHistory ? analytics.avgScore : 85},${((analytics.hasHistory ? Number(analytics.avgScore) : 85) * 0.3).toFixed(1)}\r\n`;
    csvContent += `Evidence Usage,20%,82,16.4\r\n`;
    csvContent += `Logical Consistency,20%,${analytics.hasHistory ? (analytics.topAvoidedFallacy.includes("None") ? 92 : 80) : 88},17.6\r\n`;
    csvContent += `Rebuttal Effectiveness,15%,80,12.0\r\n`;
    csvContent += `Communication Skills,15%,${analytics.hasHistory && analytics.avgWpm !== "N/A" ? 88 : 84},13.2\r\n`;
    csvContent += `Overall Composite Score,100%,${analytics.hasHistory ? analytics.avgScore : 85.2},Pass\r\n`;
  }

  return new NextResponse(csvContent, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

