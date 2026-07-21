import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReadingProgress } from '../../src/hooks/useReadingProgress.js'
import { PROGRESS_KEY } from '../../src/hooks/useReadingProgress.js'

describe('useReadingProgress', () => {
  beforeEach(() => { localStorage.clear() })

  it('无记录时返回 null 章号', () => {
    const { result } = renderHook(() => useReadingProgress())
    expect(result.current.num).toBeNull()
  })

  it('save 后能读回章号与滚动位置', () => {
    const { result } = renderHook(() => useReadingProgress())
    act(() => result.current.save('021', 1234))
    expect(result.current.num).toBe('021')
    expect(result.current.scrollTop).toBe(1234)
  })

  it('持久化到 localStorage 的 key 为 PROGRESS_KEY', () => {
    const { result } = renderHook(() => useReadingProgress())
    act(() => result.current.save('005', 100))
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEY))).toEqual({ num: '005', scrollTop: 100 })
  })
})
