"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";

import { askCoach, getRecommendations } from "@/services/auth";

export default function CoachPage() {
  const [message, setMessage] = useState("How can I improve my rebuttal?");
  const [response, setResponse] = useState<string>("");
  const [practicePrompt, setPracticePrompt] = useState<string>("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [weakAreas, setWeakAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await askCoach(message, {
        topic: "AI in education",
        position: "against",
        last_feedback: "Your rebuttal needs stronger evidence and a clearer link to the topic.",
      });
      setResponse(result.response);
      setPracticePrompt(result.practice_prompt);
      setFocusAreas(result.focus_areas);

      const recommendationData = await getRecommendations();
      setWeakAreas(recommendationData.weak_areas);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load coaching advice");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">AI Coach</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">Debate-aware coaching</h1>
            </div>
            <Link href="/dashboard" className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Back to dashboard
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Ask the coach</h2>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400"
                placeholder="Ask about rebuttals, confidence, evidence, or argument structure"
              />

              {error ? <p className="rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</p> : null}

              <button
                type="submit"
                disabled={loading}
                className="rounded-lg bg-amber-600 px-4 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Thinking..." : "Get coaching advice"}
              </button>
            </form>

            {response ? (
              <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-amber-700">Coach response</p>
                <p className="mt-3 text-slate-800">{response}</p>
              </div>
            ) : null}

            {practicePrompt ? (
              <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">Practice prompt</p>
                <p className="mt-2 text-slate-800">{practicePrompt}</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-6">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Weak areas</h3>
              <ul className="mt-4 space-y-3">
                {weakAreas.length ? (
                  weakAreas.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="h-2 w-2 rounded-full bg-rose-500" />
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-slate-500">No recommendations loaded yet.</li>
                )}
              </ul>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Focus areas</h3>
              <ul className="mt-4 space-y-3">
                {focusAreas.length ? (
                  focusAreas.map((item) => (
                    <li key={item} className="flex items-center gap-2 text-sm text-slate-700">
                      <span className="h-2 w-2 rounded-full bg-teal-500" />
                      {item}
                    </li>
                  ))
                ) : (
                  <li className="text-sm text-slate-500">Ask a question to populate coaching priorities.</li>
                )}
              </ul>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
