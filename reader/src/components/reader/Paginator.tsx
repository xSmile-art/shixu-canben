import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react";
import type { FlipStyle } from "@app-types/settings";
import { splitIntoPages } from "@lib/paginate";
import { zoneOf } from "@lib/tapZone";
import { axisOf, frameFor, type FlipDir } from "@lib/flipStyle";
import { tween, easeOutCubic } from "@lib/tween";

export interface PaginatorProps {
  html: string;
  flipStyle: FlipStyle;
  page: number;
  /** 跨章落点：分页就绪后跳到该页，消费后由 onPageChange 链路清除 */
  pendingPage?: number | "last" | null;
  onPageChange: (page: number, total: number) => void;
  onToggleMenu: () => void;
  onRequestChapter: (dir: "prev" | "next", land: "first" | "last") => void;
  className?: string;
  style?: CSSProperties;
}

interface FlipState {
  dir: FlipDir;
  from: number;
  to: number;
  p: number;
}

const TAP_MAX_DIST = 10; // px
const TAP_MAX_MS = 300;
const FLIP_COMMIT_P = 0.3; // 松手超过该进度则完成翻页
const FLIP_COMMIT_V = 0.0005; // 进度/ms（≈0.5px/ms 换算）
const TWEEN_MS = 240;

export function Paginator({
  html,
  flipStyle,
  page,
  pendingPage = null,
  onPageChange,
  onToggleMenu,
  onRequestChapter,
  className = "",
  style,
}: PaginatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<string[][]>([]);
  const blocks = useMemo(() => splitBlocks(html), [html]);

  const total = pages.length;
  const safePage = Math.min(Math.max(page, 0), Math.max(total - 1, 0));

  // ---- 翻页进行态（p 用 ref 高频更新，避免频繁 setState） ----
  const [flip, setFlip] = useState<FlipState | null>(null);
  const flipRef = useRef<FlipState | null>(null);
  const frontRef = useRef<HTMLDivElement>(null);
  const backRef = useRef<HTMLDivElement>(null);
  const tweenCancelRef = useRef<(() => void) | null>(null);

  const setP = useCallback(
    (p: number) => {
      const f = flipRef.current;
      if (!f) return;
      f.p = p;
      applyFrame(flipStyle, f, frontRef.current, backRef.current);
    },
    [flipStyle],
  );

  // ---- 分页测量（宽度变化或高度变化 >100px 才重排，防 URL 栏抖动） ----
  const lastSizeRef = useRef<{ w: number; h: number }>({ w: 0, h: 0 });
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const last = lastSizeRef.current;
      const widthChanged = w !== last.w;
      const heightJump = Math.abs(h - last.h) > 100;
      if (!widthChanged && !heightJump && last.w !== 0) return;
      lastSizeRef.current = { w, h };
      if (!h) return;
      const heights = blocks.map((b) => measureBlock(b, el));
      const idxPages = splitIntoPages(heights, h);
      setPages(idxPages.map((arr) => arr.map((i) => blocks[i])));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blocks]);

  // ---- 首次/总页数变化上报 ----
  useEffect(() => {
    if (total > 0) onPageChange(safePage, total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  // ---- 消费 pendingPage（跨章落点） ----
  useEffect(() => {
    if (pendingPage == null || total === 0) return;
    const target = pendingPage === "last" ? total - 1 : pendingPage;
    const clamped = Math.min(Math.max(target, 0), total - 1);
    onPageChange(clamped, total);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingPage, total]);

  // ---- 完成/回弹补间 ----
  const finishFlip = useCallback(
    (commit: boolean) => {
      const f = flipRef.current;
      if (!f) return;
      tweenCancelRef.current?.();
      const target = commit ? 1 : 0;
      const dur = TWEEN_MS * Math.abs(target - f.p);
      tweenCancelRef.current = tween(
        f.p,
        target,
        dur,
        easeOutCubic,
        (v) => setP(v),
        () => {
          tweenCancelRef.current = null;
          flipRef.current = null;
          setFlip(null);
          if (commit) onPageChange(f.to, total);
        },
      );
    },
    [onPageChange, setP, total],
  );

  const startFlip = useCallback(
    (dir: FlipDir, from: number, to: number, p0 = 0) => {
      tweenCancelRef.current?.();
      const f: FlipState = { dir, from, to, p: p0 };
      flipRef.current = f;
      setFlip(f);
      // 双层渲染后设初始帧
      requestAnimationFrame(() =>
        applyFrame(flipStyle, f, frontRef.current, backRef.current),
      );
    },
    [flipStyle],
  );

  // ---- tap 触发的翻页 ----
  const tapFlip = useCallback(
    (dir: FlipDir) => {
      if (flipRef.current) return; // 动画中忽略 tap
      const to = dir === "next" ? safePage + 1 : safePage - 1;
      startFlip(dir, safePage, to, 0);
      requestAnimationFrame(() => finishFlip(true));
    },
    [safePage, startFlip, finishFlip],
  );

  // ---- 手势 ----
  const gestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    startT: number;
    mode: "pending" | "tap" | "pan";
    dir: FlipDir | null;
  } | null>(null);

  const axis = axisOf(flipStyle);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "mouse" && e.button !== 0) return;
    if (gestureRef.current) return; // 单指
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    gestureRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startT: Date.now(),
      mode: "pending",
      dir: flipRef.current?.dir ?? null,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    const dist = Math.hypot(dx, dy);

    if (g.mode === "pending") {
      if (dist < TAP_MAX_DIST) return;
      if (!axis) {
        g.mode = "tap"; // none：不跟手
        return;
      }
      const primary = axis === "x" ? dx : dy;
      const dir: FlipDir = primary < 0 ? "next" : "prev";
      const to = dir === "next" ? safePage + 1 : safePage - 1;
      const inRange = to >= 0 && to < total;
      if (!inRange && !flipRef.current) {
        g.mode = "tap"; // 边界不跟手
        return;
      }
      g.mode = "pan";
      g.dir = dir;
      if (!flipRef.current) startFlip(dir, safePage, to, 0);
    }

    if (g.mode === "pan" && flipRef.current) {
      const el = containerRef.current;
      const size = axis === "x" ? el?.clientWidth : el?.clientHeight;
      if (!size) return;
      const primary = axis === "x" ? dx : dy;
      // next：负向位移增大 p；prev：正向位移增大 p
      const p =
        g.dir === "next" ? -primary / size : primary / size;
      setP(Math.min(Math.max(p, 0), 1));
    }
  };

  const onPointerUp = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    gestureRef.current = null;
    const dt = Date.now() - g.startT;
    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    const dist = Math.hypot(dx, dy);

    // ---- tap ----
    if (g.mode !== "pan" && dist < TAP_MAX_DIST && dt < TAP_MAX_MS) {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const zone = zoneOf((e.clientX - rect.left) / rect.width);
      if (zone === "menu") {
        onToggleMenu();
        return;
      }
      const dir: FlipDir = zone === "next" ? "next" : "prev";
      const to = dir === "next" ? safePage + 1 : safePage - 1;
      if (to >= 0 && to < total) {
        tapFlip(dir);
      } else {
        onRequestChapter(dir, dir === "next" ? "first" : "last");
      }
      return;
    }

    // ---- pan 结束：按进度/速度决定完成或回弹 ----
    if (g.mode === "pan" && flipRef.current) {
      const f = flipRef.current;
      const el = containerRef.current;
      const size = axis === "x" ? el?.clientWidth : el?.clientHeight;
      const primary = axis === "x" ? dx : dy;
      const v = size ? Math.abs(primary) / size / Math.max(dt, 1) : 0; // 进度/ms
      const commit = f.p >= FLIP_COMMIT_P || v >= FLIP_COMMIT_V;
      finishFlip(commit);
    }
  };

  const onPointerCancel = () => {
    gestureRef.current = null;
    if (flipRef.current) finishFlip(false);
  };

  // ---- 渲染 ----
  const frame = flip != null ? frameFor(flipStyle, flip.p, flip.dir) : null;

  const frontPageIdx =
    flip != null ? (frame!.frontIsNew ? flip.to : flip.from) : null;
  const backPageIdx =
    flip != null ? (frame!.frontIsNew ? flip.from : flip.to) : null;

  return (
    <div
      data-testid="paginate-root"
      ref={containerRef}
      className={`relative h-full overflow-hidden touch-none select-none ${className}`}
      style={{ ...style, ...(frame?.stage ?? {}) }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      {/* 静态层：无翻页进行时显示当前页 */}
      {flip == null && pages[safePage] && (
        <div
          className="paginate-layer paginate-layer-front"
          dangerouslySetInnerHTML={{ __html: pages[safePage].join("") }}
        />
      )}

      {/* 翻页双层 */}
      {flip != null && backPageIdx != null && pages[backPageIdx] && (
        <div
          ref={backRef}
          className="paginate-layer paginate-layer-back"
          dangerouslySetInnerHTML={{ __html: pages[backPageIdx].join("") }}
        />
      )}
      {flip != null && flipStyle === "simulate" && (
        <div className="paginate-spine" />
      )}
      {flip != null && frontPageIdx != null && pages[frontPageIdx] && (
        <div
          ref={frontRef}
          className="paginate-layer paginate-layer-front"
          dangerouslySetInnerHTML={{ __html: pages[frontPageIdx].join("") }}
        />
      )}

      {/* 页码指示器 */}
      {total > 1 && (
        <div className="paginate-indicator pointer-events-none absolute left-1/2 -translate-x-1/2 text-sm text-muted">
          {safePage + 1} / {total}
        </div>
      )}
    </div>
  );
}

// =====================================================================
// 工具
// =====================================================================

function applyFrame(
  style: FlipStyle,
  f: FlipState,
  front: HTMLElement | null,
  back: HTMLElement | null,
) {
  const frame = frameFor(style, f.p, f.dir);
  if (front) Object.assign(front.style, frame.front);
  if (back) Object.assign(back.style, frame.back);
}

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
