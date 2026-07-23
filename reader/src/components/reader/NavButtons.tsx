interface NavButtonsProps {
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function NavButtons({
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: NavButtonsProps) {
  const cls =
    "px-4 py-2 rounded border border-border text-sm text-fg transition-colors hover:bg-highlight disabled:opacity-40 disabled:cursor-not-allowed";
  return (
    <div className="flex justify-between gap-4 my-8">
      <button className={cls} onClick={onPrev} disabled={!hasPrev}>
        上一章
      </button>
      <button className={cls} onClick={onNext} disabled={!hasNext}>
        下一章
      </button>
    </div>
  );
}
