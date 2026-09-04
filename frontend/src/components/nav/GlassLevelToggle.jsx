import { GLASS_LEVELS } from "../../context/themePresets";

const ORDER = ["subtle", "balanced", "vivid"];

/**
 * Deliberately a plain 3-button pill, not a popover - the color
 * picker's popup had to be fixed once already for opening into
 * off-screen space near the bottom of the sidebar/mobile menu. An
 * always-visible control sidesteps that whole bug class.
 */
export default function GlassLevelToggle({ glassLevel, onChange, className = "" }) {
  return (
    <div className={`inline-flex items-center rounded-full border border-glass-border bg-glass p-0.5 ${className}`}>
      {ORDER.map((key) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          title={`${GLASS_LEVELS[key].label} glass effect`}
          className={`px-2.5 py-1.5 rounded-full font-mono text-[10px] uppercase tracking-wide transition-colors ${
            glassLevel === key ? "bg-accent text-surface" : "text-faint hover:text-ink"
          }`}
        >
          {GLASS_LEVELS[key].label}
        </button>
      ))}
    </div>
  );
}
