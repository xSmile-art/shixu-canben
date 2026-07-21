import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { useChapters } from '../../src/hooks/useChapters.js'
import { buildIndexUrl } from '../../src/lib/raw.js'

const SAMPLE_INDEX = [
  { num: '001', title: '草稿层' },
  { num: '002', title: '十秒' }
]

describe('useChapters', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('初始 status 为 loading，fetch 成功后 status=success 且 chapters 填充', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({
      ok: true,
      json: () => Promise.resolve(SAMPLE_INDEX)
    }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useChapters())
    expect(result.current.status).toBe('loading')

    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.chapters).toEqual(SAMPLE_INDEX)
    expect(result.current.error).toBeNull()
    expect(fetchMock).toHaveBeenCalledWith(buildIndexUrl())
  })

  it('fetch 失败时 status=error 且带 error 信息，retry 可重试', async () => {
    const fetchMock = vi.fn(() => Promise.resolve({ ok: false, status: 404 }))
    vi.stubGlobal('fetch', fetchMock)

    const { result } = renderHook(() => useChapters())
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toBeTruthy()
    expect(result.current.chapters).toEqual([])

    // 第二次让它成功
    fetchMock.mockImplementation(() => Promise.resolve({
      ok: true, json: () => Promise.resolve(SAMPLE_INDEX)
    }))
    act(() => { result.current.retry() })
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.chapters).toEqual(SAMPLE_INDEX)
  })
})
