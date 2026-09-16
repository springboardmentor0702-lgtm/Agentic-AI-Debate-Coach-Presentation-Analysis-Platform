import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  const planId = params?.id || "1";
  const content = `%PDF-1.4
% LOGOS.AI Personalized Rhetoric Coaching Plan
1 0 obj
<< /Title (LOGOS.AI Personalized Rhetoric Coaching Plan - Plan ${planId})
   /Author (LOGOS.AI Coaching Engine) >>
endobj
2 0 obj
<< /Length 260 >>
stream
LOGOS.AI COACHING PLAN - PLAN #${planId}
--------------------------------------
Student: Alex Vance
Coach: Dr. Marcus Reed
Focus: Cross-Examination & Rebuttal Pressure
Target Score: 95% Logic Shielding
Weekly Drill: 3x Against The Contrarian
Status: Active Curriculum
endstream
endobj
trailer
<< /Root 1 0 R >>
%%EOF`;

  return new NextResponse(content, {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="logos-ai-coaching-plan-${planId}.pdf"`,
    },
  });
}
