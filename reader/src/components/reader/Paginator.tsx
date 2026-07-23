import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
} from "react";
import type { FlipStyle } from "@app-types/settings";
import { splitIntoPages } from "@lib/paginate";

interface PaginatorProps {
  html: string;
  flipStyle: FlipStyle;
  page: number;
  onPageChange: (page: number, total: number) => void;
  className?: string;
  style?: CSSProperties;
}

type FlipDir = "next" | "prev" | null;

/**
 * JS 分页 + 五种翻页动画。
 *
 * | flipStyle  | 效果                                          |
 * |-----------|-----------------------------------------------|
 * | simulate  | 3D 仿真翻书：perspective + rotateY，两层结构    |
 * | cover     | 覆盖：新页从右侧滑入盖住旧页                     |
 * | slide     | 平移：新旧两页同时横向滑动                       |
 * | vertical  | 上下翻页：旧页向上滑出，新页从下滑入              |
 * | none      | 无动画：瞬间切换                                |
 */
export function Paginator({
  html,
  flipStyle,
  page,
  onPageChange,
  className = "",
  style,
}: PaginatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[][]>([]);
  const blocks = useMemo(() => splitBlocks(html), [html]);

  const [animating, setAnimating] = useState(false);
  const [flipDir, setFlipDir] = useState<FlipDir>(null);
  const [renderPage, setRenderPage] = useState(page);
  const [prevRenderPage, setPrevRenderPage] = useState<number | null>(null);
  const prevPageRef = useRef(page);

  // ---- 分页测量 ----
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

  // ---- 动画状态机 ----
  useEffect(() => {
    if (total === 0) return;
    const prev = prevPageRef.current;
    if (page !== prev && !animating) {
      const dir: FlipDir = page > prev ? "next" : "prev";
      setPrevRenderPage(prev);
      setRenderPage(page);
      setFlipDir(dir);
      setAnimating(true);
    }
    prevPageRef.current = page;
  }, [page, total, animating]);

  const onAnimationEnd = useCallback(() => {
    setAnimating(false);
    setFlipDir(null);
    setPrevRenderPage(null);
  }, []);

  const go = (delta: number) => {
    if (animating) return;
    const next = Math.min(Math.max(safePage + delta, 0), total - 1);
    if (next === safePage) return;
    const dir: FlipDir = delta > 0 ? "next" : "prev";
    setPrevRenderPage(safePage);
    setRenderPage(next);
    setFlipDir(dir);
    setAnimating(true);
    onPageChange(next, total);
  };

  // ---- 静态渲染（无动画 / 非动画时刻直接显示当前页） ----
  if (flipStyle === "none") {
    return (
      <div className="relative h-full">
        <div
          ref={containerRef}
          className={`h-full overflow-hidden ${className}`}
          style={{ ...style, position: "relative" }}
        >
          <div
            className="paginate-page-static"
            dangerouslySetInnerHTML={{
              __html: pages[safePage]?.join("") ?? "",
            }}
          />
        </div>
        {total > 1 && (
          <>
            <ClickAreas
              total={total}
              safePage={safePage}
              onPrev={() => go(-1)}
              onNext={() => go(1)}
            />
            <PageIndicator page={safePage} total={total} />
          </>
        )}
      </div>
    );
  }

  // ---- 动画 CSS（按样式不同） ----
  const isSimulate = flipStyle === "simulate";
  const isCover = flipStyle === "cover";
  const isSlide = flipStyle === "slide";
  const isVertical = flipStyle === "vertical";

  return (
    <div className="relative h-full">
      <style>{ANIMATION_CSS}</style>

      <div
        ref={containerRef}
        className={`h-full overflow-hidden ${className} ${
          isSimulate && animating ? "paginate-stage" : ""
        }`}
        style={{ ...style, position: "relative" }}
      >
        {/* ---- simulate：3D 翻书 ---- */}
        {isSimulate && (
          <SimulateFlip
            pages={pages}
            flipDir={flipDir}
            renderPage={renderPage}
            prevRenderPage={prevRenderPage}
            animating={animating}
            onAnimationEnd={onAnimationEnd}
          />
        )}

        {/* ---- cover：新页从右滑入覆盖 ---- */}
        {(isCover || isSlide || isVertical) && (
          <NormalFlip
            pages={pages}
            flipStyle={flipStyle}
            flipDir={flipDir}
            renderPage={renderPage}
            prevRenderPage={prevRenderPage}
            animating={animating}
            onAnimationEnd={onAnimationEnd}
          />
        )}

        {/* 静态兜底 */}
        {!animating && pages[safePage] && (
          <div
            className="paginate-page-static"
            dangerouslySetInnerHTML={{
              __html: pages[safePage].join(""),
            }}
          />
        )}
      </div>

      {total > 1 && (
        <>
          <ClickAreas
            total={total}
            safePage={safePage}
            animating={animating}
            onPrev={() => go(-1)}
            onNext={() => go(1)}
          />
          <PageIndicator page={safePage} total={total} />
        </>
      )}
    </div>
  );
}

