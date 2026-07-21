import { useEffect, useState, useCallback } from 'react'
import { buildIndexUrl } from '../lib/raw.js'

// 拉取章节索引。status: 'loading' | 'success' | 'error'
export function useChapters() {
  const [chapters, setChapters] = useState([])
  const [status, setStatus] = useState('loading')
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const res = await fetch(buildIndexUrl())
      if (!res.ok) throw new Error(`索引加载失败 (HTTP ${res.status})`)
      const data = await res.json()
      setChapters(Array.isArray(data) ? data : [])
      setStatus('success')
    } catch (e) {
      setError(e.message || '未知错误')
      setStatus('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const retry = useCallback(() => { load() }, [load])
  return { chapters, status, error, retry }
}
