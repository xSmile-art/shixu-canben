# Reader 移动端适配 + 翻页动画重构 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 重构 reader 翻页动画为进度驱动引擎，支持跟手滑动与番茄式三段点按，并完成移动端视口/安全区/指示器适配。

**Architecture:** 以纯函数 `FlipFn(p, dir)` 渲染双层翻页帧，rAF 补间驱动进度 p；手势用 Pointer Events 在 Paginator 根节点统一处理，删除 ClickAreas 透明按钮层以消除与底部栏的事件冲突。App 层用 `chromeVisible` 统一控制顶栏/底栏显隐，`pendingPage` 协调跨章落点。

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Vitest + @testing-library/react, pnpm。

**Spec:** `docs/superpowers/specs/2026-07-24-reader-mobile-pageturn-design.md`

**工作目录:** `reader/`（除非特别注明，所有相对路径都相对 `reader/`）

---

## 文件结构总览

新建：
- `src/lib/tween.ts` — rAF 补间 + easeOutCubic + reduced-motion 判断
- `src/lib/tapZone.ts` — 三段点按区域判定纯函数
- `src/lib/flipStyle.ts` — 五种翻页样式的 `FlipFn` 纯函数 + 主轴映射
- `test/lib/tween.test.ts`
- `test/lib/tapZone.test.ts`
- `test/lib/flipStyle.test.ts`

重写/修改：
- `src/components/reader/Paginator.tsx` — 进度驱动动画 + Pointer 手势 + 跨章 pendingPage
- `src/components/reader/ChapterView.tsx` — flex 布局 + 透传新回调
- `src/App.tsx` — chromeVisible 联动、跨章回调、NavButtons 移动端隐藏
- `src/index.css` — 100lvh、安全区、`.paginate-*` 基础样式
- `index.html` — `viewport-fit=cover`
- `test/components/Paginator.test.tsx` — 新交互测试
- `test/components/ChapterView.test.tsx` — 透传测试

---

### Task 1: 补间引擎 `tween.ts`

**Files:**
- Create: `src/lib/tween.ts`
- Test: `test/lib/tween.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `test/lib/tween.test.ts`：

```ts
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
    // 模拟 rAF：每 16ms 一帧
    let rafCb: FrameRequestCallback | null = null;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafCb = cb;
      return 1;
    });
    vi.stubGlobal("cancelAnimationFrame", () => {});

    tween(0, 100, 160, easeOutCubic, (v) => frames.push(v), onDone);
    // 推 10 帧（160ms）
    for (let t = 16; t <= 160; t += 16) {
      const cb = rafCb!;
      rafCb = null;
      cb(t);
    }
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(frames[frames.length - 1]).toBe(100);
    expect(frames[0]).toBeGreaterThan(0);
    expect(frames[0]).toBeLessThan(100);
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
    if (rafCb) rafCb(32);
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
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd reader && pnpm vitest run test/lib/tween.test.ts
```

预期：FAIL（`@lib/tween` 不存在）。

- [ ] **Step 3: 最小实现**

创建 `src/lib/tween.ts`：

```ts
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
```

- [ ] **Step 4: 跑测试确认通过**

```bash
cd reader && pnpm vitest run test/lib/tween.test.ts
```

预期：4 个测试全 PASS。

- [ ] **Step 5: 提交**

```bash
git add reader/src/lib/tween.ts reader/test/lib/tween.test.ts
git commit -m "feat(reader): 新增 rAF 补间引擎 tween/easeOutCubic/reduced-motion"
```

---

### Task 2: 三段点按区域 `tapZone.ts`

**Files:**
- Create: `src/lib/tapZone.ts`
- Test: `test/lib/tapZone.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `test/lib/tapZone.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { zoneOf, type TapZone } from "@lib/tapZone";

describe("zoneOf 三段点按分区", () => {
  it("左 1/3 是 prev", () => {
    expect(zoneOf(0)).toBe("prev");
    expect(zoneOf(0.2)).toBe("prev");
    expect(zoneOf(1 / 3 - 0.001)).toBe("prev");
  });
  it("中 1/3 是 menu", () => {
    expect(zoneOf(1 / 3)).toBe("menu");
    expect(zoneOf(0.5)).toBe("menu");
    expect(zoneOf(2 / 3 - 0.001)).toBe("menu");
  });
  it("右 1/3 是 next", () => {
    expect(zoneOf(2 / 3)).toBe("next");
    expect(zoneOf(0.9)).toBe("next");
    expect(zoneOf(1)).toBe("next");
  });
  it("越界值 clamp", () => {
    expect(zoneOf(-0.5)).toBe("prev");
    expect(zoneOf(1.5)).toBe("next");
  });
  it("类型导出", () => {
    const z: TapZone = "menu";
    expect(z).toBe("menu");
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd reader && pnpm vitest run test/lib/tapZone.test.ts
```

