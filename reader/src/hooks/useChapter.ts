import { useEffect, useState } from 'react'
import { buildChapterUrl } from '@lib/raw'
import { renderMarkdown } from '@lib/markdown'
import type { Chapter, LoadStatus } from '@app-types/chapter'

// 模块级缓存：章号 -> HTML。同章多次挂载只 fetch 一次。
const cache = new Map<number, string>()

// 测试用：清空缓存
export function __resetChapterCache(): void {
  cache.clear()
}

// 加载单章。chapter 为 null 时不发请求
export function useChapter(chapter: Chapter | null) {
  const num = chapter?.num
  const [html, setHtml] = useState<string>(() => (num && cache.has(num)) ? cache.get(num)! : '')
  const [status, setStatus] = useState<LoadStatus>(() => (num && cache.has(num)) ? 'success' : 'loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!num) return
    if (cache.has(num)) {
      setHtml(cache.get(num)!)
      setStatus('success')
      return
    }
    let cancelled = false
    setStatus('loading')
    setError(null)
    fetch(buildChapterUrl(chapter!))
      .then(res => {
        if (!res.ok) throw new Error(`章节加载失败 (HTTP ${res.status})`)
        return res.text()
      })
      .then(md => renderMarkdown(md))
      .then(out => {
        cache.set(num, out)
        if (!cancelled) { setHtml(out); setStatus('success') }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '未知错误')
          setStatus('error')
        }
      })
    return () => { cancelled = true }
  }, [num]) // eslint-disable-line react-hooks/exhaustive-deps

  return { html, status, error }
}
