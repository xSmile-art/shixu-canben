// 把一组块高按页高贪心切分，返回每页包含的块下标数组。
// 单个块超过页高时独占一页（不拆分）。
export function splitIntoPages(
  blockHeights: number[],
  pageHeight: number,
): number[][] {
  if (blockHeights.length === 0) return [];
  const pages: number[][] = [];
  let current: number[] = [];
  let used = 0;
  blockHeights.forEach((h, i) => {
    if (h >= pageHeight) {
      if (current.length) {
        pages.push(current);
        current = [];
        used = 0;
      }
      pages.push([i]);
      return;
    }
    if (used + h > pageHeight && current.length) {
      pages.push(current);
      current = [];
      used = 0;
    }
    current.push(i);
    used += h;
  });
  if (current.length) pages.push(current);
  return pages;
}

// =====================================================================
// 行级分页（番茄小说式）：把放不下的段落从行中间切开，尽量填满每页
// =====================================================================

export type PageItem =
  | { kind: "block"; index: number }
  | { kind: "slice"; index: number; fromLine: number; toLine: number };

export interface LineBlock {
  /** 每行的实际高度 */
  lineHeights: number[];
  /** 块总高（含 margin，用于整块判断） */
  totalHeight: number;
}

/**
 * 行级分页。返回每页的 PageItem 列表：
 * - block：整块渲染
 * - slice：渲染该块的 [fromLine, toLine) 行（fromLine 含，toLine 不含）
 *
 * 与 splitIntoPages 的区别：放不下的段落会被切开填满当前页，减少页底空白。
 */
export function splitIntoPagesByLine(
  blocks: LineBlock[],
  pageHeight: number,
): PageItem[][] {
  if (blocks.length === 0) return [];
  const pages: PageItem[][] = [];
  let current: PageItem[] = [];
  let used = 0;

  const flush = () => {
    if (current.length) {
      pages.push(current);
      current = [];
      used = 0;
    }
  };

  // 把 lines[lineStart..] 按页高连续切片，追加到 pages/current
  const sliceIntoPages = (index: number, lines: number[], lineStart: number) => {
    let i = lineStart;
    while (i < lines.length) {
      let end = i;
      let h = 0;
      while (end < lines.length && used + h + lines[end] <= pageHeight) {
        h += lines[end];
        end++;
      }
      if (end === i) {
        // 当前页 1 行也放不下 → 换页重试
        flush();
        continue;
      }
      current.push({ kind: "slice", index, fromLine: i, toLine: end });
      used += h;
      i = end;
      // 注意：这里不 flush()，继续累加后续行到同一页，直到放不下为止
    }
  };

  blocks.forEach((block, index) => {
    const { lineHeights, totalHeight } = block;

    // 1) 整块能放进当前页
    if (used + totalHeight <= pageHeight) {
      current.push({ kind: "block", index });
      used += totalHeight;
      return;
    }

    // 2) 当前页已有内容：尽量切一段填满当前页，再续到后面页
    if (used > 0) {
      let end = 0;
      let h = 0;
      while (end < lineHeights.length && used + h + lineHeights[end] <= pageHeight) {
        h += lineHeights[end];
        end++;
      }
      if (end > 0) {
        current.push({ kind: "slice", index, fromLine: 0, toLine: end });
        used += h;
        if (end < lineHeights.length) {
          // 还有剩余行 → 换页续切
          flush();
          sliceIntoPages(index, lineHeights, end);
        }
        return;
      }
      // 一行也放不下 → 换页，从整块继续
      flush();
    }

    // 3) 当前页是空的：整块放得下就直接放，否则逐行切片
    if (totalHeight <= pageHeight) {
      current.push({ kind: "block", index });
      used += totalHeight;
      return;
    }
    sliceIntoPages(index, lineHeights, 0);
  });

  flush();
  return pages;
}
