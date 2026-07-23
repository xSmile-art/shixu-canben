import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Paginator } from "@components/reader/Paginator";

// 让容器 100px 高；每个块在 measureBlock 里量出 40px 高 → 3 块分两页（[2块][1块]）。
function mockLayout() {
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(100);
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(300);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(40);
}

const html = "<p>第一段</p><p>第二段</p><p>第三段</p>";

describe("Paginator", () => {
  beforeEach(mockLayout);
  afterEach(() => vi.restoreAllMocks());

  it("按容器高度切分出多页并显示页码", async () => {
    render(
      <Paginator
        html={html}
        mode="horizontal"
        page={0}
        onPageChange={() => {}}
      />,
    );
    await waitFor(() => expect(screen.getByText("1 / 2")).toBeInTheDocument());
  });

  it("左右翻页：点下一页更新页码并回调", async () => {
    const onPageChange = vi.fn();
    render(
      <Paginator
        html={html}
        mode="horizontal"
        page={0}
        onPageChange={onPageChange}
      />,
    );
    await waitFor(() => expect(screen.getByText("1 / 2")).toBeInTheDocument());
    fireEvent.click(screen.getByLabelText("下一页"));
    expect(onPageChange).toHaveBeenCalledWith(1, 2);
  });

  it("第一页时上一页禁用", async () => {
    render(
      <Paginator
        html={html}
        mode="horizontal"
        page={0}
        onPageChange={() => {}}
      />,
    );
    await waitFor(() => expect(screen.getByText("1 / 2")).toBeInTheDocument());
    expect(screen.getByLabelText("上一页")).toBeDisabled();
  });
});