预期：FAIL（`@lib/tapZone` 不存在）。

- [ ] **Step 3: 最小实现**

创建 `src/lib/tapZone.ts`：

```ts
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
```

- [ ] **Step 4: 跑测试确认通过**

```bash
cd reader && pnpm vitest run test/lib/tapZone.test.ts
```

预期：5 个测试全 PASS。

- [ ] **Step 5: 提交**

```bash
git add reader/src/lib/tapZone.ts reader/test/lib/tapZone.test.ts
git commit -m "feat(reader): 新增番茄式三段点按分区 zoneOf"
```

---

### Task 3: 五种翻页帧纯函数 `flipStyle.ts`

**Files:**
- Create: `src/lib/flipStyle.ts`
- Test: `test/lib/flipStyle.test.ts`

- [ ] **Step 1: 写失败测试**

创建 `test/lib/flipStyle.test.ts`：

```ts
import { describe, it, expect } from "vitest";
import { axisOf, frameFor, type FlipDir } from "@lib/flipStyle";

describe("axisOf", () => {
  it("simulate/cover/slide 是水平，vertical 是垂直，none 无跟手", () => {
    expect(axisOf("simulate")).toBe("x");
    expect(axisOf("cover")).toBe("x");
    expect(axisOf("slide")).toBe("x");
    expect(axisOf("vertical")).toBe("y");
    expect(axisOf("none")).toBeNull();
  });
});

describe("frameFor", () => {
  const dir: FlipDir = "next";

  it("slide：p=0 新页在屏外右侧，p=1 旧页在屏外左侧", () => {
    const f0 = frameFor("slide", 0, dir);
    expect(f0.front.transform).toBe("translateX(100%)");
    expect(f0.back.transform).toBe("translateX(0%)");
    const f1 = frameFor("slide", 1, dir);
    expect(f1.back.transform).toBe("translateX(-100%)");
    expect(f1.front.transform).toBe("translateX(0%)");
  });

  it("cover next：新页盖入；prev：旧页滑出", () => {
    const fNext = frameFor("cover", 0.5, "next");
    expect(fNext.frontIsNew).toBe(true);
    expect(fNext.front.transform).toBe("translateX(50%)");
    const fPrev = frameFor("cover", 0.5, "prev");
    expect(fPrev.frontIsNew).toBe(false);
    expect(fPrev.front.transform).toBe("translateX(50%)");
  });

  it("vertical next：旧页上滑新页自下而入", () => {
    const f = frameFor("vertical", 0.5, "next");
    expect(f.back.transform).toBe("translateY(-50%)");
    expect(f.front.transform).toBe("translateY(50%)");
  });

  it("simulate：front rotateY 随 p 从 0 到 -180", () => {
    const f0 = frameFor("simulate", 0, "next");
    expect(f0.front.transform).toBe("rotateY(0deg)");
    expect(f0.stage?.perspective).toBe("1500px");
    const f1 = frameFor("simulate", 1, "next");
    expect(f1.front.transform).toBe("rotateY(-180deg)");
  });

  it("none：不做双层帧（front/back 均无 transform）", () => {
    const f = frameFor("none", 0.5, "next");
    expect(f.front.transform).toBeUndefined();
    expect(f.back.transform).toBeUndefined();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

```bash
cd reader && pnpm vitest run test/lib/flipStyle.test.ts
```

预期：FAIL（`@lib/flipStyle` 不存在）。

- [ ] **Step 3: 最小实现**

创建 `src/lib/flipStyle.ts`：

```ts
import type { CSSProperties } from "react";
import type { FlipStyle } from "@app-types/settings";

export type FlipDir = "next" | "prev";

/** 一帧翻页：front/back 两层样式 + 容器 stage 样式 + front 层渲染的是否为新页 */
export interface FlipFrame {
  front: CSSProperties;
  back: CSSProperties;
  stage?: CSSProperties;
  frontIsNew: boolean;
}

/** 手势主轴：simulate/cover/slide 跟手水平，vertical 跟手垂直，none 不跟手 */
export function axisOf(style: FlipStyle): "x" | "y" | null {
  switch (style) {
    case "simulate":
    case "cover":
    case "slide":
      return "x";
    case "vertical":
      return "y";
    case "none":
      return null;
  }
}

const pct = (v: number) => `${(v * 100).toFixed(3)}%`;

