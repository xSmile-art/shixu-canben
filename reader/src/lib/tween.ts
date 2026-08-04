/** easeOutCubic：翻页补间统一缓动 */
export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** 是否偏好减少动态（无障碍）：true 时翻页直接瞬切 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function")
    return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * rAF 补间：从 from 到 to，durMs 毫秒，每帧 onFrame(value)，结束 onDone()。
 * 返回取消函数；取消后不再触发任何回调。
 */
export function tween(
  from: number,
  to: number,
  durMs: number,
  ease: (t: number) => number,
  onFrame: (v: number) => void,
  onDone: () => void,
): () => void {
  if (durMs <= 0 || prefersReducedMotion()) {
    onFrame(to);
    onDone();
    return () => {};
  }
  let rafId = 0;
  let cancelled = false;
  let start: number | null = null;

  const step = (now: number) => {
    if (cancelled) return;
    if (start === null) start = now;
    const t = Math.min((now - start) / durMs, 1);
    onFrame(from + (to - from) * ease(t));
    if (t >= 1) {
      onDone();
      return;
    }
    rafId = requestAnimationFrame(step);
  };
  rafId = requestAnimationFrame(step);

  return () => {
    cancelled = true;
    cancelAnimationFrame(rafId);
  };
}