// =====================================================================
// 子组件
// =====================================================================

/** 仿真翻书：两层结构 */
function SimulateFlip({
  pages,
  flipDir,
  renderPage,
  prevRenderPage,
  animating,
  onAnimationEnd,
}: {
  pages: string[][];
  flipDir: FlipDir;
  renderPage: number;
  prevRenderPage: number | null;
  animating: boolean;
  onAnimationEnd: () => void;
}) {
  const backPageSrc =
    flipDir === "next"
      ? pages[renderPage]
      : prevRenderPage != null
        ? pages[prevRenderPage]
        : null;
  const frontPageSrc =
    flipDir === "next"
      ? prevRenderPage != null
        ? pages[prevRenderPage]
        : null
      : pages[renderPage];

  return (
    <>
      {backPageSrc && (
        <div
          className="paginate-page paginate-page-back"
          dangerouslySetInnerHTML={{ __html: backPageSrc.join("") }}
        />
      )}
      {animating && <div className="paginate-spine-shadow" />}
      {frontPageSrc && (
        <div
          className={`paginate-page paginate-page-front ${
            flipDir === "next" ? "paginate-flip-next" : "paginate-flip-prev"
          }`}
          onAnimationEnd={onAnimationEnd}
          dangerouslySetInnerHTML={{ __html: frontPageSrc.join("") }}
        />
      )}
    </>
  );
}

/** cover / slide / vertical 共用：slide-out + slide-in 两层 */
function NormalFlip({
  pages,
  flipStyle,
  flipDir,
  renderPage,
  prevRenderPage,
  animating,
  onAnimationEnd,
}: {
  pages: string[][];
  flipStyle: "cover" | "slide" | "vertical";
  flipDir: FlipDir;
  renderPage: number;
  prevRenderPage: number | null;
  animating: boolean;
  onAnimationEnd: () => void;
}) {
  const isNext = flipDir === "next";

  const isCover = flipStyle === "cover";
  const isSlide = flipStyle === "slide";

  // 类名：旧页滑出方向
  let oldClass = "";
  let newClass = "";
  if (isSlide) {
    oldClass = isNext ? "paginate-slide-out-l" : "paginate-slide-out-r";
    newClass = isNext ? "paginate-slide-in-r" : "paginate-slide-in-l";
  } else if (!isCover) {
    // vertical
    oldClass = isNext ? "paginate-vert-out-u" : "paginate-vert-out-d";
    newClass = isNext ? "paginate-vert-in-d" : "paginate-vert-in-u";
  }
  // cover
  const coverClass = isNext ? "paginate-cover-in" : "paginate-cover-out";

  const oldSrc =
    prevRenderPage != null ? pages[prevRenderPage] : null;
  const newSrc = pages[renderPage];

  return (
    <>
      {/* 旧页 */}
      {animating && oldSrc && (
        <div
          className={`paginate-page-static ${
            isCover ? "" : oldClass
          } ${isCover ? "paginate-page-back" : ""}`}
          onAnimationEnd={isCover ? undefined : onAnimationEnd}
          dangerouslySetInnerHTML={{ __html: oldSrc.join("") }}
        />
      )}
      {/* 新页 */}
      {newSrc && (
        <div
          className={`paginate-page-static ${
            animating
              ? isCover
                ? coverClass
                : newClass
              : ""
          }`}
          onAnimationEnd={animating && isCover ? onAnimationEnd : undefined}
          dangerouslySetInnerHTML={{ __html: newSrc.join("") }}
        />
      )}
    </>
  );
}

function ClickAreas({
  total,
  safePage,
  animating,
  onPrev,
  onNext,
}: {
  total: number;
  safePage: number;
  animating?: boolean;
  onPrev: () => void;
  onNext: () => void;
}) {
  return (
    <>
      <button
        aria-label="上一页"
        onClick={onPrev}
        disabled={safePage === 0 || animating}
        className="absolute left-0 top-0 h-full w-1/3 disabled:opacity-0"
      />
      <button
        aria-label="下一页"
        onClick={onNext}
        disabled={safePage >= total - 1 || animating}
        className="absolute right-0 top-0 h-full w-1/3 disabled:opacity-0"
      />
    </>
  );
}

