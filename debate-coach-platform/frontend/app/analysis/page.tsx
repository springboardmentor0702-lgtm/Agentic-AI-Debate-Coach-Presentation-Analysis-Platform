"use client";

import { useState } from "react";
import Link from "next/link";

const sampleTranscript = "I believe AI in education should be used carefully because it helps teachers personalize learning. For example, a teacher can use AI to grade essays faster and adapt lessons. However, excessive automation may reduce human connection, so the best model is hybrid learning.";

export default function AnalysisPage() {
  const [transcript, setTranscript] = useState(sampleTranscript);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function runAnalysis() {
    setLoading(true);
    setError("");
    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        setError("Please log in to analyze a debate");
        return;
      }

      const response = await fetch("http://localhost:8000/api/v1/analysis/debate-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          transcript,
          topic: "AI in education",
          position: "against full replacement",
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload.detail ?? "Analysis failed");
      }
      setAnalysis(payload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <header className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.2em] text-violet-700">Analysis</p>
              <h1 className="mt-2 text-3xl font-semibold text-slate-900">Debate performance overview</h1>
            </div>
            <Link href="/dashboard" className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Back to dashboard
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Transcript</h2>
            <textarea
              value={transcript}
              onChange={(event) => setTranscript(event.target.value)}
              rows={10}
              className="mt-4 w-full rounded-xl border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400"
            />

            <button
              onClick={() => void runAnalysis()}
              disabled={loading}
              className="mt-4 rounded-lg bg-violet-700 px-5 py-2.5 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Analyzing..." : "Run analysis"}
            </button>

            {error ? <p className="mt-3 rounded-lg bg-rose-50 p-3 text-sm text-rose-600">{error}</p> : null}
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h2 className="text-xl font-semibold text-slate-900">Overall score</h2>
            {analysis ? (
              <>
                <div className="mt-4 flex items-center justify-center rounded-2xl bg-violet-50 p-6">
                  <span className="text-5xl font-bold text-violet-700">{analysis.overall_score}</span>
                  <span className="ml-2 text-xl font-medium text-violet-700">/100</span>
                </div>

                <div className="mt-6 space-y-4">
                  {Object.entries(analysis.category_scores).map(([label, score]) => (
                    <div key={label}>
                      <div className="mb-1 flex justify-between text-sm text-slate-700">
                        <span>{label}</span>
                        <span>{Number(score)}/100</span>
                      </div>
                      <div className="h-2.5 w-full rounded-full bg-slate-200">
                        <div className="h-2.5 rounded-full bg-violet-600" style={{ width: `${score}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="mt-6 text-sm text-slate-500">Run the analysis to see scores and metrics.</p>
            )}
          </div>
        </section>

        {analysis ? (
          <section className="grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Speech metrics</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Metric label="Speaking time" value={analysis.speech_metrics.speaking_time} />
                <Metric label="Words spoken" value={String(analysis.speech_metrics.words_spoken)} />
                <Metric label="WPM" value={`${analysis.speech_metrics.words_per_minute} WPM`} />
                <Metric label="Pauses" value={String(analysis.speech_metrics.pauses)} />
                <Metric label="Clarity" value={`${analysis.speech_metrics.clarity}%`} />
                <Metric label="Confidence" value={`${analysis.speech_metrics.confidence}%`} />
              </div>

              <div className="mt-6">
                <p className="text-sm font-semibold text-slate-700">Filler words</p>
                <ul className="mt-3 space-y-2 text-sm text-slate-700">
                  {Object.entries(analysis.speech_metrics.filler_words).map(([word, count]) => (
                    <li key={word} className="flex justify-between rounded-lg bg-slate-50 px-3 py-2">
                      <span>{word}</span>
                      <span>{String(count)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
              <h3 className="text-lg font-semibold text-slate-900">Fallacy review</h3>
              <ul className="mt-4 space-y-3">
                {analysis.fallacies.map((fallacy: any) => (
                  <li key={fallacy.name} className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-semibold text-slate-900">{fallacy.name}</span>
                      <span className="rounded-full bg-amber-200 px-2 py-1 text-xs font-semibold text-amber-900">
                        {fallacy.confidence}%
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-slate-700">{fallacy.detail}</p>
                  </li>
                ))}
              </ul>

              <div className="mt-6 rounded-xl bg-slate-50 p-4">
                <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-600">Coach summary</p>
                <p className="mt-2 text-sm text-slate-700">{analysis.summary}</p>
              </div>
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-slate-900">{value}</p>
    </div>
  );
}
