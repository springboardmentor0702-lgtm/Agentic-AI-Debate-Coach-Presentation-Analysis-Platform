"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { getHumanDebates, getCurrentUser, getHumanDebateMessages, sendHumanDebateMessage, sendDebateFeedback, HumanDebate, HumanDebateMessage } from "@/services/auth";

export default function CommunityRoom() {
  const { id } = useParams();
  const [debate, setDebate] = useState<HumanDebate | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<HumanDebateMessage[]>([]);
  const [userId, setUserId] = useState(0);
  const [error, setError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [isExpert, setIsExpert] = useState(false);
  const [savingFeedback, setSavingFeedback] = useState(false);
  useEffect(() => {
    let active = true;
    const debateId = Number(id);
    const loadMessages = async () => {
      try {
        const latest = await getHumanDebateMessages(debateId);
        if (active) setMessages(latest);
      } catch (value) {
        if (active) setError(value instanceof Error ? value.message : "Unable to load messages");
      }
    };
    void Promise.all([getHumanDebates(), getCurrentUser()]).then(([debates, user]) => {
      if (!active) return;
      const room = debates.find((item) => item.id === debateId) ?? null;
      setDebate(room);
      setUserId(user.id);
      setIsExpert(user.role === "DEBATE_EXPERT" || user.role === "DEBATE_COACH");
      if (room) void loadMessages();
    }).catch((value: Error) => { if (active) setError(value.message); });
    const refresh = window.setInterval(() => { void loadMessages(); }, 3000);
    return () => { active = false; window.clearInterval(refresh); };
  }, [id]);
  async function send() {
    if (!message.trim()) return;
    try {
      const data = await sendHumanDebateMessage(Number(id), message.trim());
      setMessages((items) => [...items, data]);
      setMessage("");
    } catch (value) {
      setError(value instanceof Error ? value.message : "Message failed");
    }
  }
  async function saveFeedback() {
    if (!feedback.trim()) return;
    setSavingFeedback(true);
    try { await sendDebateFeedback(Number(id), feedback.trim()); setFeedback(""); } catch (value) { setError(value instanceof Error ? value.message : "Feedback failed"); } finally { setSavingFeedback(false); }
  }
  return <main className="min-h-screen bg-slate-100 p-6"><div className="mx-auto max-w-3xl space-y-5"><Link href={isExpert ? "/expert" : "/learner"} className="text-teal-700">Back to dashboard</Link>{error ? <p className="text-rose-600">{error}</p> : null}<section className="overflow-hidden rounded-2xl bg-white shadow-sm"><div className="border-b border-slate-200 bg-teal-700 p-5 text-white"><p className="text-sm uppercase tracking-widest text-teal-100">Live debate room</p><h1 className="mt-2 text-2xl font-semibold">{debate?.topic ?? "Loading room..."}</h1><p className="mt-1 text-sm text-teal-100">Both participants can send arguments here.</p></div><div className="min-h-80 space-y-3 bg-slate-50 p-5">{messages.length ? messages.map((item) => <div key={item.id} className={`max-w-[85%] rounded-2xl p-3 ${item.sender_id === userId ? "ml-auto rounded-br-sm bg-teal-600 text-white" : "rounded-bl-sm bg-white text-slate-800 shadow-sm"}`}><p>{item.message}</p><p className={`mt-1 text-right text-xs ${item.sender_id === userId ? "text-teal-100" : "text-slate-400"}`}>{new Date(item.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p></div>) : <p className="text-sm text-slate-500">No messages yet. Start the debate with your opening argument.</p>}</div><div className="border-t border-slate-200 p-4"><div className="flex gap-2"><input value={message} onChange={(event) => setMessage(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void send(); }} placeholder="Write your argument" className="flex-1 rounded-full border border-slate-300 px-4 py-3"/><button onClick={() => void send()} className="rounded-full bg-teal-700 px-5 py-3 font-semibold text-white">Send</button></div></div></section>{isExpert ? <section className="rounded-2xl bg-white p-5 shadow-sm"><h2 className="text-lg font-semibold text-slate-900">Give learner feedback</h2><textarea value={feedback} onChange={(event) => setFeedback(event.target.value)} rows={4} className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Share specific guidance on evidence, clarity, or delivery" /><button type="button" onClick={() => void saveFeedback()} disabled={savingFeedback || !feedback.trim()} className="mt-3 rounded-lg bg-amber-600 px-4 py-2 font-semibold text-white disabled:opacity-60">{savingFeedback ? "Saving..." : "Send feedback"}</button></section> : null}</div></main>;
}
