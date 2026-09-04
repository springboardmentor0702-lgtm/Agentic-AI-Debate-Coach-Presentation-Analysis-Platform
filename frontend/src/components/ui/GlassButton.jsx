import { useMemo } from "react";
import { motion } from "framer-motion";

const VARIANTS = {
  primary:
    "bg-accent text-surface border-transparent shadow-[0_8px_24px_-8px_var(--accent)] hover:opacity-95",
  glass:
    "bg-glass-strong text-ink border-glass-border backdrop-blur-xl hover:border-accent/50",
  ghost: "bg-transparent text-faint border-transparent hover:text-ink",
};

/**
 * `as` lets this render as a real <button type="submit"> (forms) or
 * as a react-router <Link> (navigation CTAs) without duplicating the
 * visual treatment in two places. Every prop not consumed here
 * (type, disabled, to, onClick...) passes straight through.
 */
export default function GlassButton({
  as: Component = "button",
  variant = "primary",
  className = "",
  children,
  ...rest
}) {
  // See GlassCard.jsx for why this must be memoized rather than
  // called fresh every render - an unmemoized motion(Component) here
  // was the same root cause behind the "can only type one character"
  // bug, any time a GlassButton sat inside the same re-rendering tree
  // as a text field (which is every form in this app).
  const MotionComponent = useMemo(() => motion(Component), [Component]);

  return (
    <MotionComponent
      className={`inline-flex items-center justify-center gap-2 rounded-full border px-6 py-3 font-mono text-xs uppercase tracking-wide transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${VARIANTS[variant]} ${className}`}
      whileHover={{ scale: 1.025, transition: { type: "spring", stiffness: 400, damping: 20 } }}
      whileTap={{ scale: 0.97, transition: { type: "spring", stiffness: 400, damping: 20 } }}
      {...rest}
    >
      {children}
    </MotionComponent>
  );
}
