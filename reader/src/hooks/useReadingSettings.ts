import { useState, useCallback, useEffect } from 'react'
import type { ReadingSettings } from '@app-types/settings'
import { DEFAULT_SETTINGS } from '@app-types/settings'
import { readStorage, writeStorage } from '@lib/storage'

export const SETTINGS_KEY = 'sxcb-settings'

// 把阅读设置写到 <html> 的 --reader-* CSS 变量，驱动 index.css 里 .chapter-body 的
// 字号/行距/字间距/段间距/首行缩进/页宽。缺了这步，段间距与缩进设置不生效。
export function applyReadingSettings(s: ReadingSettings): void {
  const root = document.documentElement
  root.style.setProperty('--reader-font-size', `${s.fontSize}px`)
  root.style.setProperty('--reader-line-height', String(s.lineHeight))
  root.style.setProperty('--reader-letter-spacing', `${s.letterSpacing}px`)
  root.style.setProperty('--reader-content-width', `${s.contentWidth}px`)
  root.style.setProperty('--reader-paragraph-spacing', `${s.paragraphSpacing}em`)
  root.style.setProperty('--reader-paragraph-indent', s.paragraphIndent ? '2em' : '0')
}

export function useReadingSettings() {
  const [settings, setSettings] = useState<ReadingSettings>(() =>
    readStorage<ReadingSettings>(SETTINGS_KEY, DEFAULT_SETTINGS)
  )

  useEffect(() => { applyReadingSettings(settings) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback((patch: Partial<ReadingSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      writeStorage(SETTINGS_KEY, next)
      applyReadingSettings(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    writeStorage(SETTINGS_KEY, DEFAULT_SETTINGS)
    applyReadingSettings(DEFAULT_SETTINGS)
  }, [])

  return { settings, update, reset }
}
