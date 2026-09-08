"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Debate, DebateRequest, getCurrentUser, getDebateRequests, getDebates, getExperts, getHumanDebates, HumanDebate, Person, requestExpertDebate } from "@/services/auth";

export default function DebatesPage() {
  const [debates, setDebates] = useState<Debate[]>([]);
  const [experts, setExperts] = useState<Person[]>([]);
  const [requests, setRequests] = useState<DebateRequest[]>([]);
  const [liveDebates, setLiveDebates] = useState<HumanDebate[]>([]);
  const [topic, setTopic] = useState("");
  const [selectedExpert, setSelectedExpert] = useState<number>();
  const [notice, setNotice] = useState("");
  const [isLearner, setIsLearner] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    void getCurrentUser().then((user) => {
      setIsLearner(user.role === "LEARNER");
      if (user.role !== "LEARNER") return getDebates().then(setDebates);
      return Promise.all([getExperts(), getDebateRequests(), getHumanDebates(), getDebates()]).then(([expertList, requestList, liveList, aiList]) => {
        setExperts(expertList); setRequests(requestList); setLiveDebates(liveList); setDebates(aiList);
        const expertId = Number(new URLSearchParams(window.location.search).get("expert"));
        if (expertId && expertList.some((expert) => expert.id === expertId)) setSelectedExpert(expertId);
      });
    }).catch((value: Error) => setError(value.message));
  }, []);

  async function sendRequest() {
    if (!selectedExpert || !topic.trim()) return;
    try { const request = await requestExpertDebate(selectedExpert, topic.trim()); setRequests((items) => [request, ...items]); setTopic(""); setNotice("Debate request sent"); }
    catch (value) { setError(value instanceof Error ? value.message : "Unable to send debate request"); }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 pt-20 lg:p-10">
      <div className="mx-auto max-w-5xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Practice archive</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Debate session history</h1>
          <p className="mt-2 text-slate-600">Find experts, request live debates, and review your debate history.</p>
        </header>
        {error ? <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-600">{error}</p> : null}
        {isLearner ? <>
          <section className="space-y-4"><div><h2 className="text-xl font-semibold text-slate-900">Available debate experts</h2><p className="mt-1 text-sm text-slate-600">Open an expert profile before choosing a topic.</p></div><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{experts.map((expert) => <article key={expert.id} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><Link href={`/learner/experts/${expert.id}`} className="block hover:text-teal-700"><h3 className="font-semibold text-slate-900">{expert.full_name}</h3><p className="mt-2 text-sm text-slate-500">{expert.email}</p><p className="mt-3 text-sm font-medium text-teal-700">View expert profile</p></Link><button type="button" onClick={() => setSelectedExpert(expert.id)} className="mt-4 rounded-lg border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50">Choose expert</button></article>)}{!experts.length ? <p className="rounded-xl bg-white p-5 text-sm text-slate-500 shadow-sm">No experts are currently available.</p> : null}</div><div className="rounded-xl bg-white p-5 shadow-sm"><h3 className="font-semibold text-slate-900">Start an expert debate</h3><div className="mt-3 grid gap-3 md:grid-cols-[1fr_2fr_auto]"><select value={selectedExpert ?? ""} onChange={(event) => setSelectedExpert(Number(event.target.value))} className="rounded-lg border border-slate-300 p-3"><option value="">Choose an expert</option>{experts.map((expert) => <option key={expert.id} value={expert.id}>{expert.full_name}</option>)}</select><input value={topic} onChange={(event) => setTopic(event.target.value)} placeholder="What would you like to debate?" className="rounded-lg border border-slate-300 p-3"/><button type="button" onClick={() => void sendRequest()} disabled={!selectedExpert || !topic.trim()} className="rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">Send request</button></div>{notice ? <p className="mt-3 text-sm text-teal-700">{notice}</p> : null}</div></section>
          <section className="space-y-4"><h2 className="text-xl font-semibold text-slate-900">Live expert debate history</h2><div className="space-y-3">{liveDebates.map((debate) => <Link className="block rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-500" href={`/community/${debate.id}`} key={debate.id}><p className="font-semibold text-slate-900">{debate.topic}</p><p className="mt-2 text-sm text-slate-500">{debate.status} · Open live debate room</p></Link>)}{!liveDebates.length ? <p className="rounded-xl bg-white p-5 text-sm text-slate-500 shadow-sm">No live expert debates yet.</p> : null}</div><h3 className="font-semibold text-slate-900">Your requests</h3>{requests.map((request) => <div className="rounded-lg border border-slate-200 bg-white p-4" key={request.id}><p className="font-medium text-slate-900">{request.topic}</p><p className="mt-1 text-sm text-slate-500">{request.status}</p></div>)}</section>
        </> : null}
        <section className="space-y-3">
          <h2 className="text-xl font-semibold text-slate-900">AI debate history</h2>
          {debates.length === 0 && !error ? <p className="rounded-xl bg-white p-6 text-slate-600 shadow-sm">No AI debate sessions yet.</p> : null}
          {debates.map((debate) => (
            <Link key={debate.id} href={`/debate/${debate.id}`} className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:border-teal-500">
              <div>
                <h2 className="font-semibold text-slate-900">{debate.title}</h2>
                <p className="mt-1 text-sm text-slate-600">{debate.topic}</p>
                <p className="mt-2 text-xs text-slate-500">Created {new Date(debate.created_at).toLocaleDateString()}</p>
              </div>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-teal-700">{debate.status}</span>
            </Link>
          ))}
        </section>
      </div>
    </main>
  );
}