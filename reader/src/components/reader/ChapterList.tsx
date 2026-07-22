import type { ChapterIndex } from '@app-types/chapter'

interface ChapterListProps {
  chapters: ChapterIndex
  currentNum: number | null
  onSelect: (num: number) => void
}

export function ChapterList({ chapters, currentNum, onSelect }: ChapterListProps) {
  return (
    <nav aria-label="章节目录" className="overflow-y-auto">
      <ul>
        {chapters.map(ch => {
          const active = ch.num === currentNum
          return (
            <li key={ch.num}>
              <button
                onClick={() => onSelect(ch.num)}
                className={`w-full text-left px-4 py-2 text-sm truncate transition-colors ${
                  active
                    ? 'bg-highlight text-accent font-medium'
                    : 'text-muted hover:bg-highlight hover:text-fg'
                }`}
              >
                第{ch.num}章 {ch.title}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
