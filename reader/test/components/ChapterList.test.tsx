import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChapterList } from '@components/reader/ChapterList'

const chapters = [
  { num: 1, title: '开始' },
  { num: 2, title: '雨夜' },
  { num: 3, title: '归途' }
]

describe('ChapterList', () => {
  it('渲染全部章节', () => {
    render(<ChapterList chapters={chapters} currentNum={2} onSelect={() => {}} />)
    expect(screen.getByText(/开始/)).toBeInTheDocument()
    expect(screen.getByText(/雨夜/)).toBeInTheDocument()
    expect(screen.getByText(/归途/)).toBeInTheDocument()
  })

  it('当前章节带 active 标记', () => {
    render(<ChapterList chapters={chapters} currentNum={2} onSelect={() => {}} />)
    const activeBtn = screen.getByText(/雨夜/).closest('button')!
    expect(activeBtn.className).toMatch(/bg-highlight|text-accent/)
  })

  it('点击章节触发 onSelect', () => {
    const onSelect = vi.fn()
    render(<ChapterList chapters={chapters} currentNum={1} onSelect={onSelect} />)
    fireEvent.click(screen.getByText(/归途/))
    expect(onSelect).toHaveBeenCalledWith(3)
  })
})
