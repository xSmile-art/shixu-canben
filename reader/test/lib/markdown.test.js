import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '../../src/lib/markdown.js'

describe('renderMarkdown', () => {
  it('把一级标题 markdown 转成 h1 HTML', () => {
    expect(renderMarkdown('# 第一章 草稿层')).toBe('<h1>第一章 草稿层</h1>\n')
  })
  it('把段落转成 p', () => {
    expect(renderMarkdown('后半夜的跨海桥没什么人。')).toBe('<p>后半夜的跨海桥没什么人。</p>\n')
  })
  it('空行分隔产生多个段落', () => {
    const src = '第一段。\n\n第二段。'
    expect(renderMarkdown(src)).toBe('<p>第一段。</p>\n<p>第二段。</p>\n')
  })
})

// 注：不测内联 HTML 转义。marked 12 默认保留内联 HTML 原样（不转义），
// 但正文为作者自有 markdown，无第三方注入风险，无需 sanitize（YAGNI）。

