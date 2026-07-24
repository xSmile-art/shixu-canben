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
 * 与 splitIntoPages 的区别：
 * 1) 放不下的段落会从行中间切开填满当前页；
 * 2) 整块放不下的块也参与行级切片（而不是整块挤到下一页）。
 * 否则一旦剩余空间放不下一个整块，该块就会整体跳到下一页，
 * 当前页尾部留白原样保留——这正是"页底大块空白"的来源。
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
      // 本块行已切完即返回，让后续块继续填当前页剩余空间；
      // 只有"切到一半放不下"才在下一轮 while 里换页。
      if (i >= lines.length) return;
    }
  };

  blocks.forEach((block, index) => {
    const { lineHeights, totalHeight } = block;

    // 整块能放进当前页：直接整块
    if (used + totalHeight <= pageHeight) {
      current.push({ kind: "block", index });
      used += totalHeight;
      return;
    }

    // 整块放不下：从行中间切开，尽量填满当前页（含 used=0 的新页）。
    // 关键：不走"整块独占一页"回退，否则该块前面那页的尾部留白会原样保留。
    sliceIntoPages(index, lineHeights, 0);
  });

  flush();
  return pages;
}
