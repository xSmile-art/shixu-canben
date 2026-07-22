import { useState, useCallback, useEffect } from 'react'
import type { Theme, ThemeColors } from '@app-types/theme'
import { applyTheme, loadTheme, saveTheme } from '@themes/index'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => loadTheme())

  useEffect(() => { applyTheme(theme) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    saveTheme(t)
    applyTheme(t)
  }, [])

  const customizeColor = useCallback((key: keyof ThemeColors, value: string) => {
    setThemeState(prev => {
      const custom: Theme = {
        ...prev,
        name: 'custom',
        label: '我的主题',
        colors: { ...prev.colors, [key]: value },
        isCustom: true
      }
      saveTheme(custom)
      applyTheme(custom)
      return custom
    })
  }, [])

  return { theme, setTheme, customizeColor }
}
