"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Download } from "lucide-react";
import { jsPDF } from "jspdf";

import { Debate, DebateHistoryMessage, DebateResponse, completeDebate, getDebateById, getDebateMessages, sendDebateMessage, sendVoiceDebateMessage } from "@/services/auth";

export default function DebatePlayPage() {
  const params = useParams();
  const debateId = Number(params.id);
  const [debate, setDebate] = useState<Debate | null>(null);
  const [messages, setMessages] = useState<DebateHistoryMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [finalAnalysis, setFinalAnalysis] = useState<DebateResponse | null>(null);
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);
  const [recorder, setRecorder] = useState<MediaRecorder | null>(null);
  const [finishing, setFinishing] = useState(false);

  function localMessage(sender: "USER" | "AI", message: string): DebateHistoryMessage {
    return { id: Date.now() + Math.random(), sender, message, created_at: new Date().toISOString() };
  }

  useEffect(() => {
    async function load() {
      try {
        const [data, history] = await Promise.all([getDebateById(debateId), getDebateMessages(debateId)]);
        setDebate(data);
        setMessages(history);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load debate");
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [debateId]);

  async function handleSendMessage() {
    if (!inputMessage.trim() || sending || !debate) return;

    setSending(true);
    setError("");

    try {
      // Add user message to local state
      setMessages((prev) => [...prev, localMessage("USER", inputMessage)]);
      setInputMessage("");

      // Send to backend
      const response = await sendDebateMessage(debateId, inputMessage);
      
      // Add AI response
      setMessages((prev) => [...prev, localMessage("AI", response.ai_response)]);
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(response.ai_response));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send message");
      // Remove the last message on error
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setSending(false);
    }
  }

  function toggleRecording() {
    if (recording && recorder) { recorder.stop(); return; }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setError("Voice recording is not supported by this browser");
      return;
    }
    void navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const chunks: BlobPart[] = [];
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
      const nextRecorder = new MediaRecorder(stream, { mimeType });
      nextRecorder.ondataavailable = (event) => chunks.push(event.data);
      nextRecorder.onstop = () => { stream.getTracks().forEach((track) => track.stop()); setRecording(false); setRecorder(null); void sendVoiceDebateMessage(debateId, new Blob(chunks, { type: mimeType })).then((response) => { setMessages((prev) => [...prev, localMessage("USER", response.transcript ?? "Voice argument"), localMessage("AI", response.ai_response)]); if ("speechSynthesis" in window) window.speechSynthesis.speak(new SpeechSynthesisUtterance(response.ai_response)); }).catch((value: Error) => setError(value.message)); };
      nextRecorder.start(); setRecorder(nextRecorder); setRecording(true);
    }).catch(() => setError("Microphone permission is required for voice debates"));
  }

  async function handleCompleteDebate() {
    if (!debate || finishing) return;
    setFinishing(true);
    setError("");

    try {
      const response = await completeDebate(debateId);
      setFinalAnalysis(response);
      setMessages((prev) => [...prev, localMessage("AI", response.ai_response)]);
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(response.ai_response));
      }
      setDebate((current) => (current ? { ...current, status: "COMPLETED" } : current));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to complete debate");
    } finally {
      setFinishing(false);
    }
  }

  function downloadFeedback() {
    if (!finalAnalysis || !debate) return;

    const analysis = finalAnalysis.argument_analysis;
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const leftMargin = 18;
    const textWidth = pageWidth - leftMargin * 2;
    let y = 20;

    const addText = (text: string, size = 10, bold = false, color: [number, number, number] = [45, 55, 72]) => {
      pdf.setFont("helvetica", bold ? "bold" : "normal");
      pdf.setFontSize(size);
      pdf.setTextColor(...color);
      const lines = pdf.splitTextToSize(text, textWidth) as string[];
      if (y + lines.length * (size * 0.5 + 2) > pageHeight - 18) {
        pdf.addPage();
        y = 20;
      }
      pdf.text(lines, leftMargin, y);
      y += lines.length * (size * 0.5 + 2);
    };

    const addSection = (title: string) => {
      y += 4;
      addText(title, 12, true, [13, 112, 104]);
      y += 1;
    };

    const formatValue = (value: unknown): string => {
      if (value === null || value === undefined || value === "") return "Not provided";
      if (Array.isArray(value)) {
        return value.length ? value.map((item) => `- ${formatValue(item)}`).join("\n") : "None provided";
      }
      if (typeof value === "object") {
        return Object.entries(value as Record<string, unknown>)
          .map(([key, item]) => `${key.replace(/_/g, " ")}: ${formatValue(item)}`)
          .join("\n");
      }
      return String(value);
    };

    pdf.setFillColor(13, 112, 104);
    pdf.rect(0, 0, pageWidth, 10, "F");
    addText("DEBATE FEEDBACK REPORT", 20, true, [13, 112, 104]);
    addText(debate.title, 14, true);
    addText(`Topic: ${debate.topic}`);
    addText(`Generated: ${new Date().toLocaleString()}`, 9, false, [100, 110, 125]);

    addSection("Coaching Tip");
    addText(finalAnalysis.coaching_tip);
    addSection("Strengths");
    addText(formatValue(analysis.strengths));
    addSection("Weaknesses");
    addText(formatValue(analysis.weaknesses));
    addSection("Detailed Scores");
    Object.entries(analysis)
      .filter(([key]) => !["strengths", "weaknesses"].includes(key))
      .forEach(([key, value]) => {
        addText(`${key.replace(/_/g, " ")}:`, 10, true);
        addText(formatValue(value), 10);
      });
    addSection("Fallacies");
    addText(formatValue(finalAnalysis.fallacies));
    addSection("Counterarguments");
    addText(formatValue(finalAnalysis.counterarguments));
    addSection("AI Summary");
    addText(finalAnalysis.ai_response);

    const filename = `${debate.title.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "debate"}-feedback.pdf`;
    pdf.save(filename);
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-slate-600">Loading debate...</p>
      </main>
    );
  }

  if (!debate) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <p className="text-slate-600">Debate not found</p>
          <Link href="/dashboard" className="mt-4 inline-flex items-center text-teal-700 hover:text-teal-800">
            ← Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link href="/dashboard" className="inline-flex items-center text-teal-700 hover:text-teal-800">
          ← Back to dashboard
        </Link>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-semibold text-slate-900">{debate.title}</h1>
          <p className="mt-2 text-slate-600">{debate.topic}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg bg-teal-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">Your position</p>
              <p className="mt-2 text-sm text-slate-900">{debate.user_position}</p>
            </div>
            <div className="rounded-lg bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-700">AI position</p>
              <p className="mt-2 text-sm text-slate-900">{debate.ai_position}</p>
            </div>
          </div>
          <p className="mt-4 inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-700">
            {debate.status}
          </p>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">Debate exchange</h2>
          <div className="mt-4 space-y-4 max-h-96 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-center text-sm text-slate-500">No messages yet. Start the debate below.</p>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-4 ${
                    msg.sender === "USER"
                      ? "ml-8 bg-teal-50 text-right"
                      : "mr-8 bg-slate-50 text-left"
                  }`}
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-600">
                    {msg.sender === "USER" ? "You" : "AI Opponent"}
                  </p>
                  <p className="mt-2 text-sm text-slate-900">{msg.message}</p>
                </div>
              ))
            )}
          </div>

          {finalAnalysis && (
            <div className="mt-6 space-y-4 border-t border-slate-200 pt-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="text-sm font-semibold text-slate-700">Final feedback</p>
                <button
                  type="button"
                  onClick={downloadFeedback}
                  className="inline-flex items-center gap-2 rounded-lg border border-teal-700 px-3 py-2 text-sm font-semibold text-teal-700 hover:bg-teal-50"
                >
                  <Download size={16} aria-hidden="true" />
                  Download feedback
                </button>
                <p className="w-full text-sm text-slate-600">{finalAnalysis.coaching_tip}</p>
              </div>
              {finalAnalysis.argument_analysis && Object.keys(finalAnalysis.argument_analysis).length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-slate-700">Your strengths and weaknesses</p>
                  <div className="mt-2 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg bg-emerald-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Strengths</p>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
                        {(Array.isArray(finalAnalysis.argument_analysis.strengths) ? finalAnalysis.argument_analysis.strengths : []).map((item) => <li key={String(item)}>{String(item)}</li>)}
                      </ul>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">Weaknesses</p>
                      <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-slate-700">
                        {(Array.isArray(finalAnalysis.argument_analysis.weaknesses) ? finalAnalysis.argument_analysis.weaknesses : []).map((item) => <li key={String(item)}>{String(item)}</li>)}
                      </ul>
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-semibold text-slate-700">Detailed scores</p>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {Object.entries(finalAnalysis.argument_analysis).filter(([key]) => !["strengths", "weaknesses"].includes(key)).map(([key, value]) => (
                      <div key={key} className="rounded-lg bg-slate-50 p-2">
                        <p className="text-xs font-medium text-slate-600 capitalize">{key.replace(/_/g, " ")}</p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">{String(value)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {error ? <p className="rounded-lg bg-rose-50 p-4 text-sm text-rose-600">{error}</p> : null}

        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void handleSendMessage();
              }
            }}
            placeholder="Type your argument..."
            disabled={sending}
            className="flex-1 rounded-lg border border-slate-300 px-4 py-3 text-slate-900 placeholder-slate-400 disabled:bg-slate-50"
          />
          <button
            onClick={() => void handleSendMessage()}
            disabled={sending || !inputMessage.trim()}
            className="rounded-lg bg-teal-700 px-6 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {sending ? "Sending..." : "Send"}
          </button>
          <button onClick={toggleRecording} className={`rounded-lg px-4 py-3 font-semibold text-white ${recording ? "bg-rose-600" : "bg-slate-700"}`}>
            {recording ? "Stop voice" : "Voice"}
          </button>
          <button
            onClick={() => void handleCompleteDebate()}
            disabled={finishing || !messages.length}
            className="rounded-lg bg-violet-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            {finishing ? "Finishing..." : "Complete debate"}
          </button>
        </div>
      </div>
    </main>
  );
}
