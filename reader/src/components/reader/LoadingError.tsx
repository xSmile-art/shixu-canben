import type { LoadStatus } from "@app-types/chapter";

interface LoadingErrorProps {
  status: LoadStatus;
  error: string | null;
  onRetry?: () => void;
}

export function LoadingError({ status, error, onRetry }: LoadingErrorProps) {
  if (status === "loading") {
    return <div className="py-16 text-center text-muted">加载中…</div>;
  }
  if (status === "error") {
    return (
      <div className="py-16 text-center">
        <p className="text-fg mb-4">{error ?? "加载失败"}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded bg-accent text-bg text-sm hover:opacity-90"
          >
            重试
          </button>
        )}
      </div>
    );
  }
  return null;
}
