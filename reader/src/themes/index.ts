import type { Theme } from "@app-types/theme";
import { PRESET_THEMES } from "@themes/presets";
import { readStorage, writeStorage } from "@lib/storage";

export const THEME_KEY = "sxcb-theme";

export function applyTheme(theme: Theme): void {
  const root = document.documentElement;
  root.style.setProperty("--color-bg", theme.colors.bg);
  root.style.setProperty("--color-fg", theme.colors.fg);
  root.style.setProperty("--color-accent", theme.colors.accent);
  root.style.setProperty("--color-muted", theme.colors.muted);
  root.style.setProperty("--color-border", theme.colors.border);
  root.style.setProperty("--color-highlight", theme.colors.highlight);
  const dark = isDark(theme.colors.bg);
  root.style.colorScheme = dark ? "dark" : "light";
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme.colors.bg);
}

function isDark(hex: string): boolean {
  const value = hex.match(/^#([0-9a-f]{6})$/i)?.[1];
  if (!value) return false;
  const [r, g, b] = [0, 2, 4].map((i) => Number.parseInt(value.slice(i, i + 2), 16));
  return (r * 299 + g * 587 + b * 114) / 1000 < 128;
}

export function saveTheme(theme: Theme): void {
  writeStorage(THEME_KEY, theme);
}

// 读持久化主题；无记录或找不到对应 name 时回退到第一套预设（日间白）
export function loadTheme(): Theme {
  const saved = readStorage<Theme | null>(THEME_KEY, null);
  if (!saved) return PRESET_THEMES[0];
  if (saved.name === "custom" && saved.isCustom) return saved;
  const found = PRESET_THEMES.find((t) => t.name === saved.name);
  return found ?? PRESET_THEMES[0];
}
