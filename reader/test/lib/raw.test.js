import { describe, it, expect } from 'vitest'
import { buildIndexUrl, buildChapterUrl, buildFileName } from '../../src/lib/raw.js'

describe('buildFileName', () => {
  it('把章号与标题拼成 文件名', () => {
    expect(buildFileName({ num: '001', title: '草稿层' })).toBe('第001章-草稿层.md')
  })
  it('标题含数字也原样拼接', () => {
    expect(buildFileName({ num: '010', title: '定调' })).toBe('第010章-定调.md')
  })
})

describe('buildChapterUrl', () => {
  it('生成中文路径被 encodeURI 编码的 raw URL', () => {
    const url = buildChapterUrl({ num: '001', title: '草稿层' })
    expect(url).toBe(
      'https://raw.githubusercontent.com/xSmile-art/shixu-canben/main/novels/%E6%97%B6%E5%BA%8F%E6%AE%8B%E6%9C%AC/%E6%AD%A3%E6%96%87/%E7%AC%AC001%E7%AB%A0-%E8%8D%89%E7%A8%BF%E5%B1%82.md'
    )
  })
  it('章号 010 也能正确编码', () => {
    const url = buildChapterUrl({ num: '010', title: '定调' })
    expect(url).toBe(
      'https://raw.githubusercontent.com/xSmile-art/shixu-canben/main/novels/%E6%97%B6%E5%BA%8F%E6%AE%8B%E6%9C%AC/%E6%AD%A3%E6%96%87/%E7%AC%AC010%E7%AB%A0-%E5%AE%9A%E8%B0%83.md'
    )
  })
})

describe('buildIndexUrl', () => {
  it('返回索引 raw URL', () => {
    expect(buildIndexUrl()).toBe(
      'https://raw.githubusercontent.com/xSmile-art/shixu-canben/main/chapters-index.json'
    )
  })
})
