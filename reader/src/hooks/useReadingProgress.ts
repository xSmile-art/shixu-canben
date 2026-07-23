import { useState, useCallback } from "react";
import { readStorage, writeStorage } from "@lib/storage";

export const PROGRESS_KEY = "sxcb-progress";

export interface Progress {
  num: number | null;
  scrollTop: number;
}

const DEFAULT_PROGRESS: Progress = { num: null, scrollTop: 0 };

// 读写阅读位置（章号 + 滚动位置），持久化到 localStorage
export function useReadingProgress() {
  const [state, setState] = useState<Progress>(() =>
    readStorage(PROGRESS_KEY, DEFAULT_PROGRESS),
  );

  const save = useCallback((num: number | null, scrollTop: number) => {
    const next: Progress = { num, scrollTop };
    writeStorage(PROGRESS_KEY, next);
    setState(next);
  }, []);

  return { ...state, save };
}
