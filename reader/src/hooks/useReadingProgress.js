import { useState, useCallback } from 'react'

export const PROGRESS_KEY = 'sxcb-progress'

function read() {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY)
    if (!raw) return { num: null, scrollTop: 0 }
    const o = JSON.parse(raw)
    return { num: o.num ?? null, scrollTop: o.scrollTop ?? 0 }
  } catch {
    return { num: null, scrollTop: 0 }
  }
}

// 读写阅读位置（章号 + 滚动位置），持久化到 localStorage
export function useReadingProgress() {
  const [state, setState] = useState(read)

  const save = useCallback((num, scrollTop) => {
    const next = { num, scrollTop }
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(next))
    setState(next)
  }, [])

  return { ...state, save }
}
