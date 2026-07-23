import { useState, useCallback, useEffect } from "react";
import type { Theme, ThemeColors } from "@app-types/theme";
import { applyTheme, loadTheme, saveTheme } from "@themes/index";

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => loadTheme());

  // 副作用跟随 state：theme 变化时持久化 + 写 CSS 变量
  useEffect(() => {
    saveTheme(theme);
    applyTheme(theme);
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const customizeColor = useCallback(
    (key: keyof ThemeColors, value: string) => {
      setThemeState((prev) => ({
        ...prev,
        name: "custom",
        label: "我的主题",
        colors: { ...prev.colors, [key]: value },
        isCustom: true,
      }));
    },
    [],
  );

  return { theme, setTheme, customizeColor };
}
