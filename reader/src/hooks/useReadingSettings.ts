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

// 从 localStorage 读出的值做类型/范围校验，非法字段回退默认，避免非法 CSS 值。
const RANGES = {
  fontSize: [14, 24],
  lineHeight: [1.5, 2.5],
  letterSpacing: [0, 4],
  paragraphSpacing: [0.5, 2],
  contentWidth: [600, 900],
  brightness: [0.3, 1.0]
} as const

function clamp(v: unknown, [min, max]: readonly [number, number], fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(Math.max(v, min), max) : fallback
}

function sanitizeSettings(raw: unknown): ReadingSettings {
  const o = (raw && typeof raw === 'object' ? raw : {}) as Partial<ReadingSettings>
  const d = DEFAULT_SETTINGS
  return {
    fontFamily: o.fontFamily === 'serif' || o.fontFamily === 'sans' || o.fontFamily === 'kai' ? o.fontFamily : d.fontFamily,
    fontSize: clamp(o.fontSize, RANGES.fontSize, d.fontSize),
    lineHeight: clamp(o.lineHeight, RANGES.lineHeight, d.lineHeight),
    letterSpacing: clamp(o.letterSpacing, RANGES.letterSpacing, d.letterSpacing),
    paragraphSpacing: clamp(o.paragraphSpacing, RANGES.paragraphSpacing, d.paragraphSpacing),
    paragraphIndent: typeof o.paragraphIndent === 'boolean' ? o.paragraphIndent : d.paragraphIndent,
    contentWidth: clamp(o.contentWidth, RANGES.contentWidth, d.contentWidth),
    pageMode: o.pageMode === 'scroll' || o.pageMode === 'horizontal' || o.pageMode === 'vertical' ? o.pageMode : d.pageMode,
    brightness: clamp(o.brightness, RANGES.brightness, d.brightness)
  }
}

export function useReadingSettings() {
  const [settings, setSettings] = useState<ReadingSettings>(() =>
    sanitizeSettings(readStorage<unknown>(SETTINGS_KEY, DEFAULT_SETTINGS))
  )

  // 副作用跟随 state：settings 变化时持久化 + 写 CSS 变量
  useEffect(() => {
    writeStorage(SETTINGS_KEY, settings)
    applyReadingSettings(settings)
  }, [settings])

  const update = useCallback((patch: Partial<ReadingSettings>) => {
    setSettings(prev => ({ ...prev, ...patch }))
  }, [])

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
  }, [])

  return { settings, update, reset }
}
