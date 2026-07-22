import { describe, it, expect } from 'vitest'
import { splitIntoPages } from '@lib/paginate'

describe('splitIntoPages', () => {
  const heights = [100, 200, 100, 300, 100]

  it('按页高累计切分，块顺序不变', () => {
    const pages = splitIntoPages(heights, 300)
    expect(pages.length).toBeGreaterThan(1)
    expect(pages.flat()).toEqual([0, 1, 2, 3, 4])
  })

  it('单个块超高时独占一页', () => {
    expect(splitIntoPages([500, 100], 300)).toEqual([[0], [1]])
  })

  it('空数组返回空', () => {
    expect(splitIntoPages([], 300)).toEqual([])
  })
})
