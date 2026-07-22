import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BottomSheet } from '@components/layout/BottomSheet'

describe('BottomSheet', () => {
  it('open=false 时不渲染内容', () => {
    render(<BottomSheet open={false} title="设置" onClose={() => {}}><div>弹层内容</div></BottomSheet>)
    expect(screen.queryByText('弹层内容')).not.toBeInTheDocument()
  })

  it('open=true 时渲染标题与内容', () => {
    render(<BottomSheet open title="设置" onClose={() => {}}><div>弹层内容</div></BottomSheet>)
    expect(screen.getByText('设置')).toBeInTheDocument()
    expect(screen.getByText('弹层内容')).toBeInTheDocument()
  })

  it('点遮罩触发 onClose', () => {
    const onClose = vi.fn()
    const { container } = render(<BottomSheet open title="设置" onClose={onClose}><div>x</div></BottomSheet>)
    fireEvent.click(container.querySelector('[data-testid="sheet-overlay"]')!)
    expect(onClose).toHaveBeenCalled()
  })
})
