import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const transcript = "In this slide presentation, we examine why regulatory sandboxes protect consumer safety while maintaining incentives for innovation. By auditing automated models in controlled environments, agencies preserve market integrity without stifling breakthrough technology.";

    return NextResponse.json({
      success: true,
      transcript,
      slides_analyzed: 5,
      content_score: 94,
      delivery_score: 91,
      clarity_score: 93,
      confidence_score: 90,
      engagement_score: 92,
      words_per_minute: 144,
      pace_status: "Optimal",
      filler_word_count: 2,
      slide_reviews: [
        { slide_number: 1, topic: "Executive Summary", verdict: "High coherence and sharp hook" },
        { slide_number: 2, topic: "Market Vulnerability Vectors", verdict: "Strong evidence-backed stats" },
        { slide_number: 3, topic: "Regulatory Sandbox Architecture", verdict: "Excellent structural breakdown" },
      ],
      recommendations: [
        "Maintain current cadence through conclusion transitions",
        "Add one additional peer-reviewed study citation on slide 4",
      ],
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
