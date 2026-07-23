import { Marked } from "marked";

const m = new Marked({
  gfm: true,
  breaks: false,
});

// markdown → HTML。项目假设正文为受信内容，未启用 sanitize。
// marked v18 的 parse 返回 string | Promise<string>，统一成 Promise 便于调用方。
export async function renderMarkdown(md: string): Promise<string> {
  return m.parse(md);
}
