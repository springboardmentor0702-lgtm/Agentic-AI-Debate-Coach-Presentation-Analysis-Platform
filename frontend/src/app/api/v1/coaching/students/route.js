import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/authServer";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const authUser = getAuthUser(request);
    const endpoint = authUser?.role?.toLowerCase() === "educator" ? "/educator/learners" : "/coach/learners";
    const response = await fetch(`${process.env.BACKEND_URL || "http://127.0.0.1:5000"}${endpoint}`, { headers: { Authorization: request.headers.get("authorization") || "" }, cache: "no-store" });
    const students = await response.json().catch(() => []);
    const list = Array.isArray(students) ? students : students.learners || [];
    return NextResponse.json({ success: response.ok, students: list.map((student) => ({ ...student, id: student.id || student._id })) }, { status: response.status });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const authUser = getAuthUser(request);
    const body = await request.json().catch(() => ({}));
    if (!body.email) {
      return NextResponse.json({ success: false, error: "An existing student account email is required." }, { status: 400 });
    }
    const endpoint = authUser?.role?.toLowerCase() === "educator" ? "/educator/assign-learner" : "/coach/assign-learner";
    const response = await fetch(`${process.env.BACKEND_URL || "http://127.0.0.1:5000"}${endpoint}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: request.headers.get("authorization") || "" }, body: JSON.stringify(body), cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json({ ...data, student: data.learner }, { status: response.status });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("id");
    if (!studentId) {
      return NextResponse.json({ success: false, error: "Student id parameter is required." }, { status: 400 });
    }

    const response = await fetch(`${process.env.BACKEND_URL || "http://127.0.0.1:5000"}/coach/learners/${studentId}`, { method: "DELETE", headers: { Authorization: request.headers.get("authorization") || "" }, cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
