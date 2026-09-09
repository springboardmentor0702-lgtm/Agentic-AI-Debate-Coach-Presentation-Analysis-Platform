"use client";

import { useRef, useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function VoiceRecorder({ onConfirmed, disabled = false }) {
  const [status, setStatus] = useState("choose-duration");
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(30);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [durationSec, setDurationSec] = useState(0);
  const [error, setError] = useState("");
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);
  const audioBlobRef = useRef(null);

  const targetSeconds = () => Math.max(5, minutes * 60 + seconds);
  const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const startRecording = async () => {
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        clearInterval(timerRef.current);
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        audioBlobRef.current = blob;
        setDurationSec((Date.now() - startTimeRef.current) / 1000);
        setStatus("transcribing");
        try {
          const form = new FormData();
          form.append("audio", blob, "argument.webm");
          const token = localStorage.getItem("logos_ai_jwt");
          const res = await fetch(`${API_URL}/api/v1/debate/transcribe`, {
            method: "POST",
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            body: form
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data.detail || "Transcription failed");
          setTranscript(data.transcript || "");
          setStatus("reviewing");
        } catch (err) {
          console.error(err);
          setError(err.message || "Could not transcribe the recording.");
          setStatus("choose-duration");
        }
      };
      mediaRecorderRef.current = recorder;
      startTimeRef.current = Date.now();
      recorder.start();
      setStatus("recording");
      const limit = targetSeconds();
      setSecondsLeft(limit);
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
        const remaining = limit - elapsed;
        if (remaining <= 0) { setSecondsLeft(0); recorder.stop(); }
        else setSecondsLeft(remaining);
      }, 250);
    } catch (err) {
      console.error(err);
      setError("Microphone access is required. Allow microphone permission in your browser.");
    }
  };

  const stopRecording = () => { if (mediaRecorderRef.current?.state === "recording") mediaRecorderRef.current.stop(); };
  const resetRecording = () => {
    setStatus("choose-duration"); setTranscript(""); setError(""); setSecondsLeft(0); audioBlobRef.current = null;
  };
  const handleConfirm = () => {
    if (transcript.trim()) onConfirmed(transcript.trim(), durationSec, audioBlobRef.current);
    resetRecording();
  };

  return (
    <div style={{ borderTop: "1px solid var(--dark-border)", padding: "1rem", background: "#0b0b10" }}>
      {error && <div style={{ color: "#f87171", fontSize: "0.8rem", marginBottom: "0.75rem" }}>{error}</div>}
      {status === "choose-duration" && (
        <div>
          <div style={{ color: "#999", fontSize: "0.75rem", marginBottom: "0.5rem" }}>VOICE INPUT — SET SPEAKING LIMIT</div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <input type="number" min="0" max="30" value={minutes} onChange={(e) => setMinutes(Math.max(0, Math.min(30, Number(e.target.value))))} style={{ width: 60, padding: "0.5rem", background: "#15151d", color: "#fff", border: "1px solid #333" }} />
            <span style={{ color: "#999" }}>min</span>
            <input type="number" min="0" max="59" value={seconds} onChange={(e) => setSeconds(Math.max(0, Math.min(59, Number(e.target.value))))} style={{ width: 60, padding: "0.5rem", background: "#15151d", color: "#fff", border: "1px solid #333" }} />
            <span style={{ color: "#999" }}>sec</span>
            <button type="button" disabled={disabled} onClick={startRecording} className="btn btn-red" style={{ marginLeft: "auto" }}>🎙️ RECORD {fmt(targetSeconds())}</button>
          </div>
        </div>
      )}
      {status === "recording" && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#ef4444", fontFamily: "monospace" }}>● RECORDING — {fmt(secondsLeft)} LEFT</span>
          <button type="button" onClick={stopRecording} className="btn btn-red">⏹ STOP</button>
        </div>
      )}
      {status === "transcribing" && <div style={{ color: "#aaa", fontFamily: "monospace" }}> &gt; WHISPER TRANSCRIBING AUDIO...</div>}
      {status === "reviewing" && (
        <div>
          <div style={{ color: "#999", fontSize: "0.75rem", marginBottom: "0.5rem" }}>REVIEW TRANSCRIPT BEFORE AI ANALYSIS</div>
          <textarea value={transcript} onChange={(e) => setTranscript(e.target.value)} style={{ width: "100%", minHeight: 100, padding: "0.75rem", background: "#111118", color: "#fff", border: "1px solid #333", boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.75rem" }}>
            <button type="button" onClick={resetRecording} className="btn btn-dark">DISCARD</button>
            <button type="button" onClick={handleConfirm} disabled={!transcript.trim()} className="btn btn-red" style={{ marginLeft: "auto" }}>✓ ANALYZE SPEECH</button>
          </div>
        </div>
      )}
    </div>
  );
}
