"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import axios from "axios";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationDrawer from "@/components/NotificationDrawer";
import CommandPalette from "@/components/CommandPalette";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const token = Cookies.get("token");
    if (token) {
      axios
        .get(`${API_BASE}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        })
        .then((res) => setUser(res.data))
        .catch(() => {
          setUser(null);
        });
    } else {
      setUser(null);
    }
  }, [pathname]);

  const handleSignOut = () => {
    Cookies.remove("token");
    setUser(null);
    router.push("/login");
  };

  const navLinks = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/simulation", label: "Debate Arena" },
    { href: "/presentation", label: "Speech Lab" },
    { href: "/analyze", label: "Argument Analysis" },
    { href: "/coaching", label: "Coaching Roadmap" },
    { href: "/reports", label: "Reports" },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 dark:border-slate-800/80 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            
            {/* BRAND LOGO */}
            <div className="flex items-center gap-3">
              <Link href="/dashboard" className="flex items-center gap-2.5 group">
                <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-600 via-indigo-700 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                  <span className="text-base font-black">⚡</span>
                </div>
                <div>
                  <span className="font-extrabold text-base sm:text-lg tracking-tight text-slate-900 dark:text-white flex items-center gap-1.5">
                    Veritas <span className="text-indigo-600 dark:text-indigo-400">AI</span>
                  </span>
                  <span className="hidden sm:block text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider -mt-1">
                    Agentic Debate Platform
                  </span>
                </div>
              </Link>

              {/* LIVE ENGINE STATUS PILL */}
              <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/60 dark:border-emerald-800/50 text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Engines Live</span>
              </div>
            </div>

            {/* DESKTOP NAVIGATION LINKS */}
            <nav className="hidden md:flex items-center gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isActive
                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shadow-xs"
                        : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100/70 dark:hover:bg-slate-800/60"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            {/* COMMAND BAR & ACTIONS */}
            <div className="flex items-center gap-2 sm:gap-2.5">
              
              {/* QUICK SEARCH / COMMAND PALETTE TRIGGER */}
              <button
                onClick={() => setIsCommandOpen(true)}
                className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 text-xs text-slate-500 dark:text-slate-400 transition-colors shadow-2xs"
                title="Search or Jump (Ctrl+K)"
              >
                <span>🔍</span>
                <span className="text-slate-400 dark:text-slate-500">Search tools...</span>
                <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-400 dark:text-slate-500">
                  Ctrl K
                </kbd>
              </button>

              {/* NOTIFICATION DRAWER */}
              <NotificationDrawer />

              {/* THEME TOGGLE */}
              <ThemeToggle />

              {/* USER PROFILE & LOGOUT */}
              {user ? (
                <div className="flex items-center gap-2">
                  <div className="hidden xl:flex flex-col text-right">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate max-w-[120px]">
                      {user.name}
                    </span>
                    <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                      {user.role}
                    </span>
                  </div>
                  <button
                    onClick={handleSignOut}
                    className="p-1.5 sm:px-3 sm:py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                    title="Sign Out"
                  >
                    <span className="sm:hidden">🚪</span>
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              ) : (
                <Link
                  href="/login"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold px-3.5 py-1.5 rounded-lg transition-colors shadow-sm"
                >
                  Sign In
                </Link>
              )}

              {/* MOBILE MENU TOGGLE */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {mobileMenuOpen ? "✕" : "☰"}
              </button>
            </div>
          </div>

          {/* MOBILE DROPDOWN NAVIGATION */}
          {mobileMenuOpen && (
            <div className="md:hidden py-3 border-t border-slate-100 dark:border-slate-800 space-y-1">
              <button
                onClick={() => { setMobileMenuOpen(false); setIsCommandOpen(true); }}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-lg mb-2"
              >
                <span>🔍 Search or jump to tool...</span>
                <kbd className="px-1 py-0.5 text-[9px] bg-white dark:bg-slate-700 border rounded">Ctrl K</kbd>
              </button>
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`block px-3 py-2 rounded-lg text-xs font-semibold ${
                    pathname === link.href
                      ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400"
                      : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* COMMAND PALETTE OVERLAY */}
      <CommandPalette isOpen={isCommandOpen} onClose={setIsCommandOpen} />
    </>
  );
}
