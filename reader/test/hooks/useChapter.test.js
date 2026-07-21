import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useChapter, __resetChapterCache } from '../../src/hooks/useChapter.js'

const CHAPTER = { num: '001', title: '草稿层' }
const MARKDOWN = '# 第一章 草稿层\n\n后半夜的跨海桥。'

describe('useChapter', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    __resetChapterCache()
  })

  it('初始 loading，成功后返回 HTML 并标记 success', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: true, text: () => Promise.resolve(MARKDOWN)
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useChapter(CHAPTER))
    expect(result.current.status).toBe('loading')
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.html).toContain('<h1>第一章 草稿层</h1>')
    expect(result.current.error).toBeNull()
  })

  it('同一章第二次挂载不再 fetch（命中缓存）', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: true, text: () => Promise.resolve(MARKDOWN)
    }))
    vi.stubGlobal('fetch', fetchMock)

    const r1 = renderHook(() => useChapter(CHAPTER))
    await waitFor(() => expect(r1.result.current.status).toBe('success'))
    r1.unmount()

    const r2 = renderHook(() => useChapter(CHAPTER))
    await waitFor(() => expect(r2.result.current.status).toBe('success'))

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('fetch 404 时 status=error', async () => {
    vi.stubGlobal('fetch', () => Promise.resolve({ ok: false, status: 404 }))
    const { result } = renderHook(() => useChapter(CHAPTER))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.html).toBe('')
  })
})
