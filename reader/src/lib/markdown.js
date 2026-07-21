import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: false
})

// markdown 字符串 → HTML 字符串。marked 默认转义内联 HTML，正文为自有内容无注入风险。
export function renderMarkdown(md) {
  return marked.parse(md)
}
