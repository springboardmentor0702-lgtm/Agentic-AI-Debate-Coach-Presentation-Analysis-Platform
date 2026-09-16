import { NextResponse } from "next/server";
import { generateCounterargumentsWithGemini } from "@/lib/geminiHelper";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { argument, topic, position, format } = body;

    if (!argument || !argument.trim()) {
      return NextResponse.json(
        { success: false, message: "Argument text is required" },
        { status: 400 }
      );
    }

    const counter = await generateCounterargumentsWithGemini({
      argument,
      topic: topic || "Autonomous AI Systems Liability",
      position: position || "Affirmative",
      format: format || "Oxford Debate",
    });

    return NextResponse.json({
      success: true,
      rebuttal: counter.rebuttal,
      counterarguments: counter.counterarguments,
      alternative_perspectives: counter.alternative_perspectives,
      challenge_questions: counter.challenge_questions,
      debate_strategy_suggestions: counter.debate_strategy_suggestions,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "Counterargument generation failed" },
      { status: 500 }
    );
  }
}
