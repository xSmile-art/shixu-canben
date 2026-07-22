interface ColorPickerProps {
  label: string
  value: string
  onChange: (v: string) => void
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <label className="flex items-center justify-between mb-3 gap-3">
      <span className="text-sm text-fg">{label}</span>
      <input
        type="color"
        aria-label={label}
        value={toHex6(value)}
        onChange={e => onChange(e.target.value)}
        className="w-10 h-8 rounded border border-border cursor-pointer bg-transparent"
      />
    </label>
  )
}

// input[type=color] 只接受 #rrggbb；rgba 等格式回退黑色避免报错
function toHex6(v: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#000000'
}
