import { describe, it, expect } from 'vitest'
import { PRESET_THEMES } from '@themes/presets'

const REQUIRED_KEYS = ['bg', 'fg', 'accent', 'muted', 'border', 'highlight'] as const

describe('PRESET_THEMES', () => {
  it('恰好 8 套预设', () => {
    expect(PRESET_THEMES).toHaveLength(8)
  })

  it('每套都有 name/label 且齐全 6 色', () => {
    for (const t of PRESET_THEMES) {
      expect(t.name).toBeTruthy()
      expect(t.label).toBeTruthy()
      for (const k of REQUIRED_KEYS) {
        expect(typeof t.colors[k]).toBe('string')
        expect(t.colors[k].length).toBeGreaterThan(0)
      }
    }
  })

  it('name 全局唯一', () => {
    const names = PRESET_THEMES.map(t => t.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
