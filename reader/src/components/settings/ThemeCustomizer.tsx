import type { Theme, ThemeColors } from '@app-types/theme'

interface ThemeCustomizerProps {
  theme: Theme
  onChange: (key: keyof ThemeColors, value: string) => void
  onBack: () => void
}

export function ThemeCustomizer(_props: ThemeCustomizerProps) {
  return <div>自定义主题（后续任务实现）</div>
}