/**
 * 给定样式与进度 p∈[0,1]，输出该帧的双层样式（纯函数，便于测试）。
 * 约定：front 在上层；frontIsNew 表示 front 渲染 to 页还是 from 页。
 */
export function frameFor(style: FlipStyle, p: number, dir: FlipDir): FlipFrame {
  const isNext = dir === "next";
  switch (style) {
    case "none":
      return { front: {}, back: {}, frontIsNew: true };

    case "cover":
      // next：新页从右盖入（front=新页）；prev：旧页向右滑出（front=旧页）
      return {
        front: {
          transform: `translateX(${pct(isNext ? 1 - p : p)})`,
          zIndex: 2,
        },
        back: { transform: "translateX(0%)", zIndex: 1 },
        frontIsNew: isNext,
      };

    case "slide": {
      // 两层首尾相接同向滑动
      const sign = isNext ? -1 : 1; // next 时旧页向左出
      return {
        back: { transform: `translateX(${pct(sign * p)})`, zIndex: 1 },
        front: {
          transform: `translateX(${pct(-sign * (1 - p))})`,
          zIndex: 2,
        },
        frontIsNew: true,
      };
    }

    case "vertical": {
      const sign = isNext ? -1 : 1; // next 时旧页向上出
      return {
        back: { transform: `translateY(${pct(sign * p)})`, zIndex: 1 },
        front: {
          transform: `translateY(${pct(-sign * (1 - p))})`,
          zIndex: 2,
        },
        frontIsNew: true,
      };
    }

    case "simulate": {
      // 3D 翻书：front 从 rotateY(0) → rotateY(-180)
      const deg = isNext ? -180 * p : -180 + 180 * p;
      return {
        stage: { perspective: "1500px" },
        back: { zIndex: 1 },
        front: {
          transform: `rotateY(${deg.toFixed(2)}deg)`,
          transformOrigin: "left center",
          backfaceVisibility: "hidden",
          zIndex: 2,
        },
        frontIsNew: !isNext ? true : false, // next 时 front 是旧页（被翻走）
      };
    }
  }
}
```

> 注：`simulate` 的 `frontIsNew` 语义：next 翻页时 front 层放旧页（被翻到背面），back 层放新页；prev 时 front 放新页（从背面翻回）。

- [ ] **Step 4: 跑测试确认通过**

```bash
cd reader && pnpm vitest run test/lib/flipStyle.test.ts
```

预期：全 PASS（注意 `simulate` 用例只断言 transform/stage，不断言 frontIsNew）。

- [ ] **Step 5: 提交**

```bash
git add reader/src/lib/flipStyle.ts reader/test/lib/flipStyle.test.ts
git commit -m "feat(reader): 五种翻页样式的进度帧纯函数 frameFor/axisOf"
```

---

### Task 4: 视口高度稳定 + 安全区（CSS / index.html）

**Files:**
- Modify: `index.html`
- Modify: `src/index.css`

无独立单测（样式层），由后续 App/Paginator 集成验证 + 手测确认。

- [ ] **Step 1: meta viewport 支持刘海屏**

修改 `index.html` 第 5 行：

```html
<meta
  name="viewport"
  content="width=device-width, initial-scale=1.0, viewport-fit=cover"
/>
```

- [ ] **Step 2: 根容器高度用 lvh 链 + 安全区工具类**

修改 `src/index.css` 中 `html, body, #root` 块（约 30-36 行）为：

```css
html,
body,
#root {
  height: 100%;
  /* 移动端高度链：vh 兜底 → dvh（动态） → lvh（大视口，URL 栏伸缩不抖动） */
  height: 100vh;
  height: 100dvh;
  height: 100lvh;
}
```

在文件末尾追加安全区与翻页双层基础样式：

```css
/* ===== 移动端安全区 ===== */
.safe-top {
  padding-top: env(safe-area-inset-top);
}
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}

/* ===== 翻页双层（进度驱动） ===== */
.paginate-stage {
  position: absolute;
  inset: 0;
  overflow: hidden;
}
.paginate-layer {
  position: absolute;
  inset: 0;
  overflow: hidden;
  will-change: transform;
  background: var(--color-bg);
}
.paginate-layer-front {
  z-index: 2;
}
.paginate-layer-back {
  z-index: 1;
}
.paginate-spine {
  position: absolute;
  inset: 0;
  z-index: 3;
  pointer-events: none;
  background: linear-gradient(
    to right,
    rgba(0, 0, 0, 0.08) 0%,
    rgba(0, 0, 0, 0.03) 8px,
    transparent 24px
  );
}
```

- [ ] **Step 3: 类型检查 + 构建验证**

```bash
cd reader && pnpm build
```

