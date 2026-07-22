import type { ChapterIndex } from '@app-types/chapter'
import { ChapterList } from '@components/reader/ChapterList'

interface SidebarProps {
  open: boolean                 // 移动端抽屉是否展开（PC 端忽略）
  chapters: ChapterIndex
  currentNum: number | null
  onSelect: (num: number) => void
  onClose: () => void
}

export function Sidebar({ open, chapters, currentNum, onSelect, onClose }: SidebarProps) {
  return (
    <>
      {/* 移动端遮罩 */}
      <div
        data-testid="sidebar-overlay"
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 z-30 transition-opacity md:hidden ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      <aside
        className={`
          fixed top-0 left-0 h-full w-60 z-40 bg-bg border-r border-border
          flex flex-col transition-transform duration-200
          md:static md:translate-x-0 md:z-auto md:h-auto md:shrink-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-accent font-bold">时序残本</h2>
          <button
            aria-label="关闭目录"
            onClick={onClose}
            className="text-muted hover:text-fg md:hidden"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ChapterList chapters={chapters} currentNum={currentNum} onSelect={onSelect} />
        </div>
      </aside>
    </>
  )
}
