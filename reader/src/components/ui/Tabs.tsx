import { useState, type ReactNode } from "react";

export interface TabItem {
  key: string;
  label: string;
  content: ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  initialKey?: string; // 非受控：初始激活项
  activeKey?: string; // 受控：由父组件决定激活项
  onChange?: (key: string) => void;
}

// 受控（传 activeKey + onChange）用于 PC 工具条点图标让面板跳对应 Tab；非受控（只传 initialKey）自管。
export function Tabs({ tabs, initialKey, activeKey, onChange }: TabsProps) {
  const [inner, setInner] = useState(initialKey ?? tabs[0]?.key);
  const active = activeKey ?? inner;

  const handleSelect = (key: string) => {
    if (activeKey === undefined) setInner(key);
    onChange?.(key);
  };

  const current = tabs.find((t) => t.key === active);
  return (
    <div>
      <div className="flex gap-1 border-b border-border mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => handleSelect(t.key)}
            className={`px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${
              t.key === active
                ? "border-accent text-accent font-medium"
                : "border-transparent text-muted hover:text-fg"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{current?.content}</div>
    </div>
  );
}
