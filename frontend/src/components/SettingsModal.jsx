import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sun, Moon, Check, Sparkles, PanelTop, PanelLeft } from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { ACCENT_THEMES, GLASS_LEVELS } from "../context/themePresets";

function OptionCard({ active, onClick, icon: Icon, label, className = "" }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-3 p-4 rounded-2xl border transition-colors ${
        active ? "border-accent bg-accent-soft" : "border-glass-border hover:border-accent/40"
      } ${className}`}
    >
      <Icon size={18} className={active ? "text-accent" : "text-faint"} />
      <span className={`text-sm ${active ? "text-accent" : "text-ink"}`}>{label}</span>
    </button>
  );
}

/**
 * Every appearance preference (theme mode, accent color, glass
 * intensity, nav layout) lives in one spacious, centered panel instead
 * of being crammed inline into the sidebar/profile menu/mobile menu.
 * Rendered as a fixed full-viewport overlay, so it's always centered
 * regardless of where its trigger button sits.
 *
 * Owned by AppShell (single shared instance, not one per nav surface)
 * specifically so it's never a DOM descendant of a `backdrop-blur-*`
 * header - that property creates a new CSS containing block for
 * `position: fixed` children, which was squashing this panel into the
 * header's own small box when it used to be nested inside the top
 * nav's profile menu.
 */
export default function SettingsModal({ isOpen, onClose, navStyle, onNavStyleChange }) {
  const {
    isDark,
    toggleTheme,
    accentTheme,
    setAccentTheme,
    customAccentColor,
    setCustomAccentColor,
    glassLevel,
    setGlassLevel,
  } = useTheme();

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen, onClose]);

  const isCustomActive = accentTheme === "custom";

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
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
          />
          <div className="fixed inset-0 z-[101] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              transition={{ type: "spring", stiffness: 320, damping: 30 }}
              className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-3xl border border-glass-border bg-surface-2 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.5)]"
            >
              <div className="sticky top-0 z-10 bg-surface-2">
                <div className="flex items-center justify-between px-6 py-5 border-b border-glass-border">
                  <div className="flex items-center gap-2.5">
                    <Sparkles size={18} className="text-accent" />
                    <h2 className="font-display text-xl">Customize appearance</h2>
                  </div>
                  <button
                    onClick={onClose}
                    aria-label="Close"
                    className="p-1.5 text-faint hover:text-ink rounded-full hover:bg-glass transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/*
                 * Live preview - every value here reads the real, live
                 * CSS variables (accent/accent-2/glass tokens), so it
                 * updates instantly as any option below is changed,
                 * with zero extra state to keep in sync. The backdrop
                 * behind the glass card is a deliberately busy gradient
                 * (not a flat color) specifically so the blur is
                 * actually visible - the same reason the glass effect
                 * was hard to notice out in the app on mostly flat
                 * page backgrounds. Grouped into the same sticky
                 * container as the header above (rather than its own
                 * separately-stuck element) so there's no fragile
                 * pixel offset to keep in sync with the header's height.
                 */}
                <div className="px-6 pt-4 pb-5 border-b border-glass-border">
                  <p className="font-mono text-[10px] text-faint uppercase tracking-wide mb-2">
                    Live preview
                  </p>
                  <div
                    className="relative rounded-2xl overflow-hidden p-5"
                    style={{
                      background:
                        "radial-gradient(circle at 20% 20%, var(--accent-soft), transparent 55%), radial-gradient(circle at 85% 75%, var(--accent-2-soft), transparent 55%), var(--surface)",
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-70"
                      style={{
                        background:
                          "radial-gradient(circle at 30% 15%, var(--accent), transparent 45%), radial-gradient(circle at 80% 85%, var(--accent-2), transparent 45%)",
                      }}
                    />
                    <div className="relative bg-glass backdrop-blur-xl border border-glass-border rounded-xl p-4">
                      <p className="font-mono text-[10px] text-accent uppercase tracking-wide mb-1.5">
                        Sample card
                      </p>
                      <p className="text-sm text-ink mb-3">
                        This is roughly how cards and panels will look across the app.
                      </p>
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center bg-accent text-surface rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide">
                          Primary
                        </span>
                        <span className="inline-flex items-center border border-glass-border rounded-full px-3 py-1.5 font-mono text-[10px] uppercase tracking-wide text-faint">
                          Secondary
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-9">
                <section>
                  <h3 className="font-mono text-xs tracking-widest text-faint uppercase mb-3">
                    Theme mode
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <OptionCard active={!isDark} onClick={() => isDark && toggleTheme()} icon={Sun} label="Light" />
                    <OptionCard active={isDark} onClick={() => !isDark && toggleTheme()} icon={Moon} label="Dark" />
                  </div>
                </section>

                <section>
                  <h3 className="font-mono text-xs tracking-widest text-faint uppercase mb-3">
                    Accent color
                  </h3>
                  <div className="grid grid-cols-4 gap-3">
                    {Object.entries(ACCENT_THEMES).map(([key, theme]) => (
                      <button
                        key={key}
                        onClick={() => setAccentTheme(key)}
                        className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-glass transition-colors"
                      >
                        <span
                          className="w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors"
                          style={{
                            backgroundColor: theme.swatch,
                            borderColor: accentTheme === key ? "var(--ink)" : "transparent",
                          }}
                        >
                          {accentTheme === key && (
                            <Check size={16} className="text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]" strokeWidth={3} />
                          )}
                        </span>
                        <span className="font-mono text-[10px] text-faint uppercase">{theme.label}</span>
                      </button>
                    ))}

                    <label className="flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-glass transition-colors cursor-pointer">
                      <span
                        className="relative w-9 h-9 rounded-full border-2 overflow-hidden transition-colors"
                        style={{ borderColor: isCustomActive ? "var(--ink)" : "transparent" }}
                      >
                        <input
                          type="color"
                          value={customAccentColor}
                          onChange={(e) => setCustomAccentColor(e.target.value)}
                          className="absolute -inset-1.5 w-12 h-12 cursor-pointer border-0 p-0"
                          aria-label="Custom accent color"
                        />
                        {isCustomActive && (
                          <span className="absolute inset-0 flex items-center justify-center pointer-events-none">
                            <Check size={16} className="text-white drop-shadow-[0_0_2px_rgba(0,0,0,0.8)]" strokeWidth={3} />
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-[10px] text-faint uppercase">Custom</span>
                    </label>
                  </div>
                </section>

                <section>
                  <h3 className="font-mono text-xs tracking-widest text-faint uppercase mb-3">
                    Glass effect
                  </h3>
                  <div className="grid grid-cols-4 gap-2">
                    {Object.entries(GLASS_LEVELS).map(([key, level]) => (
                      <button
                        key={key}
                        onClick={() => setGlassLevel(key)}
                        className={`py-3 rounded-xl border font-mono text-[10px] uppercase tracking-wide transition-colors ${
                          glassLevel === key
                            ? "border-accent bg-accent-soft text-accent"
                            : "border-glass-border text-faint hover:border-accent/40"
                        }`}
                      >
                        {level.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-faint mt-2.5">
                    Controls how see-through cards and panels look. The navigation bar always
                    stays fully readable regardless of this setting.
                  </p>
                </section>

                <section>
                  <h3 className="font-mono text-xs tracking-widest text-faint uppercase mb-3">
                    Navigation layout
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <OptionCard
                      active={navStyle === "top"}
                      onClick={() => onNavStyleChange("top")}
                      icon={PanelTop}
                      label="Top bar"
                    />
                    <OptionCard
                      active={navStyle === "side"}
                      onClick={() => onNavStyleChange("side")}
                      icon={PanelLeft}
                      label="Sidebar"
                    />
                  </div>
                </section>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
