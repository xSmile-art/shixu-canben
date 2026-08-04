export type TapZone = "prev" | "menu" | "next";

/**
 * 番茄小说式三段点按分区。
 * @param xRatio 触点相对容器宽度的比例（0..1）
 * 左 1/3 → prev（上一页），中 1/3 → menu（呼出菜单），右 1/3 → next（下一页）。
 */
export function zoneOf(xRatio: number): TapZone {
  const r = Math.min(Math.max(xRatio, 0), 1);
  if (r < 1 / 3) return "prev";
  if (r < 2 / 3) return "menu";
  return "next";
}
