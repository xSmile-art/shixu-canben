import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useChapters } from '@hooks/useChapters'

const mockIndex = [{ num: 1, title: '开始' }, { num: 2, title: '雨夜' }]

describe('useChapters', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => mockIndex })))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('加载成功后返回章节数组', async () => {
    const { result } = renderHook(() => useChapters())
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.chapters).toEqual(mockIndex)
  })

  it('HTTP 错误时进入 error 态', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })))
    const { result } = renderHook(() => useChapters())
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toContain('404')
  })
})
