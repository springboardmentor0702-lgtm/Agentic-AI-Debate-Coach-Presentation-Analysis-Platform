"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCurrentUser } from "@/services/auth";

export default function LearnerDashboard() {
  const [name, setName] = useState("Learner");

  useEffect(() => {
    void getCurrentUser().then((user) => setName(user.full_name)).catch(() => setName("Learner"));
  }, []);

  return <main className="min-h-screen bg-slate-100 p-6"><div className="mx-auto max-w-6xl space-y-6">
    <header className="rounded-2xl bg-white p-6 shadow-sm"><p className="text-sm font-semibold uppercase tracking-widest text-teal-700">Learner dashboard</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">Welcome, {name}</h1><p className="mt-2 text-slate-600">Practice with AI or request a live debate with an expert.</p></header>
    <section className="grid gap-6 lg:grid-cols-2"><div className="rounded-2xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold">Live expert debates</h2><p className="mt-2 text-slate-600">Browse available experts, request a debate, and review live debate history from the Debate session history page.</p><Link href="/debates" className="mt-5 inline-flex rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white">Open debate history</Link></div><div className="rounded-2xl bg-slate-900 p-6 text-white"><h2 className="text-xl font-semibold">AI debate room</h2><p className="mt-2 text-slate-300">Start a topic-based AI opponent session with text or browser voice playback.</p><Link href="/debate/new" className="mt-5 inline-flex rounded-lg bg-teal-400 px-4 py-2 font-semibold text-slate-950">Start AI debate</Link></div></section>
  </div></main>;
}
