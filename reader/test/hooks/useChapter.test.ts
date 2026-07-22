import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useChapter, __resetChapterCache } from '@hooks/useChapter'

describe('useChapter', () => {
  beforeEach(() => {
    __resetChapterCache()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '# 正文' })))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('加载成功渲染 HTML 并缓存', async () => {
    const ch = { num: 1, title: '开始' }
    const { result } = renderHook(() => useChapter(ch))
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.html).toContain('<h1>')
    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length
    renderHook(() => useChapter(ch))
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls)
  })

  it('HTTP 错误进入 error 态', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, text: async () => '' })))
    const { result } = renderHook(() => useChapter({ num: 9, title: 'x' }))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toContain('500')
  })

  it('chapter 为 null 时不请求', () => {
    renderHook(() => useChapter(null))
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0)
  })
})
