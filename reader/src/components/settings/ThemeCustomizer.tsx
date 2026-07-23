import type { Theme, ThemeColors } from "@app-types/theme";
import { ColorPicker } from "@components/ui/ColorPicker";

interface ThemeCustomizerProps {
  theme: Theme;
  onChange: (key: keyof ThemeColors, value: string) => void;
  onBack: () => void;
}

const COLOR_FIELDS: { key: keyof ThemeColors; label: string }[] = [
  { key: "bg", label: "背景色" },
  { key: "fg", label: "文字色" },
  { key: "accent", label: "强调色" },
  { key: "muted", label: "次要文字" },
  { key: "border", label: "边框色" },
  { key: "highlight", label: "选中高亮" },
];

export function ThemeCustomizer({
  theme,
  onChange,
  onBack,
}: ThemeCustomizerProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-fg">我的主题</h3>
        <button onClick={onBack} className="text-sm text-muted hover:text-fg">
          返回
        </button>
      </div>
      {/* 预览条 */}
      <div
        className="rounded p-3 mb-4 text-sm border"
        style={{
          background: theme.colors.bg,
          color: theme.colors.fg,
          borderColor: theme.colors.border,
        }}
      >
        预览：<span style={{ color: theme.colors.accent }}>章节标题</span>{" "}
        与正文文字效果
      </div>
      {COLOR_FIELDS.map((f) => (
        <ColorPicker
          key={f.key}
          label={f.label}
          value={theme.colors[f.key]}
          onChange={(v) => onChange(f.key, v)}
        />
      ))}
      <p className="text-xs text-muted mt-2">修改任意颜色即保存为"我的主题"</p>
    </div>
  );
}
