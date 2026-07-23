import { useState, useCallback, useEffect } from "react";
import type { ReadingSettings, FlipStyle } from "@app-types/settings";
import { DEFAULT_SETTINGS } from "@app-types/settings";
import { readStorage, writeStorage } from "@lib/storage";

export const SETTINGS_KEY = "sxcb-settings";

export function applyReadingSettings(s: ReadingSettings): void {
  const root = document.documentElement;
  root.style.setProperty("--reader-font-size", `${s.fontSize}px`);
  root.style.setProperty("--reader-line-height", String(s.lineHeight));
  root.style.setProperty("--reader-letter-spacing", `${s.letterSpacing}px`);
  root.style.setProperty("--reader-content-width", `${s.contentWidth}px`);
  root.style.setProperty(
    "--reader-paragraph-spacing",
    `${s.paragraphSpacing}em`,
  );
  root.style.setProperty(
    "--reader-paragraph-indent",
    s.paragraphIndent ? "2em" : "0",
  );
}

const RANGES = {
  fontSize: [14, 24],
  lineHeight: [1.5, 2.5],
  letterSpacing: [0, 4],
  paragraphSpacing: [0.5, 2],
  contentWidth: [600, 900],
  brightness: [0.3, 1.0],
} as const;

const FLIP_STYLES: FlipStyle[] = [
  "simulate",
  "cover",
  "slide",
  "vertical",
  "none",
];

function clamp(
  v: unknown,
  [min, max]: readonly [number, number],
  fallback: number,
): number {
  return typeof v === "number" && Number.isFinite(v)
    ? Math.min(Math.max(v, min), max)
    : fallback;
}

function sanitizeSettings(raw: unknown): ReadingSettings {
  const o = (
    raw && typeof raw === "object" ? raw : {}
  ) as Partial<ReadingSettings> & {
    pageMode?: string; // 兼容旧值 "horizontal" / "vertical"
    flipStyle?: string;
  };
  const d = DEFAULT_SETTINGS;

  // ---- 旧 pageMode 迁移 ----
  const rawPm: string | undefined = o.pageMode;
  let pageMode: ReadingSettings["pageMode"];
  if (rawPm === "scroll" || rawPm === "paged") {
    pageMode = rawPm;
  } else if (rawPm === "horizontal" || rawPm === "vertical") {
    pageMode = "paged";
  } else {
    pageMode = d.pageMode;
  }

  // ---- flipStyle 推断 ----
  let flipStyle: FlipStyle;
  const rawFs = o.flipStyle;
  if (
    typeof rawFs === "string" &&
    (FLIP_STYLES as string[]).includes(rawFs)
  ) {
    flipStyle = rawFs as FlipStyle;
  } else if (rawPm === "vertical") {
    // 旧的 "vertical" pageMode → flipStyle: "vertical"
    flipStyle = "vertical";
  } else if (rawPm === "horizontal") {
    // 旧的 "horizontal" pageMode → flipStyle: "simulate"
    flipStyle = "simulate";
  } else {
    flipStyle = d.flipStyle;
  }

  return {
    fontFamily:
      o.fontFamily === "serif" ||
      o.fontFamily === "sans" ||
      o.fontFamily === "kai"
        ? o.fontFamily
        : d.fontFamily,
    fontSize: clamp(o.fontSize, RANGES.fontSize, d.fontSize),
    lineHeight: clamp(o.lineHeight, RANGES.lineHeight, d.lineHeight),
    letterSpacing: clamp(
      o.letterSpacing,
      RANGES.letterSpacing,
      d.letterSpacing,
    ),
    paragraphSpacing: clamp(
      o.paragraphSpacing,
      RANGES.paragraphSpacing,
      d.paragraphSpacing,
    ),
    paragraphIndent:
      typeof o.paragraphIndent === "boolean"
        ? o.paragraphIndent
        : d.paragraphIndent,
    contentWidth: clamp(o.contentWidth, RANGES.contentWidth, d.contentWidth),
    pageMode,
    flipStyle,
    brightness: clamp(o.brightness, RANGES.brightness, d.brightness),
  };
}

export function useReadingSettings() {
  const [settings, setSettings] = useState<ReadingSettings>(() =>
    sanitizeSettings(readStorage<unknown>(SETTINGS_KEY, DEFAULT_SETTINGS)),
  );

  // 副作用跟随 state：settings 变化时持久化 + 写 CSS 变量
  useEffect(() => {
    writeStorage(SETTINGS_KEY, settings);
    applyReadingSettings(settings);
  }, [settings]);

  const update = useCallback((patch: Partial<ReadingSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
  }, []);

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, update, reset };
}
