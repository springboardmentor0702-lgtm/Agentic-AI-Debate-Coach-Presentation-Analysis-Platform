import { NextResponse } from "next/server";
import { getPlatformUsers, addPlatformUser, toggleUserStatus, removePlatformUser } from "@/lib/serverStore";
import { getAuthUser } from "@/lib/authServer";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const users = getPlatformUsers();
    return NextResponse.json({ success: true, users });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));
    if (!body.email) {
      return NextResponse.json({ success: false, error: "User email is required." }, { status: 400 });
    }

    const created = addPlatformUser(body);
    return NextResponse.json({ success: true, user: created, message: `Platform user ${created.email} provisioned.` }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { userId } = body;
    if (!userId) {
      return NextResponse.json({ success: false, error: "userId is required to toggle status." }, { status: 400 });
    }

    const updated = toggleUserStatus(userId);
    if (!updated) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, user: updated, message: `User status changed to ${updated.status}.` });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || searchParams.get("id");
    if (!userId) {
      return NextResponse.json({ success: false, error: "User id required." }, { status: 400 });
    }

    const removed = removePlatformUser(userId);
    if (!removed) {
      return NextResponse.json({ success: false, error: "User not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: `Platform user removed.` });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
