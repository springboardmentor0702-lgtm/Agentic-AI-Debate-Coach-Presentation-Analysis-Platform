import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

/**
 * Replaces the old "form on left, history permanently on right"
 * two-column layout. That layout squeezed results into a ~55% wide
 * column and gave a whole 45% of the page to a list that isn't
 * needed most of the time. Now the form and results get the page's
 * full width, and history lives in this slide-in drawer instead -
 * opened on demand, overlaying rather than permanently stealing
 * horizontal space.
 *
 * Usage: render the page's existing search field + <HistoryPanel />
 * as `children`, completely unchanged - only where they render moved,
 * not what they do.
 */
export default function HistoryDrawer({ isOpen, onClose, title, children }) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[26rem] bg-surface-2 border-l border-glass-border z-50 overflow-y-auto"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-glass-border sticky top-0 bg-surface-2 z-10">
              <h2 className="font-mono text-xs tracking-widest text-faint uppercase">{title}</h2>
              <button onClick={onClose} aria-label="Close history" className="p-1 text-faint hover:text-ink transition-colors">
                <X size={20} />
              </button>
            </div>
            <div className="p-5">{children}</div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
