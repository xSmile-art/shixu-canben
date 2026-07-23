import type { ReadingSettings, FontFamily } from "@app-types/settings";
import { Slider } from "@components/ui/Slider";

interface TypographyTabProps {
  settings: ReadingSettings;
  onUpdate: (patch: Partial<ReadingSettings>) => void;
}

const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: "serif", label: "衬线" },
  { value: "sans", label: "无衬线" },
  { value: "kai", label: "楷体" },
];

export function TypographyTab({ settings, onUpdate }: TypographyTabProps) {
  return (
    <div>
      <div className="mb-4">
        <span className="block text-sm text-fg mb-2">字体</span>
        <div className="flex gap-2">
          {FONT_OPTIONS.map((o) => (
            <button
              key={o.value}
              onClick={() => onUpdate({ fontFamily: o.value })}
              className={`flex-1 py-1.5 rounded border text-sm transition-colors ${
                settings.fontFamily === o.value
                  ? "border-accent text-accent"
                  : "border-border text-muted hover:text-fg"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <Slider
        label="字号"
        min={14}
        max={24}
        step={1}
        value={settings.fontSize}
        onChange={(v) => onUpdate({ fontSize: v })}
        formatValue={(v) => `${v}px`}
      />
      <Slider
        label="行距"
        min={1.5}
        max={2.5}
        step={0.1}
        value={settings.lineHeight}
        onChange={(v) => onUpdate({ lineHeight: v })}
        formatValue={(v) => v.toFixed(1)}
      />
      <Slider
        label="字间距"
        min={0}
        max={4}
        step={0.5}
        value={settings.letterSpacing}
        onChange={(v) => onUpdate({ letterSpacing: v })}
        formatValue={(v) => `${v}px`}
      />
    </div>
  );
}
