import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readStorage, writeStorage } from '@lib/storage'

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('键不存在时返回默认值', () => {
    expect(readStorage('nope', { a: 1 })).toEqual({ a: 1 })
  })

  it('写入后能读回', () => {
    writeStorage('k', { a: 2 })
    expect(readStorage('k', { a: 1 })).toEqual({ a: 2 })
  })

  it('JSON 损坏时返回默认值且不抛错', () => {
    localStorage.setItem('bad', '{not-json')
    expect(readStorage('bad', 'fallback')).toBe('fallback')
  })

  it('localStorage 抛错时返回默认值', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    expect(readStorage('x', 42)).toBe(42)
    spy.mockRestore()
  })
})
