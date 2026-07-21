import { describe, it, expect, beforeEach } from 'vitest'
import { getTheme, setTheme, THEME_KEY } from '../../src/lib/theme.js'

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('无记录时默认 light', () => {
    expect(getTheme()).toBe('light')
  })
  it('setTheme 后 getTheme 能读回', () => {
    setTheme('dark')
    expect(getTheme()).toBe('dark')
  })
  it('setTheme 写入 localStorage 的 key 为 THEME_KEY', () => {
    setTheme('dark')
    expect(localStorage.getItem(THEME_KEY)).toBe('dark')
  })
})
