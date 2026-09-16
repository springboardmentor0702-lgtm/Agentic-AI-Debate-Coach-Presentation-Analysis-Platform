import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { users } from "@/lib/serverStore";

const JWT_SECRET = process.env.JWT_SECRET || "logos_ai_secret_key_rhetoric_engine_v4";

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { email, name, role = "Learner", provider = "Google" } = body;

    const userEmail = email || `user_${Date.now()}@gmail.com`;
    let user = users.find((u) => u.email.toLowerCase() === userEmail.toLowerCase());

    if (!user) {
      user = {
        id: users.length + 1,
        user_id: users.length + 1,
        name: name || userEmail.split("@")[0],
        email: userEmail,
        role: role,
        experience: "Intermediate",
        provider,
        created_at: new Date().toISOString(),
        stats: {
          debatesCount: 0,
          winRate: "0%",
          overallScore: 0,
          fallaciesAvoided: 0,
          avgWpm: 0,
        },
      };
      users.push(user);
    } else if (role) {
      user.role = role;
    }

    const payload = {
      user_id: user.user_id || user.id,
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      experience: user.experience,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });

    return NextResponse.json({
      success: true,
      token,
      user: payload,
      message: `Signed in with ${provider}`,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: error.message || "OAuth login failed" },
      { status: 500 }
    );
  }
}
