import { describe, it, expect } from 'vitest'
import { buildFileName, buildChapterUrl, buildIndexUrl } from '@lib/raw'

describe('raw', () => {
  it('buildFileName 拼出仓库文件名', () => {
    expect(buildFileName({ num: 3, title: '雨夜' })).toBe('第3章-雨夜.md')
  })

  it('buildChapterUrl 生成编码后的 raw 地址', () => {
    const url = buildChapterUrl({ num: 1, title: '开始' })
    expect(url).toContain('https://raw.githubusercontent.com/xSmile-art/shixu-canben/main/')
    expect(url).toContain('novels/%E6%97%B6%E5%BA%8F%E6%AE%8B%E6%9C%AC/')
    expect(url).toContain(encodeURIComponent('第1章-开始.md'))
  })

  it('标题含 ? # 等特殊字符时 URL 不断链', () => {
    const url = buildChapterUrl({ num: 5, title: '大结局?' })
    expect(url).not.toContain('?')
    expect(url).toContain(encodeURIComponent('第5章-大结局?.md'))
  })

  it('buildIndexUrl 指向 chapters-index.json', () => {
    expect(buildIndexUrl()).toBe(
      'https://raw.githubusercontent.com/xSmile-art/shixu-canben/main/chapters-index.json'
    )
  })
})
