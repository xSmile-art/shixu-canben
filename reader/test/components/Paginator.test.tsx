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
  fireEvent.pointerDown(el, { clientX: x, clientY: 50, pointerId: 1 });
  fireEvent.pointerUp(el, { clientX: x, clientY: 50, pointerId: 1 });
}

function drag(
  el: Element,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
) {
  fireEvent.pointerDown(el, { clientX: fromX, clientY: fromY, pointerId: 2 });
  fireEvent.pointerMove(el, { clientX: toX, clientY: toY, pointerId: 2 });
  fireEvent.pointerUp(el, { clientX: toX, clientY: toY, pointerId: 2 });
}

describe("Paginator 三段点按", () => {
  beforeEach(() => {
    mockLayout();
    // getBoundingClientRect 提供 width 供 zoneOf 计算
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue({
      left: 0,
      top: 0,
      width: 300,
      height: 100,
      right: 300,
      bottom: 100,
      x: 0,
      y: 0,
      toJSON: () => ({}),
    } as DOMRect);
  });
  afterEach(() => vi.restoreAllMocks());

  it("点左侧 1/3 且在第 1 页时请求上一章", async () => {
    const { onRequestChapter } = setup();
    await waitFor(() =>
      expect(screen.getByTestId("paginate-root")).toBeInTheDocument(),
    );
    await waitFor(() => expect(screen.getByText("1 / 2")).toBeInTheDocument());
    tap(screen.getByTestId("paginate-root"), 30);
    expect(document.querySelectorAll(".paginate-layer")).toHaveLength(2);
    await waitFor(() =>
      expect(onRequestChapter).toHaveBeenCalledWith("prev", "last"),
    );
  });

  it("点中间 1/3 触发 onToggleMenu", async () => {
    const { onToggleMenu, onRequestChapter } = setup();
    await waitFor(() => screen.getByText("1 / 2"));
    tap(screen.getByTestId("paginate-root"), 150);
    expect(onToggleMenu).toHaveBeenCalledTimes(1);
    expect(onRequestChapter).not.toHaveBeenCalled();
  });

  it("末页点右侧 1/3 请求下一章", async () => {
    const { onRequestChapter } = setup({ page: 1 });
    await waitFor(() => screen.getByText("2 / 2"));
    tap(screen.getByTestId("paginate-root"), 270);
    expect(document.querySelectorAll(".paginate-layer")).toHaveLength(2);
    await waitFor(() =>
      expect(onRequestChapter).toHaveBeenCalledWith("next", "first"),
    );
  });

  it("中间页点右侧 1/3 直接翻下一页（动画完成后提交页码）", async () => {
    const { onPageChange, onRequestChapter } = setup({ page: 0 });
    await waitFor(() => screen.getByText("1 / 2"));
    tap(screen.getByTestId("paginate-root"), 270);
    expect(onRequestChapter).not.toHaveBeenCalled();
    await waitFor(() => expect(onPageChange).toHaveBeenCalledWith(1, 2), {
      timeout: 2000,
    });
  });

  it("页码指示器渲染且无 pointer-events", async () => {
    setup();
    await waitFor(() => expect(screen.getByText("1 / 2")).toBeInTheDocument());
    const ind = screen.getByText("1 / 2");
    expect(ind.className).toContain("pointer-events-none");
  });

  it("拖动经过中央区域不会切换工具栏", async () => {
    const { onToggleMenu } = setup();
    await waitFor(() => screen.getByText("1 / 2"));
    drag(screen.getByTestId("paginate-root"), 220, 50, 120, 50);
    expect(onToggleMenu).not.toHaveBeenCalled();
  });

  it("横向动画忽略纵向误触", async () => {
    const { onToggleMenu, onPageChange } = setup({ flipStyle: "slide" });
    await waitFor(() => screen.getByText("1 / 2"));
    drag(screen.getByTestId("paginate-root"), 150, 20, 154, 80);
    expect(onToggleMenu).not.toHaveBeenCalled();
    expect(onPageChange).not.toHaveBeenCalledWith(1, 2);
  });

  it("none 模式立即提交页码，不创建动画双层", async () => {
    const { onPageChange } = setup({ flipStyle: "none" });
    await waitFor(() => screen.getByText("1 / 2"));
    tap(screen.getByTestId("paginate-root"), 270);
    expect(onPageChange).toHaveBeenCalledWith(1, 2);
    expect(document.querySelectorAll(".paginate-layer")).toHaveLength(1);
  });
});
