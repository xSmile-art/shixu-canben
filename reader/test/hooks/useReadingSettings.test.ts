import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReadingSettings, SETTINGS_KEY } from '@hooks/useReadingSettings'
import { DEFAULT_SETTINGS } from '@app-types/settings'

describe('useReadingSettings', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('style')
  })

  it('无记录时返回默认设置', () => {
    const { result } = renderHook(() => useReadingSettings())
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('update 单项更新并持久化', () => {
    const { result } = renderHook(() => useReadingSettings())
    act(() => result.current.update({ fontSize: 22 }))
    expect(result.current.settings.fontSize).toBe(22)
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)!)
    expect(saved.fontSize).toBe(22)
    expect(saved.lineHeight).toBe(DEFAULT_SETTINGS.lineHeight)
  })

  it('update 同时写入 --reader-* CSS 变量', () => {
    const { result } = renderHook(() => useReadingSettings())
    act(() => result.current.update({ paragraphSpacing: 1.5, fontSize: 20 }))
    const style = document.documentElement.style
    expect(style.getPropertyValue('--reader-paragraph-spacing')).toBe('1.5em')
    expect(style.getPropertyValue('--reader-font-size')).toBe('20px')
  })

  it('paragraphIndent=false 时 --reader-paragraph-indent 写 0', () => {
    const { result } = renderHook(() => useReadingSettings())
    act(() => result.current.update({ paragraphIndent: false }))
    expect(document.documentElement.style.getPropertyValue('--reader-paragraph-indent')).toBe('0')
  })

  it('reset 恢复默认并写回', () => {
    const { result } = renderHook(() => useReadingSettings())
    act(() => result.current.update({ fontSize: 24 }))
    act(() => result.current.reset())
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('刷新后恢复持久化设置', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, brightness: 0.6 }))
    const { result } = renderHook(() => useReadingSettings())
    expect(result.current.settings.brightness).toBe(0.6)
  })
})
