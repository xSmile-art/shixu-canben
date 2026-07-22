import type { ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div data-testid="sheet-overlay" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] bg-bg rounded-t-2xl border-t border-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-fg font-medium">{title}</h3>
          <button aria-label="关闭" onClick={onClose} className="text-muted hover:text-fg">✕</button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
