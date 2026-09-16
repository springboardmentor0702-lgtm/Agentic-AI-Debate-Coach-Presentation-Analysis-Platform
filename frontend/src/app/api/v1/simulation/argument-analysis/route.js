import { NextResponse } from "next/server";
import { analyzeArgumentWithGemini } from "@/lib/geminiHelper";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { text, topic, position } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, message: "Argument text is required" },
        { status: 400 }
      );
    }

    const analysis = await analyzeArgumentWithGemini({
      text,
      topic: topic || "Autonomous AI Systems Liability",
      position: position || "Affirmative",
    });

    return NextResponse.json({
      success: true,
      analysis,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Argument analysis failed" },
      { status: 500 }
    );
  }
}
