import { NavLink } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Home, Bell, LogOut, Sparkles } from "lucide-react";
import { ROLE_LABELS } from "./navData";

export default function MobileMenu({
  isOpen,
  onClose,
  profile,
  unreadCount,
  visibleSections,
  onLogout,
  onOpenSettings,
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 md:hidden bg-surface/95 backdrop-blur-xl overflow-y-auto"
        >
          <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border">
            <span className="font-display text-xl tracking-tight">ClashLab</span>
            <button onClick={onClose} aria-label="Close menu" className="p-2 -mr-2 text-ink">
              <X size={22} />
            </button>
          </div>

          <div className="px-5 py-6">
            <NavLink
              to="/dashboard"
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center gap-2.5 text-base px-3 py-3 rounded-xl mb-6 transition-colors ${
                  isActive ? "bg-accent-soft text-accent" : "text-ink hover:bg-glass"
                }`
              }
            >
              <Home size={17} className="shrink-0" />
              Dashboard
            </NavLink>

            {visibleSections.map((section) => (
              <div key={section.label} className="mb-7">
                <p className="font-mono text-xs tracking-widest text-faint uppercase mb-2 px-3">
                  {section.label}
                </p>
                <div className="space-y-0.5">
                  {section.links.map((link) => {
                    const Icon = link.icon;
                    return (
                      <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={onClose}
                        className={({ isActive }) =>
                          `flex items-center gap-2.5 text-base px-3 py-3 rounded-xl transition-colors ${
                            isActive ? "bg-accent-soft text-accent" : "text-ink hover:bg-glass"
                          }`
                        }
                      >
                        <Icon size={17} className="shrink-0" strokeWidth={1.75} />
                        <span className="truncate">{link.label}</span>
                      </NavLink>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="border-t border-glass-border pt-4 space-y-0.5">
              <NavLink
                to="/notifications"
                onClick={onClose}
                className={({ isActive }) =>
                  `flex items-center justify-between text-base px-3 py-3 rounded-xl transition-colors ${
                    isActive ? "bg-accent-soft text-accent" : "text-ink hover:bg-glass"
                  }`
                }
              >
                <span className="flex items-center gap-2.5">
                  <Bell size={17} />
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
                  `flex items-center justify-between gap-2 text-base px-3 py-3 rounded-xl transition-colors ${
                    isActive ? "bg-accent-soft text-accent" : "text-ink hover:bg-glass"
                  }`
                }
              >
                <span className="min-w-0">
                  <span className="block truncate">{profile?.full_name}</span>
                  <span className="block font-mono text-[10px] tracking-wide uppercase text-faint">
                    {ROLE_LABELS[profile?.role] || profile?.role} · Edit
                  </span>
                </span>
              </NavLink>

              <button
                onClick={() => {
                  onClose();
                  onOpenSettings();
                }}
                className="w-full flex items-center gap-2.5 text-base px-3 py-3 rounded-xl text-ink hover:bg-glass transition-colors"
              >
                <Sparkles size={17} strokeWidth={1.75} />
                Customize appearance
              </button>

              <button
                onClick={onLogout}
                className="w-full flex items-center gap-2.5 text-base px-3 py-3 rounded-xl text-faint hover:text-danger transition-colors"
              >
                <LogOut size={17} />
                Log out
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
