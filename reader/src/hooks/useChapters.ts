import { useEffect, useState, useCallback } from "react";
import { buildIndexUrl } from "@lib/raw";
import type { ChapterIndex, LoadStatus } from "@app-types/chapter";

// 拉取章节索引。status: 'loading' | 'success' | 'error'
export function useChapters() {
  const [chapters, setChapters] = useState<ChapterIndex>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setStatus("loading");
    setError(null);
    try {
      const res = await fetch(buildIndexUrl(), { signal });
      if (!res.ok) throw new Error(`索引加载失败 (HTTP ${res.status})`);
      const data: unknown = await res.json();
      const normalized = Array.isArray(data)
        ? data.flatMap((item) => {
            if (!item || typeof item !== "object") return [];
            const value = item as { num?: unknown; title?: unknown };
            const num = Number(value.num);
            return Number.isInteger(num) && num > 0 && typeof value.title === "string"
              ? [{ num, title: value.title }]
              : [];
          })
        : [];
      setChapters(normalized);
      setStatus("success");
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "未知错误");
      setStatus("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  const retry = useCallback(() => {
    void load();
  }, [load]);
  return { chapters, status, error, retry };
}
