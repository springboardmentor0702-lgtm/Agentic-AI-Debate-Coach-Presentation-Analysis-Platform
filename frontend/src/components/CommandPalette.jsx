"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CommandPalette({ isOpen, onClose }) {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const items = [
    {
      category: "Navigation",
      commands: [
        { id: "nav-dash", title: "Go to Dashboard", subtitle: "Overview, metrics, and role views", path: "/dashboard", tag: "DASH" },
        { id: "nav-sim", title: "AI Debate Simulation Arena", subtitle: "Debate against 4 AI opponent personas", path: "/simulation", tag: "SIM" },
        { id: "nav-pres", title: "Speech & Presentation Lab", subtitle: "Live microphone speaking & cadence metrics", path: "/presentation", tag: "VOCAL" },
        { id: "nav-ana", title: "Argument & Fallacy Lab", subtitle: "5-criteria scoring, 8 fallacies, 5 rebuttals", path: "/analyze", tag: "ARG" },
        { id: "nav-coach", title: "5-Week Coaching Roadmap", subtitle: "Actionable drills & skills progression", path: "/coaching", tag: "PLAN" },
        { id: "nav-rep", title: "Reports & Export Center", subtitle: "Download formal PDF & Excel audits", path: "/reports", tag: "AUDIT" },
      ]
    },
    {
      category: "Quick Actions",
      commands: [
        { id: "act-new-debate", title: "Start New AI Debate", subtitle: "Select topic, format, and opponent", path: "/simulation", tag: "NEW" },
        { id: "act-test-mic", title: "Test Microphone & Pace", subtitle: "Open presentation studio", path: "/presentation", tag: "MIC" },
        { id: "act-inspect-arg", title: "Check Argument for Fallacies", subtitle: "Scan text for 8 classical fallacies", path: "/analyze", tag: "SCAN" },
      ]
    }
  ];

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        onClose((prev) => !prev);
      }
      if (e.key === "Escape" && isOpen) {
        onClose(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filteredCategories = items.map((cat) => ({
    ...cat,
    commands: cat.commands.filter(
      (c) =>
        c.title.toLowerCase().includes(query.toLowerCase()) ||
        c.subtitle.toLowerCase().includes(query.toLowerCase())
    )
  })).filter((cat) => cat.commands.length > 0);

  const handleSelect = (path) => {
    onClose(false);
    setQuery("");
    if (path) router.push(path);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* SEARCH INPUT */}
        <div className="relative flex items-center px-4 border-b border-slate-100 dark:border-slate-800">
          <span className="text-slate-400 text-xs font-mono font-bold mr-2.5">SEARCH</span>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command, tool, or search topic... (Esc to close)"
            className="w-full py-4 bg-transparent text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none"
            autoFocus
          />
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-mono text-slate-400 bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded">
            ESC
          </kbd>
        </div>

        {/* RESULTS LIST */}
        <div className="max-h-80 overflow-y-auto p-2 space-y-3">
          {filteredCategories.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              No matching commands or pages found.
            </div>
          ) : (
            filteredCategories.map((cat) => (
              <div key={cat.category}>
                <div className="px-3 py-1 text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                  {cat.category}
                </div>
                <div className="mt-1 space-y-1">
                  {cat.commands.map((cmd) => (
                    <button
                      key={cmd.id}
                      onClick={() => handleSelect(cmd.path)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-left transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/60 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {cmd.tag}
                        </span>
                        <div>
                          <p className="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                            {cmd.title}
                          </p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            {cmd.subtitle}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        Jump →
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        {/* FOOTER SHORTCUTS */}
        <div className="px-4 py-2 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>Navigation:</span>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px]">↑↓</kbd>
            <kbd className="px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[10px]">↵</kbd>
          </div>
          <span>Veritas AI Command Bar</span>
        </div>
      </div>
    </div>
  );
}
