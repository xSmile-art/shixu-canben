import { useState, useCallback, useMemo } from "react";
import { readStorage, writeStorage } from "@lib/storage";

export const PROGRESS_KEY = "sxcb-progress";

export interface ChapterProgress {
  scrollOffset: number;
  pageIndex: number;
  updatedAt: number;
}

export interface ReadingProgressV2 {
  version: 2;
  currentChapter: number | null;
  chapters: Record<string, ChapterProgress>;
}

const EMPTY_CHAPTER_PROGRESS: ChapterProgress = {
  scrollOffset: 0,
  pageIndex: 0,
  updatedAt: 0,
};

const DEFAULT_PROGRESS: ReadingProgressV2 = {
  version: 2,
  currentChapter: null,
  chapters: {},
};

function finiteNonNegative(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

export function migrateProgress(raw: unknown): ReadingProgressV2 {
  if (!raw || typeof raw !== "object") return DEFAULT_PROGRESS;
  const value = raw as Record<string, unknown>;

  if (value.version === 2) {
    const currentChapter =
      typeof value.currentChapter === "number" && value.currentChapter > 0
        ? value.currentChapter
        : null;
    const chapters: Record<string, ChapterProgress> = {};
    if (value.chapters && typeof value.chapters === "object") {
      for (const [key, entry] of Object.entries(
        value.chapters as Record<string, unknown>,
      )) {
        if (!entry || typeof entry !== "object") continue;
        const item = entry as Record<string, unknown>;
        chapters[key] = {
          scrollOffset: finiteNonNegative(item.scrollOffset),
          pageIndex: finiteNonNegative(item.pageIndex),
          updatedAt: finiteNonNegative(item.updatedAt),
        };
      }
    }
    return { version: 2, currentChapter, chapters };
  }

  // v1: { num, scrollTop }。旧值只可能可靠地解释为滚动像素。
  const num =
    typeof value.num === "number" && value.num > 0 ? value.num : null;
  const scrollOffset = finiteNonNegative(value.scrollTop);
  return {
    version: 2,
    currentChapter: num,
    chapters: num
      ? {
          [String(num)]: {
            scrollOffset,
            pageIndex: 0,
            updatedAt: Date.now(),
          },
        }
      : {},
  };
}

export function useReadingProgress() {
  const [state, setState] = useState<ReadingProgressV2>(() =>
    migrateProgress(readStorage<unknown>(PROGRESS_KEY, DEFAULT_PROGRESS)),
  );

  const commit = useCallback(
    (updater: (prev: ReadingProgressV2) => ReadingProgressV2) => {
      setState((prev) => {
        const next = updater(prev);
        writeStorage(PROGRESS_KEY, next);
        return next;
      });
    },
    [],
  );

  const setCurrentChapter = useCallback(
    (num: number | null) =>
      commit((prev) => ({ ...prev, currentChapter: num })),
    [commit],
  );

  const savePosition = useCallback(
    (num: number, patch: Partial<Pick<ChapterProgress, "scrollOffset" | "pageIndex">>) =>
      commit((prev) => ({
        ...prev,
        currentChapter: num,
        chapters: {
          ...prev.chapters,
          [String(num)]: {
            ...(prev.chapters[String(num)] ?? EMPTY_CHAPTER_PROGRESS),
            ...patch,
            updatedAt: Date.now(),
          },
        },
      })),
    [commit],
  );

  const getPosition = useCallback(
    (num: number | null): ChapterProgress =>
      num ? state.chapters[String(num)] ?? EMPTY_CHAPTER_PROGRESS : EMPTY_CHAPTER_PROGRESS,
    [state.chapters],
  );

  const currentPosition = useMemo(
    () => getPosition(state.currentChapter),
    [getPosition, state.currentChapter],
  );

  const saveScroll = useCallback(
    (num: number, scrollOffset: number) => savePosition(num, { scrollOffset }),
    [savePosition],
  );
  const savePage = useCallback(
    (num: number, pageIndex: number) => savePosition(num, { pageIndex }),
    [savePosition],
  );

  return {
    currentChapter: state.currentChapter,
    currentPosition,
    getPosition,
    setCurrentChapter,
    saveScroll,
    savePage,
  };
}
