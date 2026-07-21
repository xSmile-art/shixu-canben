export function LoadingError({ status, error, onRetry }) {
  if (status === 'loading') {
    return <div className="state loading">加载中…</div>
  }
  if (status === 'error') {
    return (
      <div className="state error">
        <p>{error || '加载失败'}</p>
        <button onClick={onRetry}>重试</button>
      </div>
    )
  }
  return null
}
