import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useReadingProgress,
  PROGRESS_KEY,
  migrateProgress,
} from "@hooks/useReadingProgress";

describe("useReadingProgress", () => {
  beforeEach(() => localStorage.clear());

  it("默认无进度", () => {
    const { result } = renderHook(() => useReadingProgress());
    expect(result.current.currentChapter).toBeNull();
    expect(result.current.currentPosition).toMatchObject({
      scrollOffset: 0,
      pageIndex: 0,
    });
  });

  it("分别保存同一章节的滚动位置和页码", () => {
    const { result } = renderHook(() => useReadingProgress());
    act(() => result.current.saveScroll(3, 120));
    act(() => result.current.savePage(3, 4));
    expect(result.current.currentChapter).toBe(3);
    expect(result.current.getPosition(3)).toMatchObject({
      scrollOffset: 120,
      pageIndex: 4,
    });
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEY)!)).toMatchObject({
      version: 2,
      currentChapter: 3,
    });
  });

  it("不同章节的位置互不覆盖", () => {
    const { result } = renderHook(() => useReadingProgress());
    act(() => result.current.saveScroll(3, 120));
    act(() => result.current.savePage(4, 2));
    expect(result.current.getPosition(3).scrollOffset).toBe(120);
    expect(result.current.getPosition(4).pageIndex).toBe(2);
  });

  it("迁移旧版 num/scrollTop 数据", () => {
    vi.spyOn(Date, "now").mockReturnValue(123);
    expect(migrateProgress({ num: 5, scrollTop: 88 })).toEqual({
      version: 2,
      currentChapter: 5,
      chapters: {
        "5": { scrollOffset: 88, pageIndex: 0, updatedAt: 123 },
      },
    });
    vi.restoreAllMocks();
  });
});
