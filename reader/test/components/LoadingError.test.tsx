import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LoadingError } from "@components/reader/LoadingError";

describe("LoadingError", () => {
  it("loading 时显示加载提示", () => {
    render(<LoadingError status="loading" error={null} />);
    expect(screen.getByText("加载中…")).toBeInTheDocument();
  });

  it("error 时显示错误文本与重试按钮", () => {
    render(<LoadingError status="error" error="网络错误" onRetry={() => {}} />);
    expect(screen.getByText("网络错误")).toBeInTheDocument();
    expect(screen.getByText("重试")).toBeInTheDocument();
  });

  it("点重试触发 onRetry", () => {
    const onRetry = vi.fn();
    render(<LoadingError status="error" error="失败" onRetry={onRetry} />);
    fireEvent.click(screen.getByText("重试"));
    expect(onRetry).toHaveBeenCalled();
  });

  it("error 但无 onRetry 时不显示重试按钮", () => {
    render(<LoadingError status="error" error="失败" />);
    expect(screen.queryByText("重试")).not.toBeInTheDocument();
  });

  it("success 时不渲染任何内容", () => {
    const { container } = render(
      <LoadingError status="success" error={null} />,
    );
    expect(container.firstChild).toBeNull();
  });
});
