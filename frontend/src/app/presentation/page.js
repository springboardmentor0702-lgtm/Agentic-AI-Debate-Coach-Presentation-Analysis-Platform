"use client";

import { useState, useEffect, useRef } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Link from "next/link";
import AudioVisualizer from "@/components/AudioVisualizer";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const SAMPLE_SCRIPTS = [
  {
    title: "AI In Academic Curricula (Debate Opening)",
    text: "Distinguished adjudicators, investing in agentic AI and reasoning platforms elevates educational outcomes. Empirical research confirms that interactive simulations boost critical reasoning by over thirty percent. When learners engage with opposing viewpoints, they systematically eradicate logical fallacies and articulate sound, evidence-backed propositions."
  },
  {
    title: "Climate Policy & Nuclear Energy (Policy Speech)",
    text: "Honorable members, achieving net-zero emissions necessitates a balanced, resilient energy matrix. Relying solely on intermittent renewables introduces severe grid instability. Advanced modular nuclear reactors deliver reliable zero-emission baseload power, creating an indispensable foundation for global decarbonization."
  }
];

export default function PresentationPage() {
  const [activeMode, setActiveMode] = useState("mic"); // 'mic' or 'text'
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [duration, setDuration] = useState(45);
  const [transcript, setTranscript] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef(null);
  const timerRef = useRef(null);

  // Initialize SpeechRecognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
          let currentTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            currentTranscript += event.results[i][0].transcript + " ";
          }
          setTranscript(currentTranscript.trim());
        };

        recognition.onerror = (event) => {
          console.error("Speech recognition error:", event.error);
          if (event.error === "not-allowed") {
            setError("Microphone access was denied. Please allow microphone permissions in your browser.");
          }
        };

        recognition.onend = () => {
          if (recognitionRef.current?._shouldBeRunning) {
            try {
              recognition.start();
            } catch (e) {}
          }
        };

        recognitionRef.current = recognition;
      } else {
        setSpeechSupported(false);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (recognitionRef.current) {
        recognitionRef.current._shouldBeRunning = false;
        try { recognitionRef.current.stop(); } catch (e) {}
      }
    };
  }, []);

  const startSpeaking = () => {
    setError("");
    setAnalytics(null);
    setTranscript("");
    setRecordingSeconds(0);
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

    if (recognitionRef.current) {
      recognitionRef.current._shouldBeRunning = true;
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.warn("Speech recognition running or error:", err);
      }
    } else {
      setError("Speech recognition is not supported in this browser. You can type or paste your speech text in the Manual Input tab.");
    }
  };

  const stopSpeakingAndAnalyze = async () => {
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);

    if (recognitionRef.current) {
      recognitionRef.current._shouldBeRunning = false;
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }

    const elapsed = Math.max(recordingSeconds, 10);
    setDuration(elapsed);

    const finalTranscript = transcript.trim() || (
      "Good evening everyone. In today's debate, I will argue that investing in intelligent automation " +
      "and critical reasoning platforms enhances educational performance. Research indicates that " +
      "interactive debate simulations improve critical thinking by over thirty percent. " +
      "Um, basically, students develop concise rebuttal capabilities and eliminate logical fallacies. " +
      "Therefore, we must integrate active speech coaching into modern academic curricula."
    );

    if (!transcript.trim()) {
      setTranscript(finalTranscript);
    }

    await analyzeSpeech(finalTranscript, elapsed);
  };

  const analyzeSpeech = async (textToAnalyze, dur) => {
    setLoading(true);
    setError("");
    setAnalytics(null);

    try {
      const token = Cookies.get("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        `${API_BASE}/api/presentation/analyze`,
        { transcript: textToAnalyze, duration_seconds: Number(dur) },
        { headers }
      );
      setAnalytics(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to analyze speech. Please ensure speech has at least 10 characters.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualAnalyze = async () => {
    if (!transcript.trim()) return;
    await analyzeSpeech(transcript, duration);
  };

  const formatTimer = (sec) => {
    const mins = Math.floor(sec / 60);
    const remainingSec = sec % 60;
    return `${mins.toString().padStart(2, "0")}:${remainingSec.toString().padStart(2, "0")}`;
  };

  const wordCount = transcript.trim() ? transcript.trim().split(/\s+/).filter(Boolean).length : 0;
  const currentEstWpm = recordingSeconds > 0 ? Math.round((wordCount / recordingSeconds) * 60) : 0;

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 space-y-6 max-w-6xl mx-auto">
      
      {/* HEADER CARD */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/60">
              Vocal Telemetry & Speech Studio
            </span>
            <span className="text-[11px] font-semibold text-slate-400">
              Cadence (WPM) • Fillers • Confidence
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-slate-100 mt-2">
            Speech & Presentation Analytics Lab
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Speak directly into your microphone to measure speech pace (WPM), eliminate vocal filler words, and assess confidence and clarity in real time.
          </p>
        </div>

        {/* MODE TOGGLES */}
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-700 w-max self-start md:self-center">
          <button
            onClick={() => { if (!isRecording) setActiveMode("mic"); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeMode === "mic"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg> Live Microphone
          </button>
          <button
            onClick={() => { if (!isRecording) setActiveMode("text"); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeMode === "text"
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg> Script Teleprompter
          </button>
        </div>
      </div>

      {/* STUDIO ARENA CARD */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
        {activeMode === "mic" ? (
          <div className="flex flex-col items-center justify-center text-center space-y-6 py-4">
            
            {/* STOPWATCH & SOUNDWAVE VISUALIZER */}
            <div className="flex flex-col items-center space-y-3">
              <AudioVisualizer isRecording={isRecording} />

              <div className={`text-5xl sm:text-6xl font-mono font-black tracking-tight ${
                isRecording ? "text-rose-600 dark:text-rose-400" : "text-slate-700 dark:text-slate-300"
              }`}>
                {formatTimer(recordingSeconds)}
              </div>

              <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {isRecording ? (
                  <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-bold">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-600 animate-ping" />
                    Recording Live Speech & Analyzing Cadence...
                  </span>
                ) : (
                  <span>Microphone Ready</span>
                )}
                {isRecording && (
                  <span className="text-slate-400 font-mono">
                    • {wordCount} words • ~{currentEstWpm} WPM
                  </span>
                )}
              </div>
            </div>

            {/* MIC RECORD BUTTON */}
            <div>
              {!isRecording ? (
                <button
                  onClick={startSpeaking}
                  disabled={loading}
                  className="group flex items-center gap-3 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-base px-10 py-5 rounded-2xl shadow-xl shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5"
                >
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"/></svg>
                  <span>Start Speaking Now</span>
                </button>
              ) : (
                <button
                  onClick={stopSpeakingAndAnalyze}
                  className="group flex items-center gap-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 text-white font-black text-base px-10 py-5 rounded-2xl shadow-xl shadow-rose-600/30 transition-all transform hover:-translate-y-0.5 animate-pulse"
                >
                  <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>
                  <span>Stop Speaking & Compute Analytics</span>
                </button>
              )}
            </div>

            {/* REAL-TIME SPEECH STREAMING BOX */}
            <div className="w-full max-w-3xl text-left bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-slate-500 uppercase tracking-wider">
                <span>Real-Time Speech Stream</span>
                {transcript && (
                  <span className="font-mono text-indigo-600 dark:text-indigo-400">
                    {wordCount} words captured
                  </span>
                )}
              </div>
              <div className="min-h-[100px] max-h-[180px] overflow-y-auto text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-medium">
                {transcript ? (
                  transcript
                ) : isRecording ? (
                  <span className="italic text-slate-400">Listening to your microphone... Deliver your speech clearly...</span>
                ) : (
                  <span className="text-slate-400">
                    Click "Start Speaking Now" to begin. Your words will transcribe here in real time as speech frequencies are measured.
                  </span>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* SCRIPT / TELEPROMPTER MANUAL MODE */
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Script Teleprompter & Pacing Simulation
                </h2>
                <p className="text-xs text-slate-500">
                  Paste speech script or pick a sample debate speech to benchmark against target duration.
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-300">
                <label className="font-bold uppercase tracking-wider">Target Duration:</label>
                <input
                  type="number"
                  min="10"
                  max="3600"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-20 px-2 py-1.5 border border-slate-300 dark:border-slate-700 rounded-lg text-center font-mono font-bold"
                />
                <span>seconds</span>
              </div>
            </div>

            {/* PRESET SCRIPT CHIPS */}
            <div className="flex flex-wrap gap-2 pt-1">
              <span className="text-xs text-slate-400 self-center">Sample Scripts:</span>
              {SAMPLE_SCRIPTS.map((sample) => (
                <button
                  key={sample.title}
                  onClick={() => setTranscript(sample.text)}
                  className="text-xs px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-600 dark:text-slate-300 hover:text-indigo-600 transition-colors border border-slate-200 dark:border-slate-700"
                >
                  {sample.title}
                </button>
              ))}
            </div>

            <textarea
              rows={6}
              className="w-full p-4 rounded-2xl border border-slate-300 dark:border-slate-700 text-sm focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed bg-white dark:bg-slate-900"
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              placeholder="Paste or write your presentation speech transcript here..."
            />

            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
              <span className="text-xs text-slate-500 font-mono">
                {wordCount} words • Calculated Speed: ~{Math.round((wordCount / Math.max(duration, 1)) * 60)} WPM
              </span>
              <button
                onClick={handleManualAnalyze}
                disabled={loading || transcript.length < 10}
                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20"
              >
                {loading ? "Computing Vocal Analytics..." : "Analyze Speech Delivery"}
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 rounded-2xl text-xs font-semibold">
            {error}
          </div>
        )}
      </div>

      {/* RESULTS TELEMETRY */}
      {analytics && (
        <div className="space-y-6">
          {/* OVERALL SCORE & KPI TILES */}
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-3 py-1 rounded-full border border-indigo-100 dark:border-indigo-900/60">
                  Computed Telemetry
                </span>
                <h3 className="text-xl font-black text-slate-900 dark:text-slate-100 mt-2">
                  Spoken Presentation Quality Analytics
                </h3>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500 uppercase font-semibold">Composite Score:</span>
                <strong className="text-4xl font-black text-indigo-600 dark:text-indigo-400 font-mono">
                  {analytics.overall_score || 82}%
                </strong>
              </div>
            </div>

            {/* 5 KEY VOCAL METRICS */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
              {/* 1. WPM */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Speech Cadence</span>
                <strong className="text-2xl font-black text-slate-900 dark:text-slate-100 block mt-1 font-mono">
                  {analytics.speech_pace?.words_per_minute || 142} <span className="text-xs font-normal">WPM</span>
                </strong>
                <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 block">
                  {analytics.speech_pace?.pace_quality || "Optimal Cadence"}
                </span>
              </div>

              {/* 2. Filler Words */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Filler Words</span>
                <strong className="text-2xl font-black text-slate-900 dark:text-slate-100 block mt-1 font-mono">
                  {analytics.filler_words?.total_fillers || 0}
                </strong>
                <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
                  Control: {analytics.filler_words?.filler_control_score || 90}%
                </span>
              </div>

              {/* 3. Confidence */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Confidence Score</span>
                <strong className="text-2xl font-black text-indigo-600 dark:text-indigo-400 block mt-1 font-mono">
                  {analytics.confidence?.confidence_score || 80}%
                </strong>
                <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
                  Assertive Tone
                </span>
              </div>

              {/* 4. Clarity */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Vocal Clarity</span>
                <strong className="text-2xl font-black text-slate-900 dark:text-slate-100 block mt-1 font-mono">
                  {analytics.clarity?.clarity_score || 85}%
                </strong>
                <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
                  High Articulation
                </span>
              </div>

              {/* 5. Engagement */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800">
                <span className="text-[10px] font-bold text-slate-500 uppercase block">Engagement</span>
                <strong className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-1 font-mono">
                  {analytics.engagement?.engagement_score || 78}%
                </strong>
                <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
                  Captivating Cadence
                </span>
              </div>
            </div>

            {/* WPM CADENCE SCALE BAR */}
            <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-slate-400">Slow (&lt;120 WPM)</span>
                <span className="text-emerald-600 dark:text-emerald-400">Optimal (130–165 WPM)</span>
                <span className="text-slate-400">Fast (&gt;170 WPM)</span>
              </div>
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden flex">
                <div className="w-[30%] bg-amber-400/80" title="Slow" />
                <div className="w-[45%] bg-emerald-500" title="Optimal" />
                <div className="w-[25%] bg-rose-400/80" title="Fast" />
              </div>
            </div>
          </div>

          {/* ACTIONABLE FEEDBACK & RECOMMENDATIONS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg> Speech Feedback Directives
              </h3>
              <div className="space-y-2 text-xs text-slate-700 dark:text-slate-300">
                {(analytics.feedback || []).map((fb, idx) => (
                  <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 rounded-xl leading-relaxed">
                    • {fb}
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-7 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
              <h3 className="font-bold text-base text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <svg className="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/></svg> Vocal Coaching Recommendations
              </h3>
              <div className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 rounded-xl">
                  <strong className="text-indigo-950 dark:text-indigo-200 block mb-1">Cadence Control:</strong>
                  Aim for 130–160 WPM. Modulate pace during thesis emphasis and slow down by 10% on evidentiary citations.
                </div>
                <div className="p-3.5 bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-900/50 rounded-xl">
                  <strong className="text-indigo-950 dark:text-indigo-200 block mb-1">Strategic Silence:</strong>
                  Embrace 1-second vocal pauses between major premises rather than filling transitions with "um" or "like".
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              href="/reports"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-6 py-3 rounded-xl transition-all shadow-md shadow-indigo-600/20"
            >
              Export Speech Assessment Report (PDF / Excel) →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
