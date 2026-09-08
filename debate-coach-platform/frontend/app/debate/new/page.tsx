"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { createDebate } from "@/services/auth";

export default function NewDebatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("Climate Change Debate");
  const [topic, setTopic] = useState("Should governments prioritize climate action over economic growth?");
  const [userPosition, setUserPosition] = useState("Yes, climate action must take priority");
  const [aiPosition, setAiPosition] = useState("No, economic growth is more important");
  const [format] = useState("ONE_ON_ONE");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const debate = await createDebate({
        title,
        topic,
        format,
        user_position: userPosition,
        ai_position: aiPosition,
      });
      router.push(`/debate/${debate.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create debate");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-2xl">
        <Link href="/dashboard" className="mb-6 inline-flex items-center text-teal-700 hover:text-teal-800">
          ← Back to dashboard
        </Link>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-3xl font-semibold text-slate-900">Start a new debate</h1>
          <p className="mt-2 text-slate-600">Define your argument and position against the AI</p>

          <div className="mt-8 space-y-6">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Debate title</span>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Climate Change Debate"
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-400"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Debate topic</span>
              <textarea
                required
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What is this debate about?"
                rows={3}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-400"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">Your position</span>
              <textarea
                required
                value={userPosition}
                onChange={(e) => setUserPosition(e.target.value)}
                placeholder="What is your stance on this topic?"
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-400"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">AI position</span>
              <textarea
                required
                value={aiPosition}
                onChange={(e) => setAiPosition(e.target.value)}
                placeholder="What will the AI opponent argue?"
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-slate-900 placeholder-slate-400"
              />
            </label>

            {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</p> : null}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Creating debate..." : "Start debate"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
