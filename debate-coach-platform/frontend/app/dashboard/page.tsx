"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Debate, getCurrentUser, getDebates } from "@/services/auth";

export default function DashboardPage() {
  const router = useRouter();
  const [userName, setUserName] = useState("Loading...");
  const [userRole, setUserRole] = useState("LEARNER");
  const [debates, setDebates] = useState<Debate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const user = await getCurrentUser();
        const role = user.role.trim().toUpperCase();
        setUserName(user.full_name);
        setUserRole(role);
        localStorage.setItem("user_role", role);
        if (role === "ADMIN") {
          router.replace("/admin");
          return;
        }
        if (["DEBATE_EXPERT", "DEBATE_COACH", "EXPERT", "COACH"].includes(role)) {
          router.replace("/expert");
          return;
        }
        setDebates(await getDebates());
      } catch {
        setUserName("Guest");
        setDebates([]);
      } finally {
        setLoading(false);
      }
    }

    void loadDashboard();
  }, [router]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">Loading dashboard...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-teal-700">Dashboard</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">Welcome, {userName}</h1>
              <p className="mt-1 text-sm text-slate-600">Role: <span className="font-semibold">{userRole}</span></p>
            </div>
            <nav className="flex flex-col gap-2">
              <Link
                href="/profile"
                className="rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50"
              >
                My profile
              </Link>
              <Link
                href="/debate/new"
                className="rounded-lg bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800"
              >
                + New debate
              </Link>
            </nav>
          </div>
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total debates" value={String(debates.length)} />
          <StatCard label="Current role" value={userRole} />
          <StatCard label="AI mock mode" value="enabled" />
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          <Link href="/debates" className="rounded-2xl bg-teal-700 p-6 text-white shadow-sm hover:bg-teal-800">
            <h2 className="text-xl font-semibold">Debate history</h2>
            <p className="mt-2 text-teal-100">Open your previous sessions and continue practicing with experts or other learners.</p>
            <span className="mt-5 inline-flex rounded-lg bg-white px-4 py-2 font-semibold text-teal-800">Open debate history</span>
          </Link>
          <Link href="/debate/new" className="rounded-2xl bg-slate-900 p-6 text-white shadow-sm hover:bg-slate-800">
            <h2 className="text-xl font-semibold">Practice with AI</h2>
            <p className="mt-2 text-slate-300">Start a new AI debate and receive instant coaching on your arguments.</p>
            <span className="mt-5 inline-flex rounded-lg bg-teal-400 px-4 py-2 font-semibold text-slate-950">Start AI debate</span>
          </Link>
        </section>

        {/* Quick Actions */}
        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            <Link
              href="/debate/new"
              className="p-4 border border-slate-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition"
            >
              <div className="text-2xl mb-2">🎤</div>
              <div className="font-semibold text-slate-900">Start Debate</div>
              <div className="text-xs text-slate-600 mt-1">Create a new debate session</div>
            </Link>
            <Link
              href="/presentations"
              className="p-4 border border-slate-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition"
            >
              <div className="text-2xl mb-2">📊</div>
              <div className="font-semibold text-slate-900">Presentations</div>
              <div className="text-xs text-slate-600 mt-1">Upload & analyze presentations</div>
            </Link>
            <Link
              href="/analytics"
              className="p-4 border border-slate-200 rounded-lg hover:border-teal-500 hover:bg-teal-50 transition"
            >
              <div className="text-2xl mb-2">📈</div>
              <div className="font-semibold text-slate-900">Analytics</div>
              <div className="text-xs text-slate-600 mt-1">View your performance reports</div>
            </Link>
            {userRole === "ADMIN" && (
              <Link
                href="/admin"
                className="p-4 border border-slate-200 rounded-lg hover:border-purple-500 hover:bg-purple-50 transition"
              >
                <div className="text-2xl mb-2">⚙️</div>
                <div className="font-semibold text-slate-900">Admin Panel</div>
                <div className="text-xs text-slate-600 mt-1">System management</div>
              </Link>
            )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Your debates</h2>
          <div className="mt-4 space-y-3">
            {debates.length === 0 ? (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-6 text-center">
                <p className="text-sm text-slate-600">No debates yet.</p>
                <Link href="/debate/new" className="mt-3 inline-flex rounded-lg bg-teal-700 px-4 py-2 font-medium text-white hover:bg-teal-800">
                  Start your first debate
                </Link>
              </div>
            ) : (
              debates.map((debate) => (
                <Link
                  key={debate.id}
                  href={`/debate/${debate.id}`}
                  className="group flex items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
                >
                  <div>
                    <p className="font-medium text-slate-900 group-hover:text-teal-700">{debate.title}</p>
                    <p className="text-sm text-slate-600">{debate.topic}</p>
                  </div>
                  <span className="ml-4 rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">
                    {debate.status}
                  </span>
                </Link>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
