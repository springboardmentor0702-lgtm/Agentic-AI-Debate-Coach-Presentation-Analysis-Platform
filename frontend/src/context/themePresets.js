// Base surface/ink/status colors - identical to the original values
// this project shipped with, and entirely independent of accent color
// or glass-level choice.
export const BASE_VARS = {
  dark: {
    "--surface": "#0f1117",
    "--surface-2": "#181c26",
    "--ink": "#edf0f3",
    "--faint": "#8a93a8",
    "--line": "#262b3a",
    "--ok": "#4caf6d",
    "--danger": "#e5484d",
    "--void": "#06070b",
  },
  light: {
    "--surface": "#f4f5fa",
    "--surface-2": "#e9ebf3",
    "--ink": "#14171f",
    "--faint": "#5b6472",
    "--line": "#dde1eb",
    "--ok": "#2f8f55",
    "--danger": "#c53030",
    "--void": "#e7e9f2",
  },
};

/**
 * Glass intensity levels. "balanced" is byte-for-byte the original
 * --glass* values this project shipped with, so the default look is
 * unchanged. This only ever adjusts the translucent fill/border/shine
 * used by GlassCard, GlassField, HistoryPanel/HistoryDrawer, and
 * similar decorative surfaces - it does NOT touch the nav chrome
 * (top bar, sidebar, dropdown panels), which was deliberately made
 * solid/opaque in an earlier fix for legibility and stays that way
 * regardless of this setting. The blur radius + saturation boost is
 * handled by a `[data-glass="..."]` CSS rule in index.css that
 * overrides Tailwind's `backdrop-blur-xl` class specifically (never
 * `backdrop-blur-md`, which is what the protected nav chrome uses).
 *
 * The gap between levels is deliberately large: backdrop blur alone
 * is barely visible against a mostly flat page background, so the
 * opacity swing between levels has to carry most of the "does this
 * actually look glassy" signal, with blur + a saturate() boost (the
 * trick real glass UIs use - it makes whatever's faintly showing
 * through read as richer/more colorful) doing the rest.
 */
export const GLASS_LEVELS = {
  subtle: {
    label: "Subtle",
    dark: { "--glass": "rgba(255, 255, 255, 0.16)", "--glass-strong": "rgba(255, 255, 255, 0.22)", "--glass-border": "rgba(255, 255, 255, 0.22)", "--glass-shine": "rgba(255, 255, 255, 0.7)" },
    light: { "--glass": "rgba(255, 255, 255, 0.88)", "--glass-strong": "rgba(255, 255, 255, 0.94)", "--glass-border": "rgba(20, 23, 31, 0.14)", "--glass-shine": "rgba(255, 255, 255, 0.98)" },
  },
  balanced: {
    label: "Balanced",
    dark: { "--glass": "rgba(255, 255, 255, 0.045)", "--glass-strong": "rgba(255, 255, 255, 0.08)", "--glass-border": "rgba(255, 255, 255, 0.11)", "--glass-shine": "rgba(255, 255, 255, 0.5)" },
    light: { "--glass": "rgba(255, 255, 255, 0.55)", "--glass-strong": "rgba(255, 255, 255, 0.75)", "--glass-border": "rgba(20, 23, 31, 0.08)", "--glass-shine": "rgba(255, 255, 255, 0.9)" },
  },
  vivid: {
    label: "Vivid",
    dark: { "--glass": "rgba(255, 255, 255, 0.02)", "--glass-strong": "rgba(255, 255, 255, 0.035)", "--glass-border": "rgba(255, 255, 255, 0.06)", "--glass-shine": "rgba(255, 255, 255, 0.35)" },
    light: { "--glass": "rgba(255, 255, 255, 0.22)", "--glass-strong": "rgba(255, 255, 255, 0.38)", "--glass-border": "rgba(20, 23, 31, 0.05)", "--glass-shine": "rgba(255, 255, 255, 0.6)" },
  },
  ultra: {
    label: "Ultra",
    dark: { "--glass": "rgba(255, 255, 255, 0.012)", "--glass-strong": "rgba(255, 255, 255, 0.02)", "--glass-border": "rgba(255, 255, 255, 0.045)", "--glass-shine": "rgba(255, 255, 255, 0.25)" },
    light: { "--glass": "rgba(255, 255, 255, 0.12)", "--glass-strong": "rgba(255, 255, 255, 0.22)", "--glass-border": "rgba(20, 23, 31, 0.035)", "--glass-shine": "rgba(255, 255, 255, 0.45)" },
  },
};

export const DEFAULT_GLASS_LEVEL = "balanced";

/**
 * Accent color themes. "violet" is byte-for-byte the original values
 * this project shipped with (and stays the default), so anyone who
 * never touches this setting sees zero change. Every other page in
 * the app reaches the accent exclusively through the `--accent` /
 * `--accent-soft` / `--accent-2` / `--accent-2-soft` CSS variables
 * (never a hardcoded hex), which is what makes swapping the whole
 * app's color identity safe from just this one file - there was
 * nowhere else that had quietly hardcoded purple outside of this
 * palette and the multi-series chart palettes (which are deliberately
 * fixed regardless of theme, since a 5-line trend chart needs 5
 * distinct colors no matter what the brand accent is).
 */