预期：构建成功（CSS 语法无误）。

- [ ] **Step 4: 提交**

```bash
git add reader/index.html reader/src/index.css
git commit -m "feat(reader): 100lvh 视口高度链 + 安全区工具类 + 翻页双层基础样式"
```

---

### Task 5: Paginator 重构（进度驱动 + 手势 + 跨章）

**Files:**
- Modify: `src/components/reader/Paginator.tsx`（整体重写）
- Test: `test/components/Paginator.test.tsx`（整体重写）

这是核心任务，分步：先重写测试（新交互契约），再重写组件。

- [ ] **Step 1: 重写测试（先确认失败）**

整体替换 `test/components/Paginator.test.tsx`：

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Paginator } from "@components/reader/Paginator";

// 容器 100px 高；每个块 40px → 3 块分两页（[2块][1块]）
function mockLayout() {
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(100);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(40);
}

const html = "<p>第一段</p><p>第二段</p><p>第三段</p>";

function setup(props: Partial<Parameters<typeof Paginator>[0]> = {}) {
  const onPageChange = vi.fn();
  const onToggleMenu = vi.fn();
  const onRequestChapter = vi.fn();
  render(
    <Paginator
      html={html}
      flipStyle="slide"
      page={0}
      onPageChange={onPageChange}
      onToggleMenu={onToggleMenu}
      onRequestChapter={onRequestChapter}
      {...props}
    />,
  );
  return { onPageChange, onToggleMenu, onRequestChapter };
}

// 模拟一次 tap（pointerdown+up 同一点，位移<10px，时长<300ms）
function tap(el: Element, x: number) {
  const now = Date.now();
  fireEvent.pointerDown(el, { clientX: x, clientY: 50, pointerId: 1 });
  vi.spyOn(Date, "now").mockReturnValue(now + 100);
  fireEvent.pointerUp(el, { clientX: x, clientY: 50, pointerId: 1 });
  vi.restoreAllMocks();
  mockLayout(); // restoreAllMocks 会清掉布局 mock，补回
}

