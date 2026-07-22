import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeCustomizer } from '@components/settings/ThemeCustomizer'
import { PRESET_THEMES } from '@themes/presets'

describe('ThemeCustomizer', () => {
  it('渲染 6 个颜色选择器', () => {
    render(<ThemeCustomizer theme={PRESET_THEMES[0]} onChange={() => {}} onBack={() => {}} />)
    expect(screen.getByLabelText('背景色')).toBeInTheDocument()
    expect(screen.getByLabelText('文字色')).toBeInTheDocument()
    expect(screen.getByLabelText('强调色')).toBeInTheDocument()
    expect(screen.getByLabelText('次要文字')).toBeInTheDocument()
    expect(screen.getByLabelText('边框色')).toBeInTheDocument()
    expect(screen.getByLabelText('选中高亮')).toBeInTheDocument()
  })

  it('改背景色触发 onChange("bg", value)', () => {
    const onChange = vi.fn()
    render(<ThemeCustomizer theme={PRESET_THEMES[0]} onChange={onChange} onBack={() => {}} />)
    fireEvent.change(screen.getByLabelText('背景色'), { target: { value: '#123456' } })
    expect(onChange).toHaveBeenCalledWith('bg', '#123456')
  })

  it('点返回触发 onBack', () => {
    const onBack = vi.fn()
    render(<ThemeCustomizer theme={PRESET_THEMES[0]} onChange={() => {}} onBack={onBack} />)
    fireEvent.click(screen.getByText('返回'))
    expect(onBack).toHaveBeenCalled()
  })
})
