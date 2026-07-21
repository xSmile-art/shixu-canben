import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChapterList } from '../../src/components/ChapterList.jsx'
import { NavButtons } from '../../src/components/NavButtons.jsx'

describe('ChapterList', () => {
  const CHAPTERS = [
    { num: '001', title: '草稿层' },
    { num: '002', title: '十秒' }
  ]
  it('渲染所有章节标题', () => {
    render(<ChapterList chapters={CHAPTERS} currentNum="001" onSelect={() => {}} />)
    expect(screen.getByText('第001章 草稿层')).toBeTruthy()
    expect(screen.getByText('第002章 十秒')).toBeTruthy()
  })
  it('点击章节触发 onSelect(num)', () => {
    const onSelect = vi.fn()
    render(<ChapterList chapters={CHAPTERS} currentNum="001" onSelect={onSelect} />)
    fireEvent.click(screen.getByText('第002章 十秒'))
    expect(onSelect).toHaveBeenCalledWith('002')
  })
  it('当前章有高亮 class', () => {
    render(<ChapterList chapters={CHAPTERS} currentNum="002" onSelect={() => {}} />)
    const item = screen.getByText('第002章 十秒').closest('li')
    expect(item.className).toContain('active')
  })
})

describe('NavButtons', () => {
  it('上一章/下一章按钮存在且触发回调', () => {
    const onPrev = vi.fn()
    const onNext = vi.fn()
    render(<NavButtons hasPrev={true} hasNext={true} onPrev={onPrev} onNext={onNext} />)
    fireEvent.click(screen.getByText('上一章'))
    expect(onPrev).toHaveBeenCalled()
    fireEvent.click(screen.getByText('下一章'))
    expect(onNext).toHaveBeenCalled()
  })
  it('hasPrev=false 时上一章按钮 disabled', () => {
    render(<NavButtons hasPrev={false} hasNext={true} onPrev={() => {}} onNext={() => {}} />)
    expect(screen.getByText('上一章').disabled).toBe(true)
  })
})
