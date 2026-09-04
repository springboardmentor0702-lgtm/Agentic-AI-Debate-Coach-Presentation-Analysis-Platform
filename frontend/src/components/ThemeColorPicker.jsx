import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Palette } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { ACCENT_THEMES } from "../context/themePresets";

/**
 * A small swatch button that opens a popover of accent color options,
 * plus a "Custom" swatch backed by a native color input for picking
 * any arbitrary color. Purely a presentation preference layered on
 * top of the existing dark/light toggle - picking a color never
 * touches `isDark` or any other setting.
 *
 * `openUp` (default false): opens the popover above the trigger
 * instead of below. Needed anywhere the trigger sits near the bottom
 * of its scroll container (the sidebar's bottom-pinned controls, the
 * mobile menu's bottom row) - opening downward there pushed the
 * swatches past the visible edge, which is exactly what made them
 * unclickable.
 */
export default function ThemeColorPicker({ className = "", iconOnly = true, openUp = false }) {
  const { accentTheme, setAccentTheme, customAccentColor, setCustomAccentColor } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    const handleKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  const isCustomActive = accentTheme === "custom";
  const currentSwatch = isCustomActive ? customAccentColor : ACCENT_THEMES[accentTheme].swatch;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Choose accent color"
        aria-expanded={open}
        title="Choose accent color"
        className={
          className ||
          "inline-flex items-center gap-2 text-sm text-ink hover:bg-surface-2 transition-colors px-2 py-1.5 rounded-sm"
        }
      >
        {iconOnly ? (
          <span
            className="w-4 h-4 rounded-full border border-glass-border shrink-0"
            style={{ backgroundColor: currentSwatch }}
          />
        ) : (
          <>
            <Palette size={15} className="shrink-0" />
            <span>Accent color</span>
            <span
              className="w-3.5 h-3.5 rounded-full border border-glass-border shrink-0 ml-auto"
              style={{ backgroundColor: currentSwatch }}
            />
          </>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: openUp ? 6 : -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: openUp ? 6 : -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={`absolute right-0 z-50 ${openUp ? "bottom-full pb-2" : "top-full pt-2"}`}
          >
            <div className="rounded-2xl border border-glass-border bg-surface-2 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.4)] p-3 w-48">
              <p className="font-mono text-[10px] text-faint uppercase tracking-wide mb-2 px-1">
                Accent color
              </p>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(ACCENT_THEMES).map(([key, theme]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setAccentTheme(key);
                      setOpen(false);
                    }}
                    title={theme.label}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-surface transition-colors"
                  >
                    <span
                      className="w-6 h-6 rounded-full flex items-center justify-center border border-glass-border"
                      style={{ backgroundColor: theme.swatch }}
                    >
                      {accentTheme === key && <Check size={12} className="text-surface" strokeWidth={3} />}
                    </span>
                    <span className="font-mono text-[9px] text-faint uppercase">{theme.label}</span>
                  </button>
                ))}

                {/* Custom: a native color input cropped into the same
                    circular swatch shape as the presets above, so any
                    arbitrary color is one click away rather than being
                    limited to the 6 presets. */}
                <label
                  title="Pick a custom color"
                  className="flex flex-col items-center gap-1 p-2 rounded-xl hover:bg-surface transition-colors cursor-pointer"
                >
                  <span className="relative w-6 h-6 rounded-full border border-glass-border overflow-hidden">
                    <input
                      type="color"
                      value={customAccentColor}
                      onChange={(e) => setCustomAccentColor(e.target.value)}
                      className="absolute -inset-1 w-8 h-8 cursor-pointer border-0 p-0"
                      aria-label="Custom accent color"
                    />
                    {isCustomActive && (
                      <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <Check size={12} className="text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]" strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  <span className="font-mono text-[9px] text-faint uppercase">Custom</span>
                </label>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
