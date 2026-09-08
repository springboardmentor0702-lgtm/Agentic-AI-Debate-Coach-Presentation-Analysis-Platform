"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { DebateRequest, getCurrentUser, getDebateRequests, getHumanDebates, getPracticeLearners, getPracticeNotifications, HumanDebate, Person, PracticeNotification, startPracticeDebate, updateDebateRequest } from "@/services/auth";

export default function LearnerPracticePage() {
  const router = useRouter();
  const [learners, setLearners] = useState<Person[]>([]);
  const [selectedLearner, setSelectedLearner] = useState<number>();
  const [topic, setTopic] = useState("Should schools teach practical financial literacy?");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [requests, setRequests] = useState<DebateRequest[]>([]);
  const [notifications, setNotifications] = useState<PracticeNotification[]>([]);
  const [currentUserId, setCurrentUserId] = useState(0);
  const [liveDebates, setLiveDebates] = useState<HumanDebate[]>([]);

  useEffect(() => {
    let active = true;
    const loadPracticeData = async () => {
      try {
        const [user, learnerList, requestList, notificationList, debateList] = await Promise.all([getCurrentUser(), getPracticeLearners(), getDebateRequests(), getPracticeNotifications(), getHumanDebates()]);
        if (!active) return;
        setCurrentUserId(user.id);
        setLearners(learnerList);
        setRequests(requestList);
        setNotifications(notificationList);
        setLiveDebates(debateList);
      } catch (value) {
        if (active) setError(value instanceof Error ? value.message : "Unable to load practice debates");
      }
    };
    void loadPracticeData();
    const refresh = window.setInterval(() => { void loadPracticeData(); }, 5000);
    return () => { active = false; window.clearInterval(refresh); };
  }, []);

  async function startPractice() {
    if (!selectedLearner || !topic.trim()) return;
    setStarting(true);
    setError("");
    try {
      await startPracticeDebate(selectedLearner, topic.trim());
      setError("Practice request sent. The other learner must accept it before the debate room opens.");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Unable to start practice debate");
    } finally {
      setStarting(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 pt-20 lg:p-10">
      <div className="mx-auto max-w-6xl space-y-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-teal-700">Learner practice</p>
          <h1 className="mt-2 text-3xl font-semibold text-slate-900">Practice with another learner</h1>
          <p className="mt-2 text-slate-600">Choose any available learner and practice a live debate together.</p>
        </header>
        {error ? <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-600">{error}</p> : null}
        {notifications.length ? <section className="rounded-xl border border-amber-200 bg-amber-50 p-5"><h2 className="font-semibold text-amber-900">Practice debate notifications</h2><div className="mt-3 space-y-3">{notifications.map((notification) => <div key={notification.id} className="rounded-lg bg-white p-4"><p className="font-medium text-slate-900">{notification.title}</p><p className="mt-1 text-sm text-slate-600">{notification.message}</p></div>)}</div></section> : null}
        {requests.filter((request) => request.expert_id === currentUserId && request.status === "PENDING").length ? <section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold text-slate-900">Incoming practice requests</h2><div className="mt-3 space-y-3">{requests.filter((request) => request.expert_id === currentUserId && request.status === "PENDING").map((request) => <div key={request.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-slate-200 p-4"><div><p className="font-medium text-slate-900">Practice topic: {request.topic}</p><p className="text-sm text-slate-500">Learner #{request.learner_id} invited you</p></div><button type="button" onClick={() => void updateDebateRequest(request.id, "ACCEPTED").then((debate) => { if ("request_id" in debate) router.push(`/community/${debate.id}`); }).catch((value: Error) => setError(value.message))} className="rounded-lg bg-teal-700 px-4 py-2 font-semibold text-white">Accept and start</button></div>)}</div></section> : null}
        {liveDebates.length ? <section className="rounded-xl bg-white p-6 shadow-sm"><h2 className="text-xl font-semibold text-slate-900">Active practice sessions</h2><div className="mt-3 space-y-3">{liveDebates.map((debate) => <Link key={debate.id} href={`/community/${debate.id}`} className="block rounded-lg border border-slate-200 p-4 hover:border-teal-500"><p className="font-medium text-slate-900">{debate.topic}</p><p className="mt-1 text-sm text-slate-500">{debate.status} · Open shared practice room</p></Link>)}</div></section> : null}
        <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {learners.map((learner) => (
            <button type="button" key={learner.id} onClick={() => setSelectedLearner(learner.id)} className={`text-left rounded-xl border bg-white p-5 shadow-sm ${selectedLearner === learner.id ? "border-teal-600 ring-2 ring-teal-100" : "border-slate-200 hover:border-teal-400"}`}>
              <p className="font-semibold text-slate-900">{learner.full_name}</p>
              <p className="mt-2 text-sm text-slate-500">{learner.email}</p>
              <p className="mt-4 text-sm font-medium text-teal-700">{selectedLearner === learner.id ? "Selected for practice" : "Select learner"}</p>
            </button>
          ))}
          {!learners.length && !error ? <p className="rounded-xl bg-white p-5 text-sm text-slate-500 shadow-sm">No other learners are available yet.</p> : null}
        </section>
        <section className="max-w-3xl rounded-xl bg-white p-6 shadow-sm">
          <h2 className="text-xl font-semibold text-slate-900">Set the practice topic</h2>
          <textarea value={topic} onChange={(event) => setTopic(event.target.value)} rows={4} className="mt-4 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900" placeholder="Enter a debate topic" />
          <button type="button" onClick={() => void startPractice()} disabled={!selectedLearner || !topic.trim() || starting} className="mt-4 rounded-lg bg-teal-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{starting ? "Starting practice..." : "Start learner practice debate"}</button>
        </section>
        <Link href="/debates" className="inline-flex text-teal-700 hover:text-teal-800">View debate history</Link>
      </div>
    </main>
  );
}
