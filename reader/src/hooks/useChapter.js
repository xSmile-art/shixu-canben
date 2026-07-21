import { useEffect, useState } from 'react'
import { buildChapterUrl } from '../lib/raw.js'
import { renderMarkdown } from '../lib/markdown.js'

// 模块级缓存：章号 -> HTML。同章多次挂载只 fetch 一次。
const cache = new Map()

// 测试用：清空缓存
export function __resetChapterCache() {
  cache.clear()
}

// 加载单章。chapter: { num, title } | null
export function useChapter(chapter) {
  const num = chapter?.num
  const [html, setHtml] = useState(() => (num && cache.has(num)) ? cache.get(num) : '')
  const [status, setStatus] = useState(() => (num && cache.has(num)) ? 'success' : 'loading')
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!num) return
    if (cache.has(num)) {
      setHtml(cache.get(num))
      setStatus('success')
      return
    }
    let cancelled = false
    setStatus('loading')
    setError(null)
    fetch(buildChapterUrl(chapter))
      .then(res => {
        if (!res.ok) throw new Error(`章节加载失败 (HTTP ${res.status})`)
        return res.text()
      })
      .then(md => {
        const out = renderMarkdown(md)
        cache.set(num, out)
        if (!cancelled) { setHtml(out); setStatus('success') }
      })
      .catch(e => {
        if (!cancelled) { setError(e.message || '未知错误'); setStatus('error') }
      })
    return () => { cancelled = true }
  }, [num]) // eslint-disable-line react-hooks/exhaustive-deps

  return { html, status, error }
}
