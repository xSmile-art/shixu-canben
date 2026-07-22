import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@components/ui/Button'
import { Slider } from '@components/ui/Slider'
import { ColorPicker } from '@components/ui/ColorPicker'
import { Tabs } from '@components/ui/Tabs'

describe('Button', () => {
  it('点击触发 onClick，disabled 时不触发', () => {
    const onClick = vi.fn()
    const { rerender } = render(<Button onClick={onClick}>确定</Button>)
    fireEvent.click(screen.getByText('确定'))
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(<Button onClick={onClick} disabled>确定</Button>)
    fireEvent.click(screen.getByText('确定'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('Slider', () => {
  it('拖动触发 onChange 并显示当前值', () => {
    const onChange = vi.fn()
    render(<Slider label="字号" min={14} max={24} step={1} value={18} onChange={onChange} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '20' } })
    expect(onChange).toHaveBeenCalledWith(20)
    expect(screen.getByText('字号')).toBeInTheDocument()
  })
})

describe('ColorPicker', () => {
  it('选择颜色触发 onChange', () => {
    const onChange = vi.fn()
    render(<ColorPicker label="背景色" value="#ffffff" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('背景色'), { target: { value: '#123456' } })
    expect(onChange).toHaveBeenCalledWith('#123456')
  })
})

describe('Tabs', () => {
  const twoTabs = [
    { key: 'a', label: '主题', content: <div>主题面板</div> },
    { key: 'b', label: '排版', content: <div>排版面板</div> }
  ]

  it('非受控：切换 Tab 显示对应面板', () => {
    render(<Tabs tabs={twoTabs} />)
    expect(screen.getByText('主题面板')).toBeInTheDocument()
    fireEvent.click(screen.getByText('排版'))
    expect(screen.getByText('排版面板')).toBeInTheDocument()
    expect(screen.queryByText('主题面板')).not.toBeInTheDocument()
  })

  it('受控：activeKey 由父组件决定', () => {
    const { rerender } = render(<Tabs activeKey="a" onChange={() => {}} tabs={twoTabs} />)
    expect(screen.getByText('主题面板')).toBeInTheDocument()
    rerender(<Tabs activeKey="b" onChange={() => {}} tabs={twoTabs} />)
    expect(screen.getByText('排版面板')).toBeInTheDocument()
  })

  it('受控：点 Tab 触发 onChange 而不自行切换', () => {
    const onChange = vi.fn()
    render(<Tabs activeKey="a" onChange={onChange} tabs={twoTabs} />)
    fireEvent.click(screen.getByText('排版'))
    expect(onChange).toHaveBeenCalledWith('b')
    expect(screen.getByText('主题面板')).toBeInTheDocument()
  })
})
