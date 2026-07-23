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
