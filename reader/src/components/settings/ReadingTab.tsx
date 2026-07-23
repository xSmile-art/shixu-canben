import type { ReadingSettings, PageMode, FlipStyle } from "@app-types/settings";
import { Slider } from "@components/ui/Slider";

interface ReadingTabProps {
  settings: ReadingSettings;
  onUpdate: (patch: Partial<ReadingSettings>) => void;
}

const PAGE_MODE_OPTIONS: { value: PageMode; label: string }[] = [
  { value: "scroll", label: "滚动" },
  { value: "paged", label: "翻页" },
];

const FLIP_STYLE_OPTIONS: { value: FlipStyle; label: string }[] = [
  { value: "simulate", label: "仿真" },
  { value: "cover", label: "覆盖" },
  { value: "slide", label: "平移" },
  { value: "vertical", label: "上下" },
  { value: "none", label: "无" },
];

export function ReadingTab({ settings, onUpdate }: ReadingTabProps) {
  return (
    <div>
      {/* 阅读模式：滚动 / 翻页 */}
      <div className="mb-4">
        <span className="block text-sm text-fg mb-2">阅读模式</span>
        <div className="flex gap-2">
          {PAGE_MODE_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => onUpdate({ pageMode: o.value })}
              className={`flex-1 py-1.5 rounded border text-sm transition-colors ${
                settings.pageMode === o.value
                  ? "border-accent text-accent"
                  : "border-border text-muted hover:text-fg"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* 翻页动画样式（仅翻页模式可见） */}
      {settings.pageMode === "paged" && (
        <div className="mb-4">
          <span className="block text-sm text-fg mb-2">翻页动画</span>
          <div className="flex gap-2">
            {FLIP_STYLE_OPTIONS.map((o) => (
              <button
                key={o.value}
                onClick={() => onUpdate({ flipStyle: o.value })}
                className={`flex-1 py-1.5 rounded border text-sm transition-colors ${
                  settings.flipStyle === o.value
                    ? "border-accent text-accent"
                    : "border-border text-muted hover:text-fg"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      )}

      <Slider
        label="段间距"
        min={0.5}
        max={2}
        step={0.1}
        value={settings.paragraphSpacing}
        onChange={(v) => onUpdate({ paragraphSpacing: v })}
        formatValue={(v) => `${v.toFixed(1)}em`}
      />
      <Slider
        label="页宽"
        min={600}
        max={900}
        step={10}
        value={settings.contentWidth}
        onChange={(v) => onUpdate({ contentWidth: v })}
        formatValue={(v) => `${v}px`}
      />
      <Slider
        label="亮度"
        min={0.3}
        max={1}
        step={0.05}
        value={settings.brightness}
        onChange={(v) => onUpdate({ brightness: v })}
        formatValue={(v) => `${Math.round(v * 100)}%`}
      />
      <label className="flex items-center justify-between mt-2">
        <span className="text-sm text-fg">首行缩进</span>
        <input
          type="checkbox"
          checked={settings.paragraphIndent}
          onChange={(e) => onUpdate({ paragraphIndent: e.target.checked })}
          className="w-4 h-4 accent-accent"
        />
      </label>
    </div>
  );
}
