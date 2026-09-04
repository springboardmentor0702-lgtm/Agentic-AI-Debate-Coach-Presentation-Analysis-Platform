import { useMemo } from "react";
import { motion } from "framer-motion";

/**
 * The one shared "glass panel" look for the revamp: translucent
 * fill, blurred backdrop, a hairline border, and a soft inner top
 * highlight to sell the sense of a physical pane of glass catching
 * light. Every glass surface across Home/Login/Register (and future
 * segments) should render through this instead of hand-rolled
 * Tailwind, so the material stays consistent as more pages migrate.
 *
 * `hover` adds a gentle lift + glow on hover/tap - opt out for static
 * panels (e.g. a form card that shouldn't feel clickable as a whole).
 */
export default function GlassCard({
  as: Component = "div",
  children,
  className = "",
  hover = false,
  ...rest
}) {
  // CRITICAL: motion(Component) must be memoized, not called fresh on
  // every render. Calling it inline creates a brand-new component
  // *type* each render, and React treats a changed component type as
  // "this is a different component" - it unmounts the whole subtree
  // and mounts a new one, destroying any real DOM nodes inside
  // (including any <input> a caller nests in here) on every re-render.
  // That was silently breaking every text field on every page wrapped
  // in a GlassCard: typing a character updates state, the parent
  // re-renders, and the input itself got torn down and rebuilt from
  // scratch - losing focus after every single keystroke.
  const MotionComponent = useMemo(() => motion(Component), [Component]);

  const base =
    "relative rounded-2xl border border-glass-border bg-glass backdrop-blur-xl shadow-[0_1px_0_0_var(--glass-shine)_inset,0_20px_60px_-20px_rgba(0,0,0,0.35)]";

  // The hover spring lives *inside* the whileHover/whileTap target
  // objects rather than on a shared top-level `transition` prop, so a
  // caller passing its own `transition` (for an entrance animation
  // via `initial`/`whileInView`) never clobbers the hover feel, and
  // vice versa - the two animations are independent.
  return (
    <MotionComponent
      className={`${base} ${className}`}
      whileHover={
        hover
          ? {
              y: -4,
              boxShadow: "0 1px 0 0 var(--glass-shine) inset, 0 28px 70px -20px rgba(0,0,0,0.4)",
              transition: { type: "spring", stiffness: 300, damping: 24 },
            }
          : undefined
      }
      whileTap={hover ? { y: -1, transition: { type: "spring", stiffness: 400, damping: 25 } } : undefined}
      {...rest}
    >
      {children}
    </MotionComponent>
  );
}
