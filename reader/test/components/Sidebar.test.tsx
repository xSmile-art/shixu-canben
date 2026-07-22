import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '@components/layout/Sidebar'

const chapters = [{ num: 1, title: '开始' }]

describe('Sidebar', () => {
  it('渲染书名与章节列表', () => {
    render(<Sidebar open={false} chapters={chapters} currentNum={1} onSelect={() => {}} onClose={() => {}} />)
    expect(screen.getByText('时序残本')).toBeInTheDocument()
    expect(screen.getByText(/开始/)).toBeInTheDocument()
  })

  it('点关闭按钮触发 onClose', () => {
    const onClose = vi.fn()
    render(<Sidebar open chapters={chapters} currentNum={1} onSelect={() => {}} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('关闭目录'))
    expect(onClose).toHaveBeenCalled()
  })

  it('点遮罩触发 onClose', () => {
    const onClose = vi.fn()
    const { container } = render(<Sidebar open chapters={chapters} currentNum={1} onSelect={() => {}} onClose={onClose} />)
    fireEvent.click(container.querySelector('[data-testid="sidebar-overlay"]')!)
    expect(onClose).toHaveBeenCalled()
  })
})
