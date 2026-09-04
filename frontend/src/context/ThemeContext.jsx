import { createContext, useContext, useState, useEffect } from "react";
import {
  BASE_VARS,
  GLASS_LEVELS,
  DEFAULT_GLASS_LEVEL,
  ACCENT_THEMES,
  DEFAULT_ACCENT,
  DEFAULT_CUSTOM_COLOR,
  deriveCustomPalette,
} from "./themePresets";

const ThemeContext = createContext(null);

function applyTheme(isDark, accentKey, customColor, glassLevel) {
  const base = isDark ? BASE_VARS.dark : BASE_VARS.light;
  let accent;
  if (accentKey === "custom") {
    const palette = deriveCustomPalette(customColor || DEFAULT_CUSTOM_COLOR);
    accent = isDark ? palette.dark : palette.light;
  } else {
    const preset = ACCENT_THEMES[accentKey] || ACCENT_THEMES[DEFAULT_ACCENT];
    accent = isDark ? preset.dark : preset.light;
  }
  const glass = GLASS_LEVELS[glassLevel] || GLASS_LEVELS[DEFAULT_GLASS_LEVEL];
  const glassVars = isDark ? glass.dark : glass.light;
  const vars = { ...base, ...accent, ...glassVars };
  Object.entries(vars).forEach(([key, value]) => {
    document.documentElement.style.setProperty(key, value);
  });
  document.documentElement.classList.toggle("dark", isDark);
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  // Drives the backdrop-blur-xl override in index.css - see the
  // GLASS_LEVELS comment in themePresets.js for why this only affects
  // that class and never the nav chrome's backdrop-blur-md.
  document.documentElement.setAttribute("data-glass", glassLevel);
}

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return true;
    const stored = localStorage.getItem("theme");
    if (stored) return stored === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  const [accentTheme, setAccentThemeState] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_ACCENT;
    const stored = localStorage.getItem("accentTheme");
    return stored && (ACCENT_THEMES[stored] || stored === "custom") ? stored : DEFAULT_ACCENT;
  });

  const [customAccentColor, setCustomAccentColorState] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_CUSTOM_COLOR;
    return localStorage.getItem("customAccentColor") || DEFAULT_CUSTOM_COLOR;
  });

  const [glassLevel, setGlassLevelState] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_GLASS_LEVEL;
    const stored = localStorage.getItem("glassLevel");
    return stored && GLASS_LEVELS[stored] ? stored : DEFAULT_GLASS_LEVEL;
  });

  useEffect(() => {
    applyTheme(isDark, accentTheme, customAccentColor, glassLevel);
    localStorage.setItem("theme", isDark ? "dark" : "light");
    localStorage.setItem("accentTheme", accentTheme);
    localStorage.setItem("customAccentColor", customAccentColor);
    localStorage.setItem("glassLevel", glassLevel);
  }, [isDark, accentTheme, customAccentColor, glassLevel]);

  const toggleTheme = () => setIsDark((d) => !d);

  const setAccentTheme = (key) => {
    if (ACCENT_THEMES[key] || key === "custom") setAccentThemeState(key);
  };

  const setGlassLevel = (key) => {
    if (GLASS_LEVELS[key]) setGlassLevelState(key);
  };

  // Picking a custom color both stores it and switches the active
  // preset to "custom" in one step, so the picker only has to call
  // this and doesn't need to separately call setAccentTheme("custom").
  const setCustomAccentColor = (hex) => {
    setCustomAccentColorState(hex);
    setAccentThemeState("custom");
  };

  return (
    <ThemeContext.Provider
      value={{
        isDark,
        toggleTheme,
        accentTheme,
        setAccentTheme,
        customAccentColor,
        setCustomAccentColor,
        glassLevel,
        setGlassLevel,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === null) {
    throw new Error("useTheme must be used inside <ThemeProvider>");
  }
  return context;
}
