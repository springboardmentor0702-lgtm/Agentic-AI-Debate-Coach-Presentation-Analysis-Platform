import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle({ className = "", iconOnly = false }) {
  const { isDark, toggleTheme } = useTheme();
  const hasCustomClassName = className !== "";

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle dark/light theme"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={
        className ||
        "inline-flex items-center gap-2 text-sm text-ink hover:bg-surface-2 transition-colors px-2 py-1.5 rounded-sm"
      }
    >
      {isDark ? <Moon size={15} className="shrink-0" /> : <Sun size={15} className="shrink-0" />}
      {/*
       * iconOnly (new, defaults to false): the compact circular glass
       * button used on Home/Login/Register wants icon-only, no label
       * space reserved at all. Every existing call site (the sidebar
       * row in AppShell) never passes this prop, so it keeps its
       * current text-plus-icon layout exactly as before, including
       * the min-w-[4.5rem] jitter fix.
       */}
      {!iconOnly && (
        <span
          className={`inline-block text-left ${
            hasCustomClassName ? "min-w-[4.5rem]" : "sr-only sm:not-sr-only sm:min-w-[4.5rem]"
          }`}
        >
          {isDark ? "Dark mode" : "Light mode"}
        </span>
      )}
    </button>
  );
}
