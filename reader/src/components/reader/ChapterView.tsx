import type { Chapter, LoadStatus } from '@app-types/chapter'
import type { ReadingSettings } from '@app-types/settings'
import { DEFAULT_SETTINGS } from '@app-types/settings'
import { LoadingError } from './LoadingError'

// settings 可选：旧 App.jsx 过渡期不传也能编译/渲染（用默认值），后续任务起由 App 正式传入。
interface ChapterViewProps {
  chapter: Chapter | null
  status: LoadStatus
  error: string | null
  html: string
  settings?: ReadingSettings
  onRetry?: () => void
}

const FONT_FAMILY_VAR: Record<ReadingSettings['fontFamily'], string> = {
  serif: 'var(--font-serif)',
  sans: 'var(--font-sans)',
  kai: 'var(--font-kai)'
}

export function ChapterView({ chapter, status, error, html, settings = DEFAULT_SETTINGS, onRetry }: ChapterViewProps) {
  return (
    <article
      className="mx-auto px-4 text-fg"
      style={{ maxWidth: settings.contentWidth }}
    >
      <LoadingError status={status} error={error} onRetry={onRetry} />
      {status === 'success' && chapter && (
        <>
          <h1
            className="text-accent font-bold mb-6"
            style={{ fontSize: `calc(${settings.fontSize}px + 6px)` }}
          >
            第{chapter.num}章 {chapter.title}
          </h1>
          <div
            className={`chapter-body prose max-w-none ${settings.paragraphIndent ? '' : 'no-indent'}`}
            style={{
              fontSize: settings.fontSize,
              lineHeight: settings.lineHeight,
              letterSpacing: settings.letterSpacing,
              fontFamily: FONT_FAMILY_VAR[settings.fontFamily]
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </>
      )}
    </article>
  )
}
