import { NavLink } from "react-router-dom";
import { Bell, LogOut, Home, Sparkles } from "lucide-react";
import { ROLE_LABELS } from "./navData";

const linkClass = ({ isActive }) =>
  `flex items-center gap-2.5 text-sm px-3 py-2.5 rounded-xl transition-colors ${
    isActive ? "bg-accent-soft text-accent" : "text-ink hover:bg-glass-strong"
  }`;

export default function SideNav({
  profile,
  unreadCount,
  visibleSections,
  onLogout,
  onOpenSettings,
}) {
  const initials = (profile?.full_name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <aside className="hidden md:flex flex-col fixed top-0 left-0 h-screen w-64 border-r border-glass-border bg-surface/95 backdrop-blur-md z-30">
      <div className="px-5 h-16 flex items-center border-b border-glass-border shrink-0">
        <NavLink to="/dashboard" className="font-display text-lg tracking-tight">
          ClashLab
        </NavLink>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <NavLink to="/dashboard" className={linkClass}>
          <Home size={16} strokeWidth={1.75} />
          Dashboard
        </NavLink>

        {visibleSections.map((section) => (
          <div key={section.label}>
            <p className="font-mono text-[10px] tracking-widest text-faint uppercase mb-1.5 px-3">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.links.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink key={link.to} to={link.to} className={linkClass}>
                    <Icon size={16} className="shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{link.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-glass-border p-3 shrink-0 space-y-1">
        <NavLink to="/notifications" className={linkClass}>
          <span className="flex items-center gap-2.5">
            <Bell size={16} strokeWidth={1.75} />
            Notifications
          </span>
          {unreadCount > 0 && (
            <span className="ml-auto font-mono text-[10px] bg-accent text-surface rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
              {unreadCount}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/profile"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl hover:bg-glass-strong transition-colors"
        >
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-accent-soft text-accent font-mono text-[11px] font-medium shrink-0">
            {initials}
          </span>
          <span className="min-w-0">
            <span className="block text-sm truncate">{profile?.full_name}</span>
            <span className="block font-mono text-[10px] tracking-wide uppercase text-faint">
              {ROLE_LABELS[profile?.role] || profile?.role}
            </span>
          </span>
        </NavLink>

        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-faint hover:text-accent hover:bg-glass-strong transition-colors"
        >
          <Sparkles size={16} strokeWidth={1.75} />
          Customize appearance
        </button>

        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-faint hover:text-danger transition-colors"
        >
          <LogOut size={16} strokeWidth={1.75} />
          Log out
        </button>
      </div>
    </aside>
  );
}
