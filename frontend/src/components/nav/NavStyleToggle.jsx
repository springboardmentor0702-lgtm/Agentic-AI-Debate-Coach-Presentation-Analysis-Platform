import { PanelTop, PanelLeft } from "lucide-react";

/**
 * Purely a layout-chrome preference - never touches page content or
 * any route. `navStyle` is owned by AppShell (localStorage-persisted,
 * same pattern as ThemeContext's dark/light + accent choice) and
 * passed down here so the control can live wherever it makes sense
 * (profile menu, mobile menu, or inside the sidebar itself).
 */
export default function NavStyleToggle({ navStyle, onChange, className = "" }) {
  return (
    <div className={`inline-flex items-center rounded-full border border-glass-border bg-glass p-0.5 ${className}`}>
      <button
        onClick={() => onChange("top")}
        title="Top navigation bar"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-wide transition-colors ${
          navStyle === "top" ? "bg-accent text-surface" : "text-faint hover:text-ink"
        }`}
      >
        <PanelTop size={13} />
        Top
      </button>
      <button
        onClick={() => onChange("side")}
        title="Side navigation bar"
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-wide transition-colors ${
          navStyle === "side" ? "bg-accent text-surface" : "text-faint hover:text-ink"
        }`}
      >
        <PanelLeft size={13} />
        Side
      </button>
    </div>
  );
}