describe("Paginator 三段点按", () => {
  beforeEach(mockLayout);
  afterEach(() => vi.restoreAllMocks());

  it("点左侧 1/3 触发上一页方向（第 1 页时请求上一章）", async () => {
    const { onRequestChapter } = setup();
    await waitFor(() =>
      expect(screen.getByTestId("paginate-root")).toBeInTheDocument(),
    );
    tap(screen.getByTestId("paginate-root"), 30); // 容器宽 300，左 1/3 < 100
    expect(onRequestChapter).toHaveBeenCalledWith("prev", "last");
  });

  it("点中间 1/3 触发 onToggleMenu", async () => {
    const { onToggleMenu, onRequestChapter } = setup();
    await waitFor(() => screen.getByTestId("paginate-root"));
    tap(screen.getByTestId("paginate-root"), 150); // 100..200 为中段
    expect(onToggleMenu).toHaveBeenCalledTimes(1);
    expect(onRequestChapter).not.toHaveBeenCalled();
  });

  it("末页点右侧 1/3 请求下一章", async () => {
    const { onRequestChapter } = setup({ page: 1 }); // 末页
    await waitFor(() => screen.getByTestId("paginate-root"));
    tap(screen.getByTestId("paginate-root"), 270);
    expect(onRequestChapter).toHaveBeenCalledWith("next", "first");
  });

  it("中间页点右侧 1/3 直接翻下一页（动画完成后提交页码）", async () => {
    const { onPageChange, onRequestChapter } = setup({ page: 0 });
    await waitFor(() => screen.getByTestId("paginate-root"));
    tap(screen.getByTestId("paginate-root"), 270);
    expect(onRequestChapter).not.toHaveBeenCalled();
    // 动画完成（tween reduced-motion/瞬切路径下同步提交）
    await waitFor(() =>
      expect(onPageChange).toHaveBeenCalledWith(1, 2),
    );
  });

  it("页码指示器渲染且无 pointer-events", async () => {
    setup();
    await waitFor(() => expect(screen.getByText("1 / 2")).toBeInTheDocument());
    const ind = screen.getByText("1 / 2");
    expect(ind.className).toContain("pointer-events-none");
  });
});
```

> 说明：`tap` 用 `fireEvent.pointerDown/Up`；jsdom 无 PointerEvent 构造，`fireEvent.pointerDown` 会退化为通用 Event 但带 clientX 等属性，组件需用 `e.clientX` 读取（不要用 `e.nativeEvent.offsetX`）。测试环境 `prefersReducedMotion` 默认 false，tween 走 rAF；为让 `onPageChange` 在测试里可等待，组件的 tap 翻页走 tween 且 jsdom 的 rAF 由 vitest 提供（真实计时器下 240ms 内完成，`waitFor` 默认 1s 超时足够）。

跑测试确认失败：

```bash
cd reader && pnpm vitest run test/components/Paginator.test.tsx
```

预期：FAIL（组件尚无 `data-testid="paginate-root"`，props 也不匹配）。

- [ ] **Step 2: 重写 Paginator 组件**

整体替换 `src/components/reader/Paginator.tsx`：

```tsx
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
const FLIP_COMMIT_V = 0.5; // px/ms 速度阈值
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

  // ---- 翻页进行态（p 用 ref 高频更新，避免每次 setState） ----
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

  // ---- 分页测量（宽度变化或高度变化 >100px 才重排） ----
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
      if (!widthChanged && !heightJump && pages.length) return;
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

  // ---- 首次上报页码/总页数 ----
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

  // ---- 完成/回弹 ----
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
      // 等两层渲染后设初值帧
      requestAnimationFrame(() =>
        applyFrame(flipStyle, f, frontRef.current, backRef.current),
      );
    },
    [flipStyle],
  );

  // ---- tap 翻页（点按） ----
  const tapFlip = useCallback(
    (dir: FlipDir) => {
      if (flipRef.current) return; // 动画中忽略 tap
      const to = dir === "next" ? safePage + 1 : safePage - 1;
      startFlip(dir, safePage, to, 0);
      // 立即开始补间到完成
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
    lastX: number;
    lastY: number;
    lastT: number;
    mode: "pending" | "tap" | "pan";
    dir: FlipDir | null;
  } | null>(null);

  const axis = axisOf(flipStyle);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === "mouse") return;
    if (gestureRef.current) return; // 单指
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    // 动画中接管：保持当前 flip 与 p
    const now = Date.now();
    gestureRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startT: now,
      lastX: e.clientX,
      lastY: e.clientY,
      lastT: now,
      mode: "pending",
      dir: flipRef.current?.dir ?? null,
    };
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const g = gestureRef.current;
    if (!g || g.pointerId !== e.pointerId) return;
    const now = Date.now();
    g.lastX = e.clientX;
    g.lastY = e.clientY;
    g.lastT = now;

    const dx = e.clientX - g.startX;
    const dy = e.clientY - g.startY;
    const dist = Math.hypot(dx, dy);

    if (g.mode === "pending") {
      if (dist < TAP_MAX_DIST) return;
      // 决定是否为跟手 pan：需要主轴、方向上有可翻页
      if (!axis) {
        g.mode = "tap"; // none：不跟手，松手再判
        return;
      }
      const primary = axis === "x" ? dx : dy;
      if (Math.abs(primary) < TAP_MAX_DIST) return;
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
      const dirSign = g.dir === "next" ? -1 : 1;
      // next：负向位移增大 p；prev：正向位移增大 p
      const p = (primary * -dirSign * -1) / size; // 化简：next 时 -dx/size
      const pClamped = Math.min(Math.max(dirSign === -1 ? -primary / size : primary / size, 0), 1);
      void p;
      setP(pClamped);
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
      const commit = f.p >= FLIP_COMMIT_P || v >= FLIP_COMMIT_V / 1000;
      finishFlip(commit);
    }
  };

  const onPointerCancel = () => {
    gestureRef.current = null;
    if (flipRef.current) finishFlip(false);
  };

  // ---- 渲染 ----
  const frame =
    flip != null ? frameFor(flipStyle, flip.p, flip.dir) : null;

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
```

- [ ] **Step 3: 跑 Paginator 测试**

```bash
cd reader && pnpm vitest run test/components/Paginator.test.tsx
```

预期：5 个测试 PASS。若 `onPointerMove` 中 p 计算有冗余变量（上面留了 `void p` 占位），实现时清理为只保留 `pClamped` 一行计算。

- [ ] **Step 4: 全量测试 + 构建**

```bash
cd reader && pnpm test && pnpm build
```

预期：`ChapterView` 旧用例（`下一页` 按钮）会失败——这是预期的，因为 `ClickAreas` 已删；该用例在 Task 6 更新。其余全绿。

- [ ] **Step 5: 提交**

```bash
git add reader/src/components/reader/Paginator.tsx reader/test/components/Paginator.test.tsx
git commit -m "refactor(reader): Paginator 重构为进度驱动动画 + Pointer 手势 + 三段点按"
```

---

### Task 6: ChapterView 透传 + flex 布局

**Files:**
- Modify: `src/components/reader/ChapterView.tsx`
- Test: `test/components/ChapterView.test.tsx`

- [ ] **Step 1: 更新失败用例 + 新增透传用例**

修改 `test/components/ChapterView.test.tsx`：

将 `pageMode=paged 时渲染翻页按钮（Paginator）` 用例（约 80-96 行）替换为：

```tsx
it("pageMode=paged 时渲染 Paginator 根节点", () => {
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(100);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(60);
  render(
    <ChapterView
      chapter={chapter}
      status="success"
      error={null}
      html="<p>x</p><p>y</p>"
      settings={{ ...DEFAULT_SETTINGS, pageMode: "paged", flipStyle: "slide" }}
      page={0}
      onPageChange={() => {}}
      onToggleMenu={() => {}}
      onRequestChapter={() => {}}
    />,
  );
  expect(screen.getByTestId("paginate-root")).toBeInTheDocument();
  vi.restoreAllMocks();
});

