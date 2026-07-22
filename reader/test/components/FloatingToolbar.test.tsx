import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FloatingToolbar } from '@components/layout/FloatingToolbar'

describe('FloatingToolbar', () => {
  it('渲染主题/排版/阅读/回到顶部按钮', () => {
    render(
      <FloatingToolbar activePanel={null} onOpenPanel={() => {}} onClosePanel={() => {}} onBackToTop={() => {}}>
        <div>面板内容</div>
      </FloatingToolbar>
    )
    expect(screen.getByLabelText('主题')).toBeInTheDocument()
    expect(screen.getByLabelText('排版')).toBeInTheDocument()
    expect(screen.getByLabelText('阅读')).toBeInTheDocument()
    expect(screen.getByLabelText('回到顶部')).toBeInTheDocument()
  })

  it('点主题按钮触发 onOpenPanel("theme")', () => {
    const onOpenPanel = vi.fn()
    render(
      <FloatingToolbar activePanel={null} onOpenPanel={onOpenPanel} onClosePanel={() => {}} onBackToTop={() => {}}>
        <div />
      </FloatingToolbar>
    )
    fireEvent.click(screen.getByLabelText('主题'))
    expect(onOpenPanel).toHaveBeenCalledWith('theme')
  })

  it('activePanel 非空时显示 children 面板', () => {
    render(
      <FloatingToolbar activePanel="theme" onOpenPanel={() => {}} onClosePanel={() => {}} onBackToTop={() => {}}>
        <div>设置面板体</div>
      </FloatingToolbar>
    )
    expect(screen.getByText('设置面板体')).toBeInTheDocument()
  })

  it('点回到顶部触发 onBackToTop', () => {
    const onBackToTop = vi.fn()
    render(
      <FloatingToolbar activePanel={null} onOpenPanel={() => {}} onClosePanel={() => {}} onBackToTop={onBackToTop}>
        <div />
      </FloatingToolbar>
    )
    fireEvent.click(screen.getByLabelText('回到顶部'))
    expect(onBackToTop).toHaveBeenCalled()
  })

  it('打开面板时点外部遮罩触发 onClosePanel', () => {
    const onClosePanel = vi.fn()
    render(
      <FloatingToolbar activePanel="theme" onOpenPanel={() => {}} onClosePanel={onClosePanel} onBackToTop={() => {}}>
        <div>面板体</div>
      </FloatingToolbar>
    )
    fireEvent.click(screen.getByTestId('toolbar-backdrop'))
    expect(onClosePanel).toHaveBeenCalled()
  })

  it('关闭状态不渲染遮罩', () => {
    render(
      <FloatingToolbar activePanel={null} onOpenPanel={() => {}} onClosePanel={() => {}} onBackToTop={() => {}}>
        <div />
      </FloatingToolbar>
    )
    expect(screen.queryByTestId('toolbar-backdrop')).not.toBeInTheDocument()
  })
})
