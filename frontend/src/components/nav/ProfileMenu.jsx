import { useEffect, useRef } from "react";
import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, Bell, LogOut, Sparkles } from "lucide-react";
import { ROLE_LABELS } from "./navData";

export default function ProfileMenu({
  profile,
  unreadCount,
  onLogout,
  isOpen,
  onOpen,
  onToggle,
  onClose,
  onOpenSettings,
}) {
  const ref = useRef(null);
  const closeTimer = useRef(null);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const handleMouseEnter = () => {
    cancelClose();
    onOpen();
  };

  const handleMouseLeave = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => onClose(), 180);
  };

  useEffect(() => {
    if (!isOpen) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => () => cancelClose(), []);

  const initials = (profile?.full_name || "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div ref={ref} className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className="flex items-center gap-2 pl-1.5 pr-2.5 py-1.5 rounded-full border border-glass-border bg-glass backdrop-blur-md hover:border-accent/50 transition-colors"
      >
        <span className="relative">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-accent-soft text-accent font-mono text-[11px] font-medium">
            {initials}
          </span>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-[3px] flex items-center justify-center rounded-full bg-danger text-[9px] font-mono text-surface leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
        <span className="hidden lg:inline text-sm truncate max-w-[7rem]">{profile?.full_name}</span>
        <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute right-0 top-full pt-2 w-64 z-40"
          >
            <div className="rounded-2xl border border-glass-border bg-surface-2 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.4)] p-2">
              <div className="px-3 py-2.5 mb-1 border-b border-glass-border">
                <p className="text-sm truncate">{profile?.full_name}</p>
                <p className="font-mono text-[10px] tracking-wide uppercase text-faint">
                  {ROLE_LABELS[profile?.role] || profile?.role}
                </p>
              </div>

              <NavLink
                to="/notifications"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between text-sm px-3 py-2.5 rounded-xl transition-colors ${
                    isActive ? "bg-accent-soft text-accent" : "text-ink hover:bg-surface"
                  }`
                }
              >
                <span className="flex items-center gap-2.5">
                  <Bell size={16} strokeWidth={1.75} />
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="font-mono text-[10px] bg-accent text-surface rounded-full px-1.5 py-0.5 min-w-[1.25rem] text-center">
                    {unreadCount}
                  </span>
                )}
              </NavLink>

              <NavLink
                to="/profile"
                onClick={onClose}
                className={({ isActive }) =>
                  `block text-sm px-3 py-2.5 rounded-xl transition-colors ${
                    isActive ? "bg-accent-soft text-accent" : "text-ink hover:bg-surface"
                  }`
                }
              >
                Edit profile
              </NavLink>

              <button
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="w-full flex items-center gap-2.5 text-sm px-3 py-2.5 rounded-xl text-ink hover:bg-surface transition-colors"
              >
                <Sparkles size={16} strokeWidth={1.75} />
                Customize appearance
              </button>

              <div className="border-t border-glass-border mt-1 pt-1">
                <button
                  onClick={onLogout}
                  className="w-full flex items-center gap-2.5 text-sm px-3 py-2.5 rounded-xl text-faint hover:text-danger transition-colors"
                >
                  <LogOut size={16} strokeWidth={1.75} />
                  Log out
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