it("scroll 模式不渲染 Paginator", () => {
  render(
    <ChapterView
      chapter={chapter}
      status="success"
      error={null}
      html="<p>x</p>"
      settings={{ ...DEFAULT_SETTINGS, pageMode: "scroll" }}
    />,
  );
  expect(screen.queryByTestId("paginate-root")).not.toBeInTheDocument();
});
```

删除旧的 `pageMode=scroll 时渲染滚动正文（无翻页按钮）` 用例（被上一条覆盖）。

跑测试确认失败：

```bash
cd reader && pnpm vitest run test/components/ChapterView.test.tsx
```

预期：FAIL（组件尚未渲染 `paginate-root`，props 也未定义）。

- [ ] **Step 2: 修改 ChapterView**

整体替换 `src/components/reader/ChapterView.tsx`：

```tsx
import type { Chapter, LoadStatus } from "@app-types/chapter";
import type { ReadingSettings } from "@app-types/settings";
import { DEFAULT_SETTINGS } from "@app-types/settings";
import { LoadingError } from "./LoadingError";
import { Paginator } from "./Paginator";

interface ChapterViewProps {
  chapter: Chapter | null;
  status: LoadStatus;
  error: string | null;
  html: string;
  settings?: ReadingSettings;
  onRetry?: () => void;
  page?: number;
  pendingPage?: number | "last" | null;
  onPageChange?: (page: number, total: number) => void;
  onToggleMenu?: () => void;
  onRequestChapter?: (dir: "prev" | "next", land: "first" | "last") => void;
}

const FONT_FAMILY_VAR: Record<ReadingSettings["fontFamily"], string> = {
  serif: "var(--font-serif)",
  sans: "var(--font-sans)",
  kai: "var(--font-kai)",
};

