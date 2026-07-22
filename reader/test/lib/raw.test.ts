import { describe, it, expect } from 'vitest'
import { buildFileName, buildChapterUrl, buildIndexUrl } from '@lib/raw'

describe('raw', () => {
  it('buildFileName 拼出仓库文件名', () => {
    expect(buildFileName({ num: 3, title: '雨夜' })).toBe('第3章-雨夜.md')
  })

  it('buildChapterUrl 生成编码后的 raw 地址', () => {
    const url = buildChapterUrl({ num: 1, title: '开始' })
    expect(url).toContain('https://raw.githubusercontent.com/xSmile-art/shixu-canben/main/')
    expect(url).toContain(encodeURI('novels/时序残本/正文/第1章-开始.md'))
  })

  it('buildIndexUrl 指向 chapters-index.json', () => {
    expect(buildIndexUrl()).toBe(
      'https://raw.githubusercontent.com/xSmile-art/shixu-canben/main/chapters-index.json'
    )
  })
})
