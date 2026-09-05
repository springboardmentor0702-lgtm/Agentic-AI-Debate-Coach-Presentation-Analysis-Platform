"use client";

import React from "react";

export default function AudioVisualizer({ isRecording, intensity = "normal" }) {
  if (!isRecording) {
    return (
      <div className="flex items-center justify-center gap-1.5 h-10 w-48 opacity-30">
        {[4, 6, 8, 5, 10, 7, 12, 6, 4, 8, 5, 7, 4].map((h, i) => (
          <div
            key={i}
            className="w-1 bg-slate-400 dark:bg-slate-600 rounded-full transition-all"
            style={{ height: `${h}px` }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5 h-12 w-64 px-4 py-2 bg-indigo-950/20 dark:bg-indigo-900/30 rounded-2xl border border-indigo-500/30 backdrop-blur-sm">
      <div className="h-2 w-2 rounded-full bg-rose-500 animate-ping mr-1" />
      <div className="w-1 bg-rose-500 rounded-full animate-soundwave-1" />
      <div className="w-1 bg-indigo-500 rounded-full animate-soundwave-2" />
      <div className="w-1 bg-violet-500 rounded-full animate-soundwave-3" />
      <div className="w-1 bg-purple-500 rounded-full animate-soundwave-4" />
      <div className="w-1 bg-indigo-400 rounded-full animate-soundwave-5" />
      <div className="w-1 bg-rose-500 rounded-full animate-soundwave-6" />
      <div className="w-1 bg-indigo-500 rounded-full animate-soundwave-1" />
      <div className="w-1 bg-violet-400 rounded-full animate-soundwave-3" />
      <div className="w-1 bg-purple-500 rounded-full animate-soundwave-2" />
      <div className="w-1 bg-rose-400 rounded-full animate-soundwave-5" />
      <div className="w-1 bg-indigo-500 rounded-full animate-soundwave-4" />
      <div className="w-1 bg-violet-500 rounded-full animate-soundwave-6" />
      <span className="text-[10px] font-mono font-bold tracking-widest text-indigo-600 dark:text-indigo-400 uppercase ml-2">
        LIVE MIC
      </span>
    </div>
  );
}
