import { useEffect, useRef } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

/**
 * `isOpen`/`onOpen`/`onToggle`/`onClose` are owned by the parent
 * TopNav so it can enforce "only one dropdown open at a time" across
 * Tools, Progress, Management, and the profile menu.
 *
 * Opens on hover (onOpen, fired on mouse enter of the whole trigger+
 * panel wrapper) with a short close delay so moving the pointer from
 * the button down into the panel doesn't flicker-close it. Click
 * still works via onToggle - the hover behavior is a pointer-device
 * enhancement layered on top, not a replacement, so it's unaffected
 * for touch/tablet users who tap instead of hover.
 */
export default function NavDropdown({ label, links, isOpen, onOpen, onToggle, onClose }) {
  const ref = useRef(null);
  const closeTimer = useRef(null);
  const location = useLocation();
  const isSectionActive = links.some((l) => location.pathname === l.to);

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

  // Clear any pending close timer if this dropdown unmounts mid-delay
  // (e.g. the person navigates away while it's closing).
  useEffect(() => () => cancelClose(), []);

  return (
    <div ref={ref} className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`relative flex items-center gap-1.5 px-3 py-2 rounded-full text-sm transition-colors ${
          isSectionActive || isOpen ? "text-accent" : "text-ink hover:text-accent"
        }`}
      >
        {label}
        <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : ""}`} />
        {isSectionActive && (
          <motion.span
            layoutId="nav-underline"
            className="absolute left-3 right-3 -bottom-0.5 h-[2px] bg-accent rounded-full"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-0 top-full pt-2 w-64 z-40"
          >
            <div className="rounded-2xl border border-glass-border bg-surface-2 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.4)] p-2">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 text-sm px-3 py-2.5 rounded-xl transition-colors ${
                        isActive ? "bg-accent-soft text-accent" : "text-ink hover:bg-surface"
                      }`
                    }
                  >
                    <Icon size={16} className="shrink-0" strokeWidth={1.75} />
                    <span className="truncate">{link.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
