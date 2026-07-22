interface SliderProps {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  formatValue?: (v: number) => string
}

export function Slider({ label, min, max, step, value, onChange, formatValue }: SliderProps) {
  return (
    <label className="block mb-4">
      <span className="flex justify-between text-sm text-fg mb-1">
        <span>{label}</span>
        <span className="text-muted">{formatValue ? formatValue(value) : value}</span>
      </span>
      <input
        type="range"
        role="slider"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </label>
  )
}
