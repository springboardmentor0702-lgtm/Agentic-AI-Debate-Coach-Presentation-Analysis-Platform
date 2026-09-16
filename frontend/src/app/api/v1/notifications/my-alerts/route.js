import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authServer";
import { notifications, addNotification } from "@/lib/serverStore";

export const dynamic = "force-dynamic";

// Ensure seed notifications cover all 5 required categories if missing
const defaultCategories = [
  {
    id: 101,
    user_id: null,
    category: "Debate Reminder",
    title: "Upcoming Oxford Debate Round",
    message: "Scheduled clash on 'Autonomous AI Systems Liability' begins in 30 minutes.",
    timestamp: "10m ago",
    read: false,
  },
  {
    id: 102,
    user_id: null,
    category: "Coaching Feedback Alert",
    title: "Coach Feedback Available",
    message: "Coach Marcus Reed posted tactical notes on your latest constructive speech.",
    timestamp: "1h ago",
    read: false,
  },
  {
    id: 103,
    user_id: null,
    category: "Practice Session Reminder",
    title: "Daily Prosody & Vocal Drill",
    message: "Complete today's 2-minute filler-word reduction drill to maintain speech momentum.",
    timestamp: "3h ago",
    read: false,
  },
  {
    id: 104,
    user_id: null,
    category: "Skill Milestone Notification",
    title: "Milestone Reached: Logic Shield L2",
    message: "Congratulations! You successfully completed 3 debates without committing a False Dilemma.",
    timestamp: "Yesterday",
    read: false,
  },
  {
    id: 105,
    user_id: null,
    category: "Platform Announcement",
    title: "LOGOS.AI v4.0 Rhetoric Engine Active",
    message: "Multi-turn AI debate simulation, speech cadence audio analysis, and live fallacies detection are live.",
    timestamp: "2d ago",
    read: true,
  },
];

for (const defaultNotif of defaultCategories) {
  if (!notifications.some((n) => n.category === defaultNotif.category)) {
    notifications.push(defaultNotif);
  }
}

export async function GET(request) {
  const authUser = getAuthUser(request);
  const userId = authUser?.id;

  const userAlerts = notifications.filter(
    (n) => !n.user_id || !userId || n.user_id === userId || n.user_id === Number(userId)
  );

  return NextResponse.json(userAlerts);
}

export async function POST(request) {
  const authUser = getAuthUser(request);
  const body = await request.json().catch(() => ({}));

  if (!body.title || !body.message) {
    return NextResponse.json(
      { success: false, message: "Title and message are required" },
      { status: 400 }
    );
  }

  const created = addNotification({
    user_id: body.user_id || authUser?.id || null,
    category: body.category || "Practice Session Reminder",
    title: body.title,
    message: body.message,
  });

  return NextResponse.json({
    success: true,
    notification: created,
    message: "Notification created successfully",
  });
}

