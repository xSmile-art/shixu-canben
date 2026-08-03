import { useId, useState, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem { key: string; label: string; content: ReactNode }
interface TabsProps {
  tabs: TabItem[];
  initialKey?: string;
  activeKey?: string;
  onChange?: (key: string) => void;
}

export function Tabs({ tabs, initialKey, activeKey, onChange }: TabsProps) {
  const [inner, setInner] = useState(initialKey ?? tabs[0]?.key);
  const active = activeKey ?? inner;
  const baseId = useId();
  const handleSelect = (key: string) => {
    if (activeKey === undefined) setInner(key);
    onChange?.(key);
  };
  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const delta = event.key === "ArrowRight" ? 1 : -1;
    const next = (index + delta + tabs.length) % tabs.length;
    handleSelect(tabs[next].key);
    document.getElementById(`${baseId}-tab-${tabs[next].key}`)?.focus();
  };
  const current = tabs.find((tab) => tab.key === active);

  return (
    <div>
      <div role="tablist" className="flex gap-1 border-b border-border mb-4">
        {tabs.map((tab, index) => (
          <button
            id={`${baseId}-tab-${tab.key}`}
            key={tab.key}
            role="tab"
            aria-selected={tab.key === active}
            aria-controls={`${baseId}-panel-${tab.key}`}
            tabIndex={tab.key === active ? 0 : -1}
            onKeyDown={(event) => onKeyDown(event, index)}
            onClick={() => handleSelect(tab.key)}
            className={`px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${
              tab.key === active
                ? "border-accent text-accent font-medium"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id={`${baseId}-panel-${active}`}
        role="tabpanel"
        aria-labelledby={`${baseId}-tab-${active}`}
      >
        {current?.content}
      </div>
    </div>
  );
}
