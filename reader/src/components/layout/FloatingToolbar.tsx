import type { ReactNode } from 'react'

export type ToolbarPanel = 'theme' | 'typography' | 'reading' | null

interface FloatingToolbarProps {
  activePanel: ToolbarPanel
  onOpenPanel: (p: Exclude<ToolbarPanel, null>) => void
  onClosePanel: () => void
  onBackToTop: () => void
  children: ReactNode   // SettingsPanel
}

const BUTTONS: { key: Exclude<ToolbarPanel, null>; label: string; icon: string }[] = [
  { key: 'theme', label: '主题', icon: '🎨' },
  { key: 'typography', label: '排版', icon: 'Aa' },
  { key: 'reading', label: '阅读', icon: '⚙' }
]

export function FloatingToolbar({ activePanel, onOpenPanel, onClosePanel, onBackToTop, children }: FloatingToolbarProps) {
  return (
    <div className="hidden md:block">
      {/* 打开面板时的全屏透明层：点外部关闭（设计要求） */}
      {activePanel && (
        <div
          data-testid="toolbar-backdrop"
          onClick={onClosePanel}
          className="fixed inset-0 z-30"
        />
      )}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex items-center gap-2">
        {activePanel && (
          <div className="w-80 max-h-[70vh] overflow-y-auto bg-bg border border-border rounded-lg shadow-lg p-4">
            {children}
          </div>
        )}
        <div className="flex flex-col gap-1 bg-bg border border-border rounded-full shadow-lg p-1.5">
          {BUTTONS.map(b => (
            <button
              key={b.key}
              aria-label={b.label}
              title={b.label}
              onClick={() => (activePanel === b.key ? onClosePanel() : onOpenPanel(b.key))}
              className={`w-10 h-10 rounded-full text-sm flex items-center justify-center transition-colors ${
                activePanel === b.key ? 'bg-highlight text-accent' : 'text-muted hover:bg-highlight hover:text-fg'
              }`}
            >
              {b.icon}
            </button>
          ))}
          <button
            aria-label="回到顶部"
            title="回到顶部"
            onClick={onBackToTop}
            className="w-10 h-10 rounded-full text-sm flex items-center justify-center text-muted hover:bg-highlight hover:text-fg transition-colors"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
