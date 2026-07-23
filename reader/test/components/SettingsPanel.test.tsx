import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsPanel } from "@components/settings/SettingsPanel";
import { PRESET_THEMES } from "@themes/presets";
import { DEFAULT_SETTINGS } from "@app-types/settings";

function makeProps() {
  return {
    theme: PRESET_THEMES[0],
    onSetTheme: vi.fn(),
    onCustomizeColor: vi.fn(),
    settings: DEFAULT_SETTINGS,
    onUpdateSettings: vi.fn(),
    onResetSettings: vi.fn(),
  };
}

describe("SettingsPanel", () => {
  it("默认显示主题 Tab，含 8 套预设", () => {
    render(<SettingsPanel {...makeProps()} />);
    expect(screen.getByText("日间白")).toBeInTheDocument();
    expect(screen.getByText("深蓝夜")).toBeInTheDocument();
  });

  it('受控 activeTab="typography" 直接显示排版面板', () => {
    render(
      <SettingsPanel
        {...makeProps()}
        activeTab="typography"
        onTabChange={() => {}}
      />,
    );
    expect(screen.getByText("字号")).toBeInTheDocument();
    expect(screen.getByText("行距")).toBeInTheDocument();
  });

  it('受控 activeTab="reading" 直接显示阅读面板', () => {
    render(
      <SettingsPanel
        {...makeProps()}
        activeTab="reading"
        onTabChange={() => {}}
      />,
    );
    expect(screen.getByText("阅读模式")).toBeInTheDocument();
    expect(screen.getByText("亮度")).toBeInTheDocument();
  });

  it("点预设主题触发 onSetTheme", () => {
    const props = makeProps();
    render(<SettingsPanel {...props} />);
    fireEvent.click(screen.getByText("夜间黑"));
    expect(props.onSetTheme).toHaveBeenCalledWith(
      expect.objectContaining({ name: "night" }),
    );
  });

  it("排版 Tab 调字号触发 onUpdateSettings", () => {
    const props = makeProps();
    render(
      <SettingsPanel
        {...props}
        activeTab="typography"
        onTabChange={() => {}}
      />,
    );
    fireEvent.change(screen.getByRole("slider", { name: "字号" }), {
      target: { value: "22" },
    });
    expect(props.onUpdateSettings).toHaveBeenCalledWith({ fontSize: 22 });
  });

  it("受控时点 Tab 触发 onTabChange", () => {
    const onTabChange = vi.fn();
    render(
      <SettingsPanel
        {...makeProps()}
        activeTab="theme"
        onTabChange={onTabChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "排版" }));
    expect(onTabChange).toHaveBeenCalledWith("typography");
  });
});
