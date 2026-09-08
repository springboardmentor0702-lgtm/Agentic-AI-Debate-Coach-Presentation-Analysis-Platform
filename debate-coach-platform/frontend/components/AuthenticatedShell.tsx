"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BarChart3, BookOpen, LogOut, Menu, PanelLeftClose, UserRound, Users, X } from "lucide-react";

import { getCurrentUser, logoutUser, User } from "@/services/auth";

const publicRoutes = ["/", "/login", "/register"];

export default function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (publicRoutes.includes(pathname)) return;

    const accessToken = window.localStorage.getItem("accessToken");
    if (!accessToken) return;

    void getCurrentUser().then(setUser).catch(() => setUser(null));
  }, [pathname]);

  if (publicRoutes.includes(pathname) || !user) {
    return <>{children}</>;
  }

  const normalizedRole = user.role.trim().toUpperCase();
  const isExpert = ["DEBATE_EXPERT", "DEBATE_COACH", "EXPERT", "COACH"].includes(normalizedRole);
  const homePath = isExpert ? "/expert" : "/dashboard";

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await logoutUser();
    } finally {
      router.replace("/login");
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 lg:flex">
      <button
        type="button"
        aria-label="Open navigation"
        onClick={() => setSidebarOpen(true)}
        className="fixed left-4 top-4 z-30 rounded-lg bg-slate-900 p-2 text-white shadow-lg lg:hidden"
      >
        <Menu size={20} />
      </button>

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
        />
      ) : null}

      <aside className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-slate-900 px-5 py-6 text-white shadow-xl transition-transform lg:static lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex items-start justify-between border-b border-slate-700 pb-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-teal-300">Debate Coach</p>
            <p className="mt-2 text-lg font-semibold">{user.full_name}</p>
            <p className="mt-1 text-sm text-slate-400">{isExpert ? "Debate expert" : "Learner"}</p>
          </div>
          <button type="button" aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="text-slate-400 hover:text-white lg:hidden">
            <X size={20} />
          </button>
        </div>

        <nav className="mt-6 flex-1 space-y-1" aria-label="Main navigation">
          <SidebarLink href={homePath} icon={<PanelLeftClose size={18} />} label="Dashboard" onClick={() => setSidebarOpen(false)} />
          <SidebarLink href="/analytics" icon={<BarChart3 size={18} />} label="Performance & progress" onClick={() => setSidebarOpen(false)} />
          <SidebarLink href="/debates" icon={<BookOpen size={18} />} label="Debate session history" onClick={() => setSidebarOpen(false)} />
          <SidebarLink href="/profile" icon={<UserRound size={18} />} label="My profile" onClick={() => setSidebarOpen(false)} />
          <SidebarLink href={isExpert ? "/expert/learners" : "/learner/practice"} icon={<Users size={18} />} label={isExpert ? "Learner profiles" : "Practice with learners"} onClick={() => setSidebarOpen(false)} />
        </nav>

        <button
          type="button"
          onClick={() => void handleLogout()}
          disabled={loggingOut}
          className="flex items-center gap-3 rounded-lg border border-slate-700 px-3 py-3 text-left text-sm font-semibold text-slate-200 hover:bg-slate-800 disabled:opacity-60"
        >
          <LogOut size={18} />
          {loggingOut ? "Logging out..." : "Log out"}
        </button>
      </aside>

      <div className="min-w-0 flex-1 lg:pl-0">{children}</div>
    </div>
  );
}

function SidebarLink({ href, icon, label, onClick }: { href: string; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">
      {icon}
      {label}
    </Link>
  );
}