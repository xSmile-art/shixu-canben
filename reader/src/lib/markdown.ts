import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: false
})

// markdown → HTML。marked 默认转义内联 HTML，正文为自有内容无注入风险。
// marked v18 的 parse 返回 string | Promise<string>，统一成 Promise 便于调用方。
export async function renderMarkdown(md: string): Promise<string> {
  return marked.parse(md)
}
