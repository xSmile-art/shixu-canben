import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { NavButtons } from "@components/reader/NavButtons";

describe("NavButtons", () => {
  it("hasPrev/hasNext 为 false 时按钮禁用", () => {
    render(
      <NavButtons
        hasPrev={false}
        hasNext={false}
        onPrev={() => {}}
        onNext={() => {}}
      />,
    );
    expect(screen.getByText("上一章")).toBeDisabled();
    expect(screen.getByText("下一章")).toBeDisabled();
  });

  it("点击触发回调", () => {
    const onPrev = vi.fn();
    const onNext = vi.fn();
    render(<NavButtons hasPrev hasNext onPrev={onPrev} onNext={onNext} />);
    fireEvent.click(screen.getByText("上一章"));
    fireEvent.click(screen.getByText("下一章"));
    expect(onPrev).toHaveBeenCalled();
    expect(onNext).toHaveBeenCalled();
  });
});
