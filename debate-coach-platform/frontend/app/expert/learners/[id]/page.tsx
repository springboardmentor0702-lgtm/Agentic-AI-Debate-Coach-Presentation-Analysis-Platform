"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { getLearnerProfile, LearnerProfile, startExpertDebate } from "@/services/auth";

export default function LearnerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [learner, setLearner] = useState<LearnerProfile | null>(null);
  const [error, setError] = useState("");
  const [topic, setTopic] = useState("How should we balance economic growth and climate action?");
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    void getLearnerProfile(Number(id))
      .then(setLearner)
      .catch((value: Error) => setError(value.message));
  }, [id]);

  async function startDebate() {
    if (!topic.trim()) return;
    setStarting(true);
    setError("");
    try {
      const debate = await startExpertDebate(Number(id), topic.trim());
      router.push(`/community/${debate.id}`);
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to start debate");
    } finally {
      setStarting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/expert" className="inline-flex text-teal-700 hover:text-teal-800">Back to learner profiles</Link>
        <section className="rounded-2xl bg-white p-8 shadow-sm">
          {error ? <p className="mb-4 rounded-lg bg-rose-50 p-3 text-rose-600">{error}</p> : null}
          {learner ? <><p className="text-sm font-semibold uppercase tracking-widest text-amber-700">Learner profile</p><h1 className="mt-2 text-3xl font-semibold text-slate-900">{learner.full_name}</h1><dl className="mt-8 grid gap-4 sm:grid-cols-2"><div><dt className="text-sm font-medium text-slate-500">Email</dt><dd className="mt-1 text-slate-900">{learner.email}</dd></div><div><dt className="text-sm font-medium text-slate-500">Experience</dt><dd className="mt-1 text-slate-900">{learner.experience_level}</dd></div><div><dt className="text-sm font-medium text-slate-500">Debate topics</dt><dd className="mt-1 text-slate-900">{learner.preferred_debate_topics || "Not provided"}</dd></div><div><dt className="text-sm font-medium text-slate-500">Learning goals</dt><dd className="mt-1 text-slate-900">{learner.learning_goals || "Not provided"}</dd></div></dl><div className="mt-8 border-t border-slate-200 pt-6"><h2 className="text-lg font-semibold text-slate-900">Expert connections ({learner.connected_expert_count})</h2>{learner.connected_experts.length ? <div className="mt-3 space-y-3">{learner.connected_experts.map((expert) => <div key={expert.id} className="rounded-lg border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-semibold text-slate-900">{expert.full_name}</p><p className="text-sm text-slate-500">{expert.email}</p></div><span className="rounded-full bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">{expert.latest_status ?? "Connected"}</span></div><p className="mt-2 text-sm text-slate-600">{expert.request_count} request(s) · {expert.debate_count} live debate(s)</p></div>)}</div> : <p className="mt-2 text-sm text-slate-500">This learner has not connected with another expert yet.</p>}</div><div className="mt-8 border-t border-slate-200 pt-6"><h2 className="text-lg font-semibold text-slate-900">All expert profiles ({learner.available_experts.length})</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">{learner.available_experts.map((expert) => <div key={expert.id} className="rounded-lg border border-slate-200 p-4"><p className="font-semibold text-slate-900">{expert.full_name}</p><p className="mt-1 text-sm text-slate-500">{expert.role} · {expert.experience_level}</p><p className="mt-2 text-sm text-slate-600">{expert.presentation_domains || "Expertise not provided"}</p></div>)}</div></div><div className="mt-8 border-t border-slate-200 pt-6"><h2 className="text-lg font-semibold text-slate-900">Skills</h2>{learner.skills.length ? <div className="mt-3 space-y-3">{learner.skills.map((skill) => <div key={skill.id}><div className="flex justify-between text-sm"><span>{skill.name}</span><span>{skill.score}/100</span></div><div className="mt-1 h-2 rounded-full bg-slate-200"><div className="h-2 rounded-full bg-teal-600" style={{ width: `${skill.score}%` }} /></div></div>)}</div> : <p className="mt-2 text-sm text-slate-500">No skills recorded yet.</p>}</div><div className="mt-8 border-t border-slate-200 pt-6"><h2 className="text-lg font-semibold text-slate-900">Start a live debate</h2><textarea value={topic} onChange={(event) => setTopic(event.target.value)} rows={3} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Enter the debate topic" /><button type="button" onClick={() => void startDebate()} disabled={starting || !topic.trim()} className="mt-3 rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{starting ? "Starting debate..." : "Start debate with learner"}</button></div></> : <p className="text-slate-600">Loading learner profile...</p>}
        </section>
      </div>
    </main>
  );
}