function PageIndicator({ page, total }: { page: number; total: number }) {
  return (
    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted">
      {page + 1} / {total}
    </div>
  );
}

// =====================================================================
// 工具函数
// =====================================================================

function splitBlocks(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, "text/html");
  return Array.from(doc.body.children).map((el) => el.outerHTML);
}

function measureBlock(blockHtml: string, container: HTMLElement): number {
  const ghost = document.createElement("div");
  ghost.style.cssText = `position:absolute;visibility:hidden;width:${container.clientWidth}px;`;
  ghost.innerHTML = blockHtml;
  container.appendChild(ghost);
  const h = ghost.offsetHeight;
  container.removeChild(ghost);
  return h;
}

// =====================================================================
// 动画 CSS（合在一起避免碎片化）
// =====================================================================

const ANIMATION_CSS = `
  /* ---- 通用 ---- */
  .paginate-page-static { position: absolute; inset: 0; overflow: hidden; }
  .paginate-page { position: absolute; inset: 0; overflow: hidden; }

  /* ==== simulate: 3D 翻书 ==== */
  .paginate-stage { perspective: 1500px; }
  .paginate-page-back { z-index: 1; }
  .paginate-page-front {
    z-index: 2;
    transform-origin: left center;
    backface-visibility: hidden;
    box-shadow: 2px 0 12px rgba(0,0,0,0.08), 6px 0 24px rgba(0,0,0,0.04);
  }
  .paginate-spine-shadow {
    position: absolute; inset: 0; z-index: 3; pointer-events: none;
    background: linear-gradient(to right,
      rgba(0,0,0,0.08) 0%,
      rgba(0,0,0,0.03) 8px,
      transparent 24px);
  }
  .paginate-flip-next { animation: flipAwayLeft 0.45s cubic-bezier(0.4,0.0,0.2,1) forwards; }
  .paginate-flip-prev { animation: flipInLeft   0.45s cubic-bezier(0.4,0.0,0.2,1) forwards; }
  @keyframes flipAwayLeft { 0%{transform:rotateY(0deg)} 100%{transform:rotateY(-180deg)} }
  @keyframes flipInLeft    { 0%{transform:rotateY(-180deg)} 100%{transform:rotateY(0deg)} }

  /* ==== cover: 覆盖 ==== */
  .paginate-cover-in  { z-index: 2; animation: coverIn  0.3s ease forwards; }
  .paginate-cover-out { z-index: 2; animation: coverOut 0.3s ease forwards; }
  @keyframes coverIn  { from{transform:translateX(100%)} to{transform:translateX(0)} }
  @keyframes coverOut { from{transform:translateX(0)}    to{transform:translateX(100%)} }

  /* ==== slide: 平移 ==== */
  .paginate-slide-out-l { animation: slideOutL 0.3s ease forwards; }
  .paginate-slide-out-r { animation: slideOutR 0.3s ease forwards; }
  .paginate-slide-in-l  { animation: slideInL  0.3s ease forwards; }
  .paginate-slide-in-r  { animation: slideInR  0.3s ease forwards; }
  @keyframes slideOutL { from{transform:translateX(0);opacity:1}  to{transform:translateX(-100%);opacity:0} }
  @keyframes slideOutR { from{transform:translateX(0);opacity:1}  to{transform:translateX(100%);opacity:0} }
  @keyframes slideInL  { from{transform:translateX(-100%);opacity:0} to{transform:translateX(0);opacity:1} }
  @keyframes slideInR  { from{transform:translateX(100%);opacity:0}  to{transform:translateX(0);opacity:1} }

  /* ==== vertical: 上下 ==== */
  .paginate-vert-out-u { animation: vertOutU 0.35s ease forwards; }
  .paginate-vert-out-d { animation: vertOutD 0.35s ease forwards; }
  .paginate-vert-in-d  { animation: vertInD  0.35s ease forwards; }
  .paginate-vert-in-u  { animation: vertInU  0.35s ease forwards; }
  @keyframes vertOutU { from{transform:translateY(0);opacity:1}     to{transform:translateY(-40%);opacity:0} }
  @keyframes vertOutD { from{transform:translateY(0);opacity:1}     to{transform:translateY(40%);opacity:0} }
  @keyframes vertInD  { from{transform:translateY(-40%);opacity:0}  to{transform:translateY(0);opacity:1} }
  @keyframes vertInU  { from{transform:translateY(40%);opacity:0}   to{transform:translateY(0);opacity:1} }
`;
