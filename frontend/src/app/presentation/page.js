"use client";

import { useState } from "react";
import axios from "axios";
import Cookies from "js-cookie";
import Link from "next/link";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function PresentationPage() {
  const [activeMode, setActiveMode] = useState("text"); // 'text' or 'audio'
  const [file, setFile] = useState(null);
  const [duration, setDuration] = useState(60);
  const [transcript, setTranscript] = useState(
    "Good afternoon esteemed judges and audience. Today I will demonstrate why investing in AI-driven education platforms enhances critical thinking. First, quantitative studies indicate student engagement rises by 35 percent. Um, basically, interactive simulations bridge theoretical knowledge with practical argumentation. Therefore, educators should actively embrace adaptive coaching tools."
  );
  
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [error, setError] = useState("");

  const handleTextAnalyze = async () => {
    if (!transcript.trim() || loading) return;
    setLoading(true);
    setError("");
    setAnalytics(null);

    try {
      const token = Cookies.get("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await axios.post(
        `${API_BASE}/api/presentation/analyze`,
        { transcript, duration_seconds: Number(duration) },
        { headers }
      );
      setAnalytics(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to analyze presentation transcript.");
    } finally {
      setLoading(false);
    }
  };

  const handleAudioUpload = async (e) => {
    e.preventDefault();
    if (!file || loading) return;
    setLoading(true);
    setError("");
    setAnalytics(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("duration_seconds", String(duration));

    try {
      const token = Cookies.get("token");
      const headers = {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        "Content-Type": "multipart/form-data"
      };
      const res = await axios.post(
        `${API_BASE}/api/presentation/analyze-audio`,
        formData,
        { headers }
      );
      setAnalytics(res.data);
    } catch (err) {
      setError(err.response?.data?.detail || "Audio analysis failed. Check file format.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
            Module 7 • Speech & Presentation Analytics Engine
          </span>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mt-2">
            Presentation Intelligence Lab
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Measure speaking pace (WPM), eliminate filler words, evaluate delivery confidence, audience engagement, and message clarity.
          </p>
        </div>

        {/* MODE SELECTOR */}
        <div className="flex bg-slate-200 p-1 rounded-xl w-max border border-slate-300">
          <button
            onClick={() => setActiveMode("text")}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeMode === "text"
                ? "bg-white text-indigo-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Direct Speech Transcript
          </button>
          <button
            onClick={() => setActiveMode("audio")}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-bold transition-all ${
              activeMode === "audio"
                ? "bg-white text-indigo-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Audio File Upload (Whisper STT)
          </button>
        </div>

        {/* INPUT CARD */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">
              {activeMode === "text" ? "Speech Script & Delivery Timing" : "Upload Recorded Speech (.wav / .mp3 / .mp4)"}
            </h2>
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <label className="font-semibold">Speech Duration:</label>
              <input
                type="number"
                min="10"
                max="3600"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
                className="w-20 px-2 py-1 border border-slate-300 rounded text-center font-bold"
              />
              <span>seconds</span>
            </div>
          </div>

          {activeMode === "text" ? (
            <div>
              <textarea
                rows={5}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm focus:ring-2 focus:ring-indigo-500 outline-none leading-relaxed"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="Paste speech transcript or presentation notes..."
              />
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-slate-500">
                  {transcript.trim().split(/\s+/).filter(Boolean).length} words • Expected Pace: ~{Math.round((transcript.trim().split(/\s+/).filter(Boolean).length / Math.max(duration, 1)) * 60)} WPM
                </span>
                <button
                  onClick={handleTextAnalyze}
                  disabled={loading || transcript.length < 10}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs px-6 py-2.5 rounded-lg transition-colors shadow-sm"
                >
                  {loading ? "Analyzing Speech..." : "Analyze Presentation Quality"}
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAudioUpload} className="space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-indigo-400 transition-colors">
                <input
                  type="file"
                  accept="audio/*,video/mp4"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                />
                <span className="block text-xs text-slate-400 mt-2">
                  Supports WAV, MP3, MP4 audio recordings up to 50MB
                </span>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || !file}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-bold text-xs px-6 py-2.5 rounded-lg transition-colors shadow-sm"
                >
                  {loading ? "Processing Audio with Whisper..." : "Transcribe & Analyze Audio"}
                </button>
              </div>
            </form>
          )}

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-semibold">
              {error}
            </div>
          )}
        </div>

        {/* METRICS RESULTS DISPLAY */}
        {analytics && (
          <div className="space-y-6">
            {/* OVERALL SCORE & KPI TILES */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 mb-6 pb-4 border-b border-slate-100">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Presentation Delivery Index</span>
                  <h3 className="text-xl font-black text-slate-900 mt-0.5">Comprehensive Speech Metrics</h3>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-500">Overall Delivery:</span>
                  <strong className="text-3xl font-black text-indigo-600">
                    {analytics.overall_score || 80}%
                  </strong>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-center">
                {/* 1. Speech Pace (WPM) */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Speech Pace</span>
                  <strong className="text-2xl font-black text-slate-900 block mt-1">
                    {analytics.speech_pace?.words_per_minute || 140} <span className="text-xs font-normal">WPM</span>
                  </strong>
                  <span className="text-[11px] font-semibold text-emerald-600 mt-1 block">
                    {analytics.speech_pace?.pace_quality || "Optimal Pace"}
                  </span>
                </div>

                {/* 2. Filler Word Usage */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Filler Words</span>
                  <strong className="text-2xl font-black text-slate-900 block mt-1">
                    {analytics.filler_words?.total_fillers || 0}
                  </strong>
                  <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
                    Score: {analytics.filler_words?.filler_control_score || 90}%
                  </span>
                </div>

                {/* 3. Confidence Score */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Confidence</span>
                  <strong className="text-2xl font-black text-indigo-600 block mt-1">
                    {analytics.confidence?.confidence_score || 80}%
                  </strong>
                  <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
                    Assertive Tone
                  </span>
                </div>

                {/* 4. Clarity Score */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Clarity Score</span>
                  <strong className="text-2xl font-black text-slate-900 block mt-1">
                    {analytics.clarity?.clarity_score || 85}%
                  </strong>
                  <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
                    High Readability
                  </span>
                </div>

                {/* 5. Audience Engagement */}
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Engagement</span>
                  <strong className="text-2xl font-black text-emerald-600 block mt-1">
                    {analytics.engagement?.engagement_score || 78}%
                  </strong>
                  <span className="text-[11px] font-semibold text-slate-500 mt-1 block">
                    Captivating
                  </span>
                </div>
              </div>
            </div>

            {/* ACTIONABLE FEEDBACK & RECOMMENDATIONS */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <span>📋</span> Coach Feedback Directives
                </h3>
                <div className="space-y-2 text-xs text-slate-700">
                  {(analytics.feedback || []).map((fb, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
                      • {fb}
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-3">
                <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                  <span>💡</span> Delivery Improvements
                </h3>
                <div className="space-y-2.5 text-xs text-slate-700">
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                    <strong className="text-indigo-900 block mb-0.5">Pacing Benchmark:</strong>
                    Target 130–160 words per minute for optimal comprehension and persuasive gravity.
                  </div>
                  <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-lg">
                    <strong className="text-indigo-900 block mb-0.5">Vocal Pauses:</strong>
                    Replace reflexive "um", "uh", or "like" fillers with deliberate 1-second silence pauses.
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                href="/reports"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-2.5 rounded-lg transition-colors shadow-sm"
              >
                Export Speech Assessment Report (PDF / Excel) →
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
