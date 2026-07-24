import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { tween, easeOutCubic, prefersReducedMotion } from "@lib/tween";

describe("tween", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("easeOutCubic 端点与中间值", () => {
    expect(easeOutCubic(0)).toBe(0);
    expect(easeOutCubic(1)).toBe(1);
    expect(easeOutCubic(0.5)).toBeCloseTo(0.875, 3);
  });

  it("按时间推进调用 onFrame 并在结束时调用 onDone", () => {
    const frames: number[] = [];
    const onDone = vi.fn();
    // 模拟 rAF：捕获回调手动推进
    let rafCb: FrameRequestCallback | null = null;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCb = cb;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});

    tween(0, 100, 160, easeOutCubic, (v) => frames.push(v), onDone);
    // 第 1 帧仅记录起始时间（start=16），从第 2 帧起推进；再补 1 帧越过终点
    let t = 16;
    for (let i = 0; i < 11; i++) {
      const cb = rafCb!;
      rafCb = null;
      cb(t);
      t += 16;
    }
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(frames[frames.length - 1]).toBe(100);
    // 首帧 t=0 是起点 0；第二帧起 >0 且 <100
    expect(frames[0]).toBe(0);
    expect(frames[1]).toBeGreaterThan(0);
    expect(frames[1]).toBeLessThan(100);
  });

  it("取消后不再触发 onFrame/onDone", () => {
    const onFrame = vi.fn();
    const onDone = vi.fn();
    let rafCb: FrameRequestCallback | null = null;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCb = cb;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});

    const cancel = tween(0, 100, 160, easeOutCubic, onFrame, onDone);
    cancel();
    // TS 对闭包内赋值的 rafCb 窄化为 never，这里显式绕开
    const cb = rafCb as FrameRequestCallback | null;
    if (cb) cb(32);
    expect(onFrame).not.toHaveBeenCalled();
    expect(onDone).not.toHaveBeenCalled();
  });

  it("prefersReducedMotion 读取 matchMedia", () => {
    vi.stubGlobal("matchMedia", (q: string) => ({
      matches: q.includes("reduce"),
      media: q,
      addEventListener() {},
      removeEventListener() {},
    }));
    expect(prefersReducedMotion()).toBe(true);
  });
});