export function ChapterView({
  chapter,
  status,
  error,
  html,
  settings = DEFAULT_SETTINGS,
  onRetry,
  page,
  pendingPage = null,
  onPageChange,
  onToggleMenu,
  onRequestChapter,
}: ChapterViewProps) {
  const bodyStyle = {
    fontSize: settings.fontSize,
    lineHeight: settings.lineHeight,
    letterSpacing: settings.letterSpacing,
    fontFamily: FONT_FAMILY_VAR[settings.fontFamily],
  };
  const bodyClass = `chapter-body prose max-w-none ${
    settings.paragraphIndent ? "" : "no-indent"
  }`;

  return (
    <article
      className="mx-auto px-4 text-fg h-full flex flex-col"
      style={{ maxWidth: settings.contentWidth }}
    >
      <LoadingError status={status} error={error} onRetry={onRetry} />
      {status === "success" && chapter && (
        <>
          <h1
            className="text-accent font-bold mb-4 shrink-0"
            style={{ fontSize: `calc(${settings.fontSize}px + 6px)` }}
          >
            第{chapter.num}章 {chapter.title}
          </h1>
          {settings.pageMode === "scroll" ? (
            <div
              className={bodyClass}
              style={bodyStyle}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <div className="flex-1 min-h-0">
              <Paginator
                html={html}
                flipStyle={settings.flipStyle}
                page={page ?? 0}
                pendingPage={pendingPage}
                onPageChange={onPageChange ?? (() => {})}
                onToggleMenu={onToggleMenu ?? (() => {})}
                onRequestChapter={onRequestChapter ?? (() => {})}
                className={bodyClass}
                style={bodyStyle}
              />
            </div>
          )}
        </>
      )}
    </article>
  );
}
```

- [ ] **Step 3: 跑测试**

```bash
cd reader && pnpm vitest run test/components/ChapterView.test.tsx
```

预期：全 PASS。

- [ ] **Step 4: 提交**

```bash
git add reader/src/components/reader/ChapterView.tsx reader/test/components/ChapterView.test.tsx
git commit -m "refactor(reader): ChapterView 透传翻页回调并改 flex 布局适配精确分页高度"
```

---

### Task 7: App 集成（chromeVisible 联动 + 跨章 + NavButtons 隐藏）

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: 状态改名 + 新增 pendingPage**

在 `src/App.tsx` 中：

- 将 `const [mobileNavVisible, setMobileNavVisible] = useState(true);`（约 89 行）改为：

```tsx
// 移动端顶栏+底部导航联动显隐（true=菜单态，false=沉浸态）
const [chromeVisible, setChromeVisible] = useState(true);
// 跨章翻页落点：1=下一章第一页，"last"=上一章最后一页
const [pendingPage, setPendingPage] = useState<number | "last" | null>(null);
```

- `selectChapter`（约 105 行）改为接收落点：

```tsx
const selectChapter = useCallback(
  (num: number, land: "first" | "last" = "first") => {
    setCurrentNum(num);
    writeUrlNum(num);
    progress.save(num, 0);
    setPendingPage(land === "last" ? "last" : 1);
    window.scrollTo(0, 0);
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setSidebarOpen(false);
    setSheetPanel(null);
  },
  [progress],
);
```

- `handleContentTap`（约 199 行）改为同时控制顶栏：

```tsx
const handleContentTap = useCallback((e: React.MouseEvent) => {
  const target = e.target as HTMLElement;
  if (
    target.closest("button") ||
    target.closest("a") ||
    target.closest("input") ||
    target.closest("select")
  )
    return;
  setChromeVisible((v) => !v);
}, []);
```

- [ ] **Step 2: 新增跨章回调**

在 `goNext` 定义之后（约 127 行）插入：

```tsx
// 翻页模式章节边界：末页再翻→下一章第一页；首页回翻→上一章最后一页
const handleRequestChapter = useCallback(
  (dir: "prev" | "next", land: "first" | "last") => {
    if (dir === "prev" && hasPrev) selectChapter(chapters[idx - 1].num, "last");
    if (dir === "next" && hasNext) selectChapter(chapters[idx + 1].num, "first");
  },
  [hasPrev, hasNext, chapters, idx, selectChapter],
);
```

- `handlePageChange`（约 181 行）改为消费 pendingPage：

```tsx
const handlePageChange = useCallback(
  (page: number, _total: number) => {
    progress.save(currentNum, page);
    setPendingPage(null); // 页码落定后清除跨章落点
  },
  [progress, currentNum],
);
```

- [ ] **Step 3: 顶栏/底栏联动显隐**

- 移动端顶栏 `<header>`（约 242 行）改为 fixed + 联动：

```tsx
<header
  className={`md:hidden fixed top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-bg border-b border-border safe-top transition-transform duration-300 ${
    chromeVisible ? "translate-y-0" : "-translate-y-full"
  }`}
>
```

- 底部导航 `<nav>`（约 326 行）将 `mobileNavVisible` 引用改为 `chromeVisible`，并加 `safe-bottom`：

```tsx
<nav
  className={`md:hidden fixed bottom-0 left-0 right-0 z-20 bg-bg border-t border-border safe-bottom transition-transform duration-300 ${
    chromeVisible ? "translate-y-0" : "translate-y-full"
  }`}
>
```

- `<main>`（约 269 行）移除 `pb-14`/`pb-0` 联动（底栏改为 fixed 不再占位）：

```tsx
<main
  ref={scrollRef}
  onClick={settings.pageMode === "scroll" ? handleContentTap : undefined}
  className="flex-1 min-w-0 py-6 overflow-y-auto md:overflow-visible"
>
```

> 说明：翻页模式下 main 不再挂 onClick（Paginator 自处理三段点按）；滚动模式保留点正文切菜单态。

- [ ] **Step 4: NavButtons 移动端隐藏 + ChapterView 传新回调**

- NavButtons 包装（约 300-311 行）加 `hidden md:block`：

```tsx
{currentChapter && chStatus === "success" && (
  <div
    style={{ maxWidth: settings.contentWidth }}
    className="mx-auto px-4 hidden md:block"
  >
    <NavButtons
      hasPrev={hasPrev}
      hasNext={hasNext}
      onPrev={goPrev}
      onNext={goNext}
    />
  </div>
)}
```

- ChapterView 调用（约 285-295 行）传新 props：

```tsx
<ChapterView
  chapter={currentChapter}
  status={chStatus}
  error={chError}
  html={html}
  settings={settings}
  onRetry={retryList}
  page={settings.pageMode === "scroll" ? 0 : progress.scrollTop}
  pendingPage={pendingPage}
  onPageChange={handlePageChange}
  onToggleMenu={() => setChromeVisible((v) => !v)}
  onRequestChapter={handleRequestChapter}
