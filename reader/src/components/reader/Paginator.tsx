import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { splitIntoPages } from "@lib/paginate";

interface PaginatorProps {
  html: string;
  mode: "horizontal" | "vertical";
  page: number; // 受控当前页（父组件记进度）
  onPageChange: (page: number, total: number) => void;
  className?: string;
  style?: CSSProperties;
}

// JS 分页：离屏渲染全文量出每个块高，按容器高切页，仅显示当前页的块。
export function Paginator({
  html,
  mode,
  page,
  onPageChange,
  className = "",
  style,
}: PaginatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[][]>([]);
  const blocks = useMemo(() => splitBlocks(html), [html]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const pageHeight = el.clientHeight;
      if (!pageHeight) return;
      const heights = blocks.map((b) => measureBlock(b, el));
      const idxPages = splitIntoPages(heights, pageHeight);
      setPages(idxPages.map((idxArr) => idxArr.map((i) => blocks[i])));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [blocks]);

  const total = pages.length;
  const safePage = Math.min(Math.max(page, 0), Math.max(total - 1, 0));

  useEffect(() => {
    if (total > 0) onPageChange(safePage, total);
  }, [safePage, total]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (delta: number) => {
    const next = Math.min(Math.max(safePage + delta, 0), total - 1);
    onPageChange(next, total);
  };

  return (
    <div className="relative h-full">
      <div
        ref={containerRef}
        className={`h-full overflow-hidden ${className}`}
        style={style}
      >
        <div
          dangerouslySetInnerHTML={{ __html: pages[safePage]?.join("") ?? "" }}
        />
      </div>
      {total > 1 && (
        <>
          {mode === "horizontal" ? (
            <>
              <button
                aria-label="上一页"
                onClick={() => go(-1)}
                disabled={safePage === 0}
                className="absolute left-0 top-0 h-full w-1/3 disabled:opacity-0"
              />
              <button
                aria-label="下一页"
                onClick={() => go(1)}
                disabled={safePage >= total - 1}
                className="absolute right-0 top-0 h-full w-1/3 disabled:opacity-0"
              />
            </>
          ) : (
            <>
              <button
                aria-label="上一页"
                onClick={() => go(-1)}
                disabled={safePage === 0}
                className="absolute left-0 top-0 w-full h-1/2 disabled:opacity-0"
              />
              <button
                aria-label="下一页"
                onClick={() => go(1)}
                disabled={safePage >= total - 1}
                className="absolute left-0 bottom-0 w-full h-1/2 disabled:opacity-0"
              />
            </>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted">
            {safePage + 1} / {total}
          </div>
        </>
      )}
    </div>
  );
}

// 把 HTML 拆成块数组。注意：只取块级子元素（doc.body.children），
// 假设 marked 输出的正文都被 <p>/<h*>/<ul> 等块标签包裹，元素间的裸文本会被忽略。
// 对本项目（marked 渲染的章节正文）该假设成立。
function splitBlocks(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.body.children).map((el) => el.outerHTML);
}

// 离屏测量单块高度
function measureBlock(blockHtml: string, container: HTMLElement): number {
  const ghost = document.createElement("div");
  ghost.style.cssText = `position:absolute;visibility:hidden;width:${container.clientWidth}px;`;
  ghost.innerHTML = blockHtml;
  container.appendChild(ghost);
  const h = ghost.offsetHeight;
  container.removeChild(ghost);
  return h;
}
