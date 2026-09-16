import { NextResponse } from "next/server";
import { detectFallaciesWithGemini } from "@/lib/geminiHelper";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { text, topic } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, message: "Text to audit is required" },
        { status: 400 }
      );
    }

    const audit = await detectFallaciesWithGemini({
      text,
      topic: topic || "Debate Motion",
    });

    return NextResponse.json({
      success: true,
      fallacies: audit.fallacies || [],
      fallacy_detected: (audit.fallacies || []).length > 0,
      credibility_score: audit.credibility_score,
      reasoning_analysis: audit.reasoning_analysis,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Fallacy detection failed" },
      { status: 500 }
    );
  }
}
