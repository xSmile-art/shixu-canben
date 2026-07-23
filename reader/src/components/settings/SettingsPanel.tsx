import { useState } from "react";
import type { Theme } from "@app-types/theme";
import type { ReadingSettings } from "@app-types/settings";
import { Tabs } from "@components/ui/Tabs";
import { ThemeTab } from "./ThemeTab";
import { TypographyTab } from "./TypographyTab";
import { ReadingTab } from "./ReadingTab";
import { ThemeCustomizer } from "./ThemeCustomizer";

export type SettingsTabKey = "theme" | "typography" | "reading";

interface SettingsPanelProps {
  theme: Theme;
  onSetTheme: (t: Theme) => void;
  onCustomizeColor: (key: keyof Theme["colors"], value: string) => void;
  settings: ReadingSettings;
  onUpdateSettings: (patch: Partial<ReadingSettings>) => void;
  onResetSettings: () => void;
  activeTab?: SettingsTabKey; // 受控：PC 工具条点哪个图标显示哪个 Tab
  onTabChange?: (key: SettingsTabKey) => void;
}

export function SettingsPanel(props: SettingsPanelProps) {
  const {
    theme,
    onSetTheme,
    onCustomizeColor,
    settings,
    onUpdateSettings,
    activeTab,
    onTabChange,
  } = props;
  const [customizing, setCustomizing] = useState(false);

  if (customizing) {
    return (
      <ThemeCustomizer
        theme={theme}
        onChange={onCustomizeColor}
        onBack={() => setCustomizing(false)}
      />
    );
  }

  return (
    <Tabs
      activeKey={activeTab}
      onChange={(k) => onTabChange?.(k as SettingsTabKey)}
      tabs={[
        {
          key: "theme",
          label: "主题",
          content: (
            <ThemeTab
              theme={theme}
              onSetTheme={onSetTheme}
              onOpenCustomizer={() => setCustomizing(true)}
            />
          ),
        },
        {
          key: "typography",
          label: "排版",
          content: (
            <TypographyTab settings={settings} onUpdate={onUpdateSettings} />
          ),
        },
        {
          key: "reading",
          label: "阅读",
          content: (
            <ReadingTab settings={settings} onUpdate={onUpdateSettings} />
          ),
        },
      ]}
    />
  );
}
