import { LoadingError } from './LoadingError.jsx'

export function ChapterView({ chapter, status, error, html, onRetry }) {
  return (
    <article className="chapter-view">
      <LoadingError status={status} error={error} onRetry={onRetry} />
      {status === 'success' && chapter && (
        <>
          <h1 className="chapter-title">第{chapter.num}章 {chapter.title}</h1>
          <div className="chapter-body" dangerouslySetInnerHTML={{ __html: html }} />
        </>
      )}
    </article>
  )
}
