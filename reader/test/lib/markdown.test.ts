import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '@lib/markdown'

describe('markdown', () => {
  it('渲染标题与段落', async () => {
    const html = await renderMarkdown('# 标题\n\n正文段落')
    expect(html).toContain('<h1>')
    expect(html).toContain('标题')
    expect(html).toContain('<p>正文段落</p>')
  })

  it('渲染 GFM 表格语法', async () => {
    const html = await renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('<table>')
  })
})
