import { describe, it, expect } from "vitest";
import { splitIntoPages, splitIntoPagesByLine } from "@lib/paginate";

describe("splitIntoPages", () => {
  const heights = [100, 200, 100, 300, 100];

  it("按页高累计切分，块顺序不变", () => {
    const pages = splitIntoPages(heights, 300);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.flat()).toEqual([0, 1, 2, 3, 4]);
  });

  it("单个块超高时独占一页", () => {
    expect(splitIntoPages([500, 100], 300)).toEqual([[0], [1]]);
  });

  it("空数组返回空", () => {
    expect(splitIntoPages([], 300)).toEqual([]);
  });
});

describe("splitIntoPagesByLine 行级分页", () => {
  const B = (lineHeights: number[]) => ({
    lineHeights,
    totalHeight: lineHeights.reduce((a, b) => a + b, 0),
  });

  it("短块直接整块分页（同 splitIntoPages）", () => {
    const pages = splitIntoPagesByLine([B([50, 50]), B([120])], 200);
    // 块0 高 100，块1 高 120：100+120>200 → 块1 换页
    expect(pages).toEqual([
      [{ kind: "block", index: 0 }],
      [{ kind: "block", index: 1 }],
    ]);
  });

  it("放不下的段落从行中间切开填满当前页", () => {
    // 页高 100；块0 一行 60，块1 三行各 30（总 90）
    // 块0 占 60 → 剩 40；块1 第 1 行(30) 能放，第 2 行放不下 → 切 [0,1) 填当前页，剩 [1,3) 下一页
    const pages = splitIntoPagesByLine([B([60]), B([30, 30, 30])], 100);
    expect(pages).toEqual([
      [
        { kind: "block", index: 0 },
        { kind: "slice", index: 1, fromLine: 0, toLine: 1 },
      ],
      [{ kind: "slice", index: 1, fromLine: 1, toLine: 3 }],
    ]);
  });

  it("单块超过一页时跨多页连续切片", () => {
    const pages = splitIntoPagesByLine([B([40, 40, 40, 40, 40])], 100);
    // 每页放 2 行（80）：[0,2) [2,4) [4,5)
    expect(pages).toEqual([
      [{ kind: "slice", index: 0, fromLine: 0, toLine: 2 }],
      [{ kind: "slice", index: 0, fromLine: 2, toLine: 4 }],
      [{ kind: "slice", index: 0, fromLine: 4, toLine: 5 }],
    ]);
  });

  it("当前页一行也放不下时换页", () => {
    // 块0 高 95，块1 一行 30：95+30>100 → 换页整块放块1
    const pages = splitIntoPagesByLine([B([95]), B([30])], 100);
    expect(pages).toEqual([
      [{ kind: "block", index: 0 }],
      [{ kind: "block", index: 1 }],
    ]);
  });

  it("空输入返回空", () => {
    expect(splitIntoPagesByLine([], 100)).toEqual([]);
  });
});
