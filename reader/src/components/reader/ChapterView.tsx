import type { Chapter, LoadStatus } from "@app-types/chapter";
import type { ReadingSettings } from "@app-types/settings";
import { DEFAULT_SETTINGS } from "@app-types/settings";
import { LoadingError } from "./LoadingError";
import { Paginator } from "./Paginator";

interface ChapterViewProps {
  chapter: Chapter | null;
  status: LoadStatus;
  error: string | null;
  html: string;
  settings?: ReadingSettings;
  onRetry?: () => void;
  page?: number;
  pendingPage?: number | "last" | null;
  onPageChange?: (page: number, total: number) => void;
  onToggleMenu?: () => void;
  onRequestChapter?: (dir: "prev" | "next", land: "first" | "last") => void;
  keyboardCommand?: { id: number; dir: "prev" | "next" } | null;
}

const FONT_FAMILY_VAR: Record<ReadingSettings["fontFamily"], string> = {
  serif: "var(--font-serif)",
  sans: "var(--font-sans)",
  kai: "var(--font-kai)",
};

export function ChapterView({
  chapter,
  status,
  error,
  html,
  settings = DEFAULT_SETTINGS,
  onRetry,
  page,
  pendingPage = null,
  onPageChange,
  onToggleMenu,
  onRequestChapter,
  keyboardCommand = null,
}: ChapterViewProps) {
  const bodyStyle = {
    fontSize: settings.fontSize,
    lineHeight: settings.lineHeight,
    letterSpacing: settings.letterSpacing,
    fontFamily: FONT_FAMILY_VAR[settings.fontFamily],
  };
  const bodyClass = `chapter-body prose max-w-none ${
    settings.paragraphIndent ? "" : "no-indent"
  }`;

  return (
    <article
      className={`mx-auto text-fg flex flex-col ${
        settings.pageMode === "scroll" ? "px-4" : "h-full px-4"
      }`}
      style={{ maxWidth: settings.contentWidth }}
    >
      <LoadingError status={status} error={error} onRetry={onRetry} />
      {status === "success" && chapter && (
        <>
          <h1
            className="text-accent font-bold shrink-0 py-3"
            style={{ fontSize: `calc(${settings.fontSize}px + 6px)` }}
          >
            第{chapter.num}章 {chapter.title}
          </h1>
          {settings.pageMode === "scroll" ? (
            <div
              className={bodyClass}
              style={bodyStyle}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          ) : (
            <div className="flex-1 min-h-0 pb-2">
              <Paginator
                html={html}
                flipStyle={settings.flipStyle}
                page={page ?? 0}
                pendingPage={pendingPage}
                onPageChange={onPageChange ?? (() => {})}
                onToggleMenu={onToggleMenu ?? (() => {})}
                onRequestChapter={onRequestChapter ?? (() => {})}
                keyboardCommand={keyboardCommand}
                className={bodyClass}
                style={bodyStyle}
              />
            </div>
          )}
        </>
      )}
    </article>
  );
}
