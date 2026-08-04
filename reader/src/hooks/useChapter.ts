import { useEffect, useState } from "react";
import { buildChapterUrl } from "@lib/raw";
import { renderMarkdown } from "@lib/markdown";
import type { Chapter, LoadStatus } from "@app-types/chapter";

// 模块级缓存：章号 -> HTML。同章多次挂载只 fetch 一次。
const CACHE_LIMIT = 8;
const cache = new Map<number, string>();

function cacheSet(num: number, html: string): void {
  cache.delete(num);
  cache.set(num, html);
  while (cache.size > CACHE_LIMIT) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    cache.delete(oldest);
  }
}

async function loadChapterHtml(chapter: Chapter, signal?: AbortSignal) {
  const cached = cache.get(chapter.num);
  if (cached != null) {
    cache.delete(chapter.num);
    cache.set(chapter.num, cached);
    return cached;
  }
  const res = await fetch(buildChapterUrl(chapter), { signal });
  if (!res.ok) throw new Error(`章节加载失败 (HTTP ${res.status})`);
  const out = await renderMarkdown(await res.text());
  cacheSet(chapter.num, out);
  return out;
}

export function prefetchChapter(chapter: Chapter | null): void {
  if (!chapter || cache.has(chapter.num)) return;
  void loadChapterHtml(chapter).catch(() => {});
}

// 测试用：清空缓存
export function __resetChapterCache(): void {
  cache.clear();
}

// 加载单章。chapter 为 null 时不发请求
export function useChapter(chapter: Chapter | null) {
  const num = chapter?.num;
  const [html, setHtml] = useState<string>(() =>
    num && cache.has(num) ? cache.get(num)! : "",
  );
  const [status, setStatus] = useState<LoadStatus>(() =>
    num && cache.has(num) ? "success" : "loading",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!num) return;
    if (cache.has(num)) {
      setHtml(cache.get(num)!);
      setStatus("success");
      return;
    }
    const controller = new AbortController();
    setStatus("loading");
    setError(null);
    loadChapterHtml(chapter!, controller.signal)
      .then((out) => {
        setHtml(out);
        setStatus("success");
      })
      .catch((e) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "未知错误");
        setStatus("error");
      });
    return () => controller.abort();
  }, [num]); // eslint-disable-line react-hooks/exhaustive-deps

  return { html, status, error };
}
