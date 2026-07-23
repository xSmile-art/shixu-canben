import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useTheme } from "@hooks/useTheme";
import { PRESET_THEMES } from "@themes/presets";
import { THEME_KEY } from "@themes/index";

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("style");
  });

  it("无记录时默认第一套预设", () => {
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme.name).toBe(PRESET_THEMES[0].name);
  });

  it("setTheme 切换主题并持久化", () => {
    const { result } = renderHook(() => useTheme());
    act(() =>
      result.current.setTheme(PRESET_THEMES.find((t) => t.name === "night")!),
    );
    expect(result.current.theme.name).toBe("night");
    expect(JSON.parse(localStorage.getItem(THEME_KEY)!).name).toBe("night");
  });

  it("customizeColor 生成 isCustom 的 custom 主题", () => {
    const { result } = renderHook(() => useTheme());
    act(() => result.current.customizeColor("bg", "#123456"));
    expect(result.current.theme.name).toBe("custom");
    expect(result.current.theme.isCustom).toBe(true);
    expect(result.current.theme.colors.bg).toBe("#123456");
    expect(result.current.theme.colors.fg).toBe(PRESET_THEMES[0].colors.fg);
  });

  it("刷新后恢复持久化主题", () => {
    localStorage.setItem(
      THEME_KEY,
      JSON.stringify(PRESET_THEMES.find((t) => t.name === "green")!),
    );
    const { result } = renderHook(() => useTheme());
    expect(result.current.theme.name).toBe("green");
  });
});
