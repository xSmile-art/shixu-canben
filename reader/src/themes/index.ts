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