/>
```

- 全文件检索 `mobileNavVisible` / `setMobileNavVisible` 确认无残留引用。

- [ ] **Step 5: 全量测试 + 构建**

```bash
cd reader && pnpm test && pnpm build
```

预期：全绿。

- [ ] **Step 6: 提交**

```bash
git add reader/src/App.tsx
git commit -m "feat(reader): 顶栏底栏联动显隐 + 跨章翻页落点 + NavButtons 移动端隐藏"
```

---

### Task 8: BottomSheet 安全区 + 页码指示器样式

**Files:**
- Modify: `src/components/layout/BottomSheet.tsx`
- Modify: `src/index.css`

- [ ] **Step 1: BottomSheet 底部安全区**

修改 `src/components/layout/BottomSheet.tsx` 第 24 行容器，加 `safe-bottom`：

```tsx
<div className="absolute bottom-0 left-0 right-0 max-h-[70vh] bg-bg rounded-t-2xl border-t border-border flex flex-col safe-bottom">
```

- [ ] **Step 2: 页码指示器安全区定位**

在 `src/index.css` 末尾追加：

```css
/* 翻页页码指示器：避开 Home 指示条 */
.paginate-indicator {
  bottom: calc(8px + env(safe-area-inset-bottom));
}
```

- [ ] **Step 3: 构建验证**

```bash
cd reader && pnpm build
```

预期：成功。

- [ ] **Step 4: 提交**

```bash
git add reader/src/components/layout/BottomSheet.tsx reader/src/index.css
git commit -m "feat(reader): BottomSheet 与页码指示器适配安全区"
```

---

### Task 9: 端到端手测清单（非自动化，人工验证）

**Files:** 无（验证任务）

- [ ] **Step 1: 启动 dev 并设备模拟**

```bash
cd reader && pnpm dev
```

用 Chrome DevTools 设备模拟（iPhone 14 / Pixel 7）验证：

- [ ] 翻页模式（仿真/覆盖/平移/上下）点左/中/右分别：上一页 / 呼出菜单 / 下一页，菜单弹出时不再误翻页。
- [ ] 左右跟手滑动：页面随手指移动；松手位移 <30% 回弹，≥30% 完成翻页；动画中反向滑动可接管。
- [ ] 上下翻页模式：垂直滑动跟手。
- [ ] 末页继续点右侧 → 自动进下一章第 1 页；第 1 页点左侧 → 进上一章最后一页；进度记忆正确（刷新后回到对应章对应页）。
- [ ] 滚动模式阅读时上下滚动，URL 栏伸缩不触发正文跳动；切到翻页模式高度稳定。
- [ ] 旋转屏幕（横竖切换）会重新分页，阅读位置保持合理。
- [ ] iPhone 刘海/Home 指示条：顶栏、底部导航、页码指示器均不被遮挡。
- [ ] 移动端不再显示「上一章/下一章」按钮；PC 端（≥720px）显示且功能正常。
- [ ] 系统开启「减少动态效果」（prefers-reduced-motion）时翻页为瞬切。

- [ ] **Step 2: 全量自动化 + 构建**

```bash
cd reader && pnpm test && pnpm build
```

预期：全绿。

- [ ] **Step 3: 最终提交**

```bash
git add -A
git commit -m "chore(reader): 移动端适配与翻页动画重构收尾"
```

---

## Self-Review 记录

- **Spec 覆盖**：§3.1 界面状态→Task7；§3.2 三段点按→Task2/5；§3.3 手势→Task5；§3.4 滚动模式→Task7；§4 动画引擎→Task1/3/5；§4.3 commit 时机→Task5；§4.4 组件接口→Task5/6/7；§5.1 视口→Task4/5(ResizeObserver 阈值)；§5.2 分页高度→Task6(flex)；§5.3 安全区→Task4/8；§5.4 NavButtons→Task7；§10 测试→各 Task 内。
- **类型一致性**：`FlipDir`（"next"|"prev"）在 flipStyle.ts 与 Paginator 一致；`TapZone` 与 `zoneOf` 一致；`pendingPage: number | "last" | null` 在 Paginator/ChapterView/App 三处一致；`onRequestChapter(dir, land)` 签名三处一致。
- **已知简化**：`none` 样式不做跟手（axisOf 返回 null，pan 不启动），松手按 tap 逻辑处理；`simulate` prev 方向的 frontIsNew 语义已在实现注释中说明。
