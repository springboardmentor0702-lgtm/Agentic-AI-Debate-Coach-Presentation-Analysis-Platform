"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

export default function NotificationDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Coaching Milestone Achieved",
      message: "Your Rebuttal Effectiveness increased by +18% in Parliamentary format.",
      time: "10m ago",
      read: false,
      link: "/coaching",
      category: "COACHING"
    },
    {
      id: 2,
      title: "Speech Telemetry Ready",
      message: "Cadence evaluated at 144 WPM (Optimal Cadence). Zero critical filler words.",
      time: "1h ago",
      read: false,
      link: "/presentation",
      category: "SPEECH"
    },
    {
      id: 3,
      title: "AI Engine Health Check",
      message: "All 5 inference nodes & 4 opponent personas operational at 99.98% uptime.",
      time: "2h ago",
      read: true,
      link: "/dashboard",
      category: "SYSTEM"
    }
  ]);

  const dropdownRef = useRef(null);
  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800/80 text-xs font-semibold transition-all flex items-center gap-1.5"
        title="Notifications"
      >
        <span>Alerts</span>
        {unreadCount > 0 && (
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white shadow-xs">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 dark:text-slate-100 uppercase tracking-wider">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.map((n) => (
              <Link
                key={n.id}
                href={n.link}
                onClick={() => setIsOpen(false)}
                className={`flex gap-3 p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors ${
                  !n.read ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""
                }`}
              >
                <div className="text-[10px] font-mono font-bold px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 h-max self-start">
                  {n.category}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                      {n.title}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono ml-2">
                      {n.time}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                    {n.message}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          <div className="p-2.5 bg-slate-50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 text-center">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              View Telemetry Activity Stream →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
