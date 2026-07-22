import type { Theme } from '@app-types/theme'
import { PRESET_THEMES } from '@themes/presets'

interface ThemeTabProps {
  theme: Theme
  onSetTheme: (t: Theme) => void
  onOpenCustomizer: () => void
}

export function ThemeTab({ theme, onSetTheme, onOpenCustomizer }: ThemeTabProps) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {PRESET_THEMES.map(t => (
          <button
            key={t.name}
            onClick={() => onSetTheme(t)}
            className={`flex flex-col items-center gap-1 p-2 rounded border transition-colors ${
              theme.name === t.name ? 'border-accent' : 'border-border hover:border-muted'
            }`}
          >
            <span className="w-8 h-8 rounded-full border border-border" style={{ background: t.colors.bg }} />
            <span className="text-xs text-fg">{t.label}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onOpenCustomizer}
        className="w-full py-2 rounded border border-dashed border-muted text-sm text-muted hover:text-fg hover:border-fg transition-colors"
      >
        {theme.isCustom ? '编辑我的主题' : '自定义配色…'}
      </button>
    </div>
  )
}
