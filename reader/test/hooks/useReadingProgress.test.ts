import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReadingProgress, PROGRESS_KEY } from '@hooks/useReadingProgress'

describe('useReadingProgress', () => {
  beforeEach(() => localStorage.clear())

  it('默认无进度', () => {
    const { result } = renderHook(() => useReadingProgress())
    expect(result.current.num).toBeNull()
    expect(result.current.scrollTop).toBe(0)
  })

  it('save 写入并持久化', () => {
    const { result } = renderHook(() => useReadingProgress())
    act(() => result.current.save(3, 120))
    expect(result.current.num).toBe(3)
    expect(result.current.scrollTop).toBe(120)
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEY)!)).toEqual({ num: 3, scrollTop: 120 })
  })

  it('刷新后恢复进度', () => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ num: 5, scrollTop: 88 }))
    const { result } = renderHook(() => useReadingProgress())
    expect(result.current.num).toBe(5)
    expect(result.current.scrollTop).toBe(88)
  })
})