export const ACCENT_THEMES = {
  violet: {
    label: "Violet",
    swatch: "#8b80f9",
    dark: { "--accent": "#8b80f9", "--accent-soft": "rgba(139, 128, 249, 0.16)", "--accent-2": "#ff8a5c", "--accent-2-soft": "rgba(255, 138, 92, 0.14)" },
    light: { "--accent": "#5b4fe0", "--accent-soft": "rgba(91, 79, 224, 0.10)", "--accent-2": "#e2661f", "--accent-2-soft": "rgba(226, 102, 31, 0.1)" },
  },
  blue: {
    label: "Blue",
    swatch: "#5b9df9",
    dark: { "--accent": "#5b9df9", "--accent-soft": "rgba(91, 157, 249, 0.16)", "--accent-2": "#ffb44d", "--accent-2-soft": "rgba(255, 180, 77, 0.14)" },
    light: { "--accent": "#2f6fe0", "--accent-soft": "rgba(47, 111, 224, 0.10)", "--accent-2": "#cc7a00", "--accent-2-soft": "rgba(204, 122, 0, 0.1)" },
  },
  emerald: {
    label: "Emerald",
    swatch: "#4ecb8a",
    dark: { "--accent": "#4ecb8a", "--accent-soft": "rgba(78, 203, 138, 0.16)", "--accent-2": "#ff6fae", "--accent-2-soft": "rgba(255, 111, 174, 0.14)" },
    light: { "--accent": "#1f9d5c", "--accent-soft": "rgba(31, 157, 92, 0.10)", "--accent-2": "#d13d82", "--accent-2-soft": "rgba(209, 61, 130, 0.1)" },
  },
  rose: {
    label: "Rose",
    swatch: "#f9789d",
    dark: { "--accent": "#f9789d", "--accent-soft": "rgba(249, 120, 157, 0.16)", "--accent-2": "#4dd0c4", "--accent-2-soft": "rgba(77, 208, 196, 0.14)" },
    light: { "--accent": "#d63873", "--accent-soft": "rgba(214, 56, 115, 0.10)", "--accent-2": "#128a80", "--accent-2-soft": "rgba(18, 138, 128, 0.1)" },
  },
  amber: {
    label: "Amber",
    swatch: "#ffab4d",
    dark: { "--accent": "#ffab4d", "--accent-soft": "rgba(255, 171, 77, 0.16)", "--accent-2": "#7c93f9", "--accent-2-soft": "rgba(124, 147, 249, 0.14)" },
    light: { "--accent": "#c66900", "--accent-soft": "rgba(198, 105, 0, 0.10)", "--accent-2": "#3d55c9", "--accent-2-soft": "rgba(61, 85, 201, 0.1)" },
  },
  teal: {
    label: "Teal",
    swatch: "#4dd0c4",
    dark: { "--accent": "#4dd0c4", "--accent-soft": "rgba(77, 208, 196, 0.16)", "--accent-2": "#f9789d", "--accent-2-soft": "rgba(249, 120, 157, 0.14)" },
    light: { "--accent": "#0f8f82", "--accent-soft": "rgba(15, 143, 130, 0.10)", "--accent-2": "#c93d6e", "--accent-2-soft": "rgba(201, 61, 110, 0.1)" },
  },
};

export const DEFAULT_ACCENT = "violet";
export const DEFAULT_CUSTOM_COLOR = "#8b80f9";

// --- Small self-contained color-space helpers, used only to derive a
// full light/dark accent palette from one arbitrary hex the person
// picks. No dependency pulled in for this - it's ~30 lines of the
// standard hex<->rgb<->hsl conversions.
function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const n = parseInt(clean.length === 3 ? clean.replace(/(.)/g, "$1$1") : clean, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgbToHex(r, g, b) {
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  return "#" + [r, g, b].map((v) => clamp(v).toString(16).padStart(2, "0")).join("");
}

function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      default: h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  h /= 360;
  s /= 100;
  l /= 100;
  if (s === 0) {
    const v = l * 255;
    return { r: v, g: v, b: v };
  }
  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  return {
    r: hue2rgb(p, q, h + 1 / 3) * 255,
    g: hue2rgb(p, q, h) * 255,
    b: hue2rgb(p, q, h - 1 / 3) * 255,
  };
}

/**
 * Builds a full light/dark accent palette from one arbitrary hex, the
 * same way ACCENT_THEMES hand-picked pairs above - lighter/more vivid
 * for the dark surface, deepened for contrast on the light surface -
 * plus an automatic complementary secondary color (hue rotated, not a
 * true 180° opposite, which tends to read as muddy) for the same
 * "two sides of the clash" accent-2 role the hero and a few cards use.
 * This is a readability heuristic, not real contrast-ratio math, but
 * it keeps any picked color usable in both modes without asking the
 * person to pick twice.
 */
export function deriveCustomPalette(hex) {
  const { r, g, b } = hexToRgb(hex);
  const { h, s } = rgbToHsl(r, g, b);
  const sat = Math.max(s, 50);

  const darkRgb = hslToRgb(h, sat, 68);
  const lightRgb = hslToRgb(h, Math.max(s, 55), 40);
  const compHue = h + 150;
  const darkComp = hslToRgb(compHue, sat, 66);
  const lightComp = hslToRgb(compHue, Math.max(s, 55), 40);

  const rgba = (c, a) => `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${a})`;

  return {
    dark: {
      "--accent": rgbToHex(darkRgb.r, darkRgb.g, darkRgb.b),
      "--accent-soft": rgba(darkRgb, 0.16),
      "--accent-2": rgbToHex(darkComp.r, darkComp.g, darkComp.b),
      "--accent-2-soft": rgba(darkComp, 0.14),
    },
    light: {
      "--accent": rgbToHex(lightRgb.r, lightRgb.g, lightRgb.b),
      "--accent-soft": rgba(lightRgb, 0.1),
      "--accent-2": rgbToHex(lightComp.r, lightComp.g, lightComp.b),
      "--accent-2-soft": rgba(lightComp, 0.1),
    },
  };
}
