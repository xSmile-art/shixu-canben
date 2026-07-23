import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChapterView } from "@components/reader/ChapterView";
import { DEFAULT_SETTINGS } from "@app-types/settings";

const chapter = { num: 1, title: "开始" };

describe("ChapterView", () => {
  it("success 时渲染标题与正文 HTML", () => {
    render(
      <ChapterView
        chapter={chapter}
        status="success"
        error={null}
        html="<p>正文内容</p>"
        settings={DEFAULT_SETTINGS}
      />,
    );
    expect(screen.getByText(/第1章/)).toBeInTheDocument();
    expect(screen.getByText("正文内容")).toBeInTheDocument();
  });

  it("不传 settings 时用默认值正常渲染", () => {
    render(
      <ChapterView
        chapter={chapter}
        status="success"
        error={null}
        html="<p>默认渲染</p>"
      />,
    );
    expect(screen.getByText("默认渲染")).toBeInTheDocument();
  });

  it("正文容器应用字号与行距内联样式", () => {
    const { container } = render(
      <ChapterView
        chapter={chapter}
        status="success"
        error={null}
        html="<p>x</p>"
        settings={{ ...DEFAULT_SETTINGS, fontSize: 22, lineHeight: 2.2 }}
      />,
    );
    const body = container.querySelector(".chapter-body") as HTMLElement;
    expect(body.style.fontSize).toBe("22px");
    expect(body.style.lineHeight).toBe("2.2");
  });

  it("paragraphIndent=false 时加 no-indent 类", () => {
    const { container } = render(
      <ChapterView
        chapter={chapter}
        status="success"
        error={null}
        html="<p>x</p>"
        settings={{ ...DEFAULT_SETTINGS, paragraphIndent: false }}
      />,
    );
    expect(container.querySelector(".chapter-body")!.className).toContain(
      "no-indent",
    );
  });

  it("error 时显示错误与重试", () => {
    render(
      <ChapterView
        chapter={chapter}
        status="error"
        error="网络错误"
        html=""
        settings={DEFAULT_SETTINGS}
        onRetry={() => {}}
      />,
    );
    expect(screen.getByText("网络错误")).toBeInTheDocument();
    expect(screen.getByText("重试")).toBeInTheDocument();
  });

  it("pageMode=horizontal 时渲染翻页按钮（Paginator）", () => {
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(60);
    render(
      <ChapterView
        chapter={chapter}
        status="success"
        error={null}
        html="<p>x</p><p>y</p>"
        settings={{ ...DEFAULT_SETTINGS, pageMode: "horizontal" }}
        page={0}
        onPageChange={() => {}}
      />,
    );
    expect(screen.getByLabelText("下一页")).toBeInTheDocument();
    vi.restoreAllMocks();
  });

  it("pageMode=scroll 时渲染滚动正文（无翻页按钮）", () => {
    render(
      <ChapterView
        chapter={chapter}
        status="success"
        error={null}
        html="<p>x</p>"
        settings={{ ...DEFAULT_SETTINGS, pageMode: "scroll" }}
      />,
    );
    expect(screen.queryByLabelText("下一页")).not.toBeInTheDocument();
  });
});
