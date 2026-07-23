import { useState, useEffect, useCallback, useRef } from "react";
import { useChapters } from "@hooks/useChapters";
import { useChapter } from "@hooks/useChapter";
import { useReadingProgress } from "@hooks/useReadingProgress";
import { useTheme } from "@hooks/useTheme";
import { useReadingSettings } from "@hooks/useReadingSettings";
import { Sidebar } from "@components/layout/Sidebar";
import {
  FloatingToolbar,
  type ToolbarPanel,
} from "@components/layout/FloatingToolbar";
import { BottomSheet } from "@components/layout/BottomSheet";
import { ChapterView } from "@components/reader/ChapterView";
import { NavButtons } from "@components/reader/NavButtons";
import {
  SettingsPanel,
  type SettingsTabKey,
} from "@components/settings/SettingsPanel";

function readUrlNum(): number | null {
  const v = new URLSearchParams(window.location.search).get("ch");
  const n = v ? Number(v) : NaN;
  return Number.isFinite(n) && n > 0 ? n : null;
}
function writeUrlNum(num: number): void {
  const url = new URL(window.location.href);
  url.searchParams.set("ch", String(num));
  window.history.replaceState(null, "", url);
}

// 移动端 BottomSheet 标题随 Tab 变化
const SHEET_TAB_TITLE: Record<SettingsTabKey, string> = {
  theme: "主题",
  typography: "排版",
  reading: "阅读",
};

// 移动端底部导航按钮定义（与 PC FloatingToolbar 共享图标风格）
const MOBILE_NAV_BUTTONS: {
  key: string;
  label: string;
  icon: string;
  action: "catalog" | "settings";
  tab?: SettingsTabKey;
}[] = [
  { key: "catalog", label: "目录", icon: "☰", action: "catalog" },
  { key: "theme", label: "主题", icon: "🎨", action: "settings", tab: "theme" },
  {
    key: "typography",
    label: "排版",
    icon: "Aa",
    action: "settings",
    tab: "typography",
  },
  {
    key: "reading",
    label: "阅读",
    icon: "⚙",
    action: "settings",
    tab: "reading",
  },
];

export default function App() {
  const {
    chapters,
    status: listStatus,
    error: listError,
    retry: retryList,
  } = useChapters();
  const progress = useReadingProgress();
  const { theme, setTheme, customizeColor } = useTheme();
  const {
    settings,
    update: updateSettings,
    reset: resetSettings,
  } = useReadingSettings();

  const [currentNum, setCurrentNum] = useState<number | null>(
    () => readUrlNum() ?? progress.num,
  );
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toolbarPanel, setToolbarPanel] = useState<ToolbarPanel>(null);
  const [sheetPanel, setSheetPanel] = useState<"catalog" | "settings" | null>(
    null,
  );
  const [sheetTab, setSheetTab] = useState<SettingsTabKey>("theme");
  // 移动端底部栏显示/隐藏
  const [mobileNavVisible, setMobileNavVisible] = useState(true);

  const currentChapter = chapters.find((c) => c.num === currentNum) ?? null;
  const { html, status: chStatus, error: chError } = useChapter(currentChapter);

  // 正文可滚动区域 ref（移动端内部滚动，桌面端 window 滚动）
  const scrollRef = useRef<HTMLDivElement>(null);

  // 索引就绪后兜底选章
  useEffect(() => {
    if (listStatus === "success" && !currentNum && chapters.length) {
      const target = chapters.find((c) => c.num === progress.num);
      setCurrentNum(target ? target.num : chapters[0].num);
    }
  }, [listStatus, currentNum, chapters, progress.num]);

  const selectChapter = useCallback(
    (num: number) => {
      setCurrentNum(num);
      writeUrlNum(num);
      progress.save(num, 0);
      // 桌面端用 window 滚动，移动端用内部滚动容器
      window.scrollTo(0, 0);
      if (scrollRef.current) scrollRef.current.scrollTop = 0;
      setSidebarOpen(false);
      setSheetPanel(null);
    },
    [progress],
  );

  const idx = chapters.findIndex((c) => c.num === currentNum);
  const hasPrev = idx > 0;
  const hasNext = idx >= 0 && idx < chapters.length - 1;
  const goPrev = useCallback(() => {
    if (hasPrev) selectChapter(chapters[idx - 1].num);
  }, [hasPrev, chapters, idx, selectChapter]);
  const goNext = useCallback(() => {
    if (hasNext) selectChapter(chapters[idx + 1].num);
  }, [hasNext, chapters, idx, selectChapter]);

  // 键盘 ←/→ 翻章
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goPrev, goNext]);

  // 滚动防抖存进度（桌面端 window 滚动 + 移动端内部滚动）
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (chStatus !== "success" || settings.pageMode === "paged") return;
    const scrollEl = scrollRef.current;
    const onScroll = () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
      scrollTimer.current = setTimeout(() => {
        // 优先取移动端内部滚动位置，其次 window 滚动
        const top = scrollEl ? scrollEl.scrollTop : window.scrollY;
        progress.save(currentNum, top);
      }, 300);
    };
    // 监听内部滚动（移动端）
    if (scrollEl) scrollEl.addEventListener("scroll", onScroll);
    // 同时监听 window 滚动（桌面端）
    window.addEventListener("scroll", onScroll);
    return () => {
      if (scrollEl) scrollEl.removeEventListener("scroll", onScroll);
      window.removeEventListener("scroll", onScroll);
    };
  }, [chStatus, currentNum, progress, settings.pageMode]);

  // 进入恢复滚动位置（一次）
  const restored = useRef(false);
  useEffect(() => {
    restored.current = false;
  }, [currentNum]);
  useEffect(() => {
    if (
      chStatus === "success" &&
      !restored.current &&
      progress.num === currentNum &&
      progress.scrollTop
    ) {
      window.scrollTo(0, progress.scrollTop);
      if (scrollRef.current) scrollRef.current.scrollTop = progress.scrollTop;
      restored.current = true;
    }
  }, [chStatus, currentNum, progress]);

  // 翻页模式：页码存 progress.scrollTop 字段
  const handlePageChange = useCallback(
    (page: number, _total: number) => {
      progress.save(currentNum, page);
    },
    [progress, currentNum],
  );

  // 回到顶部（移动端用内部滚动，桌面端用 window）
  const backToTop = useCallback(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (scrollRef.current) {
      scrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);
  const closeSidebar = useCallback(() => setSidebarOpen(false), []);
  const openSidebar = useCallback(() => setSidebarOpen(true), []);

  // 移动端：点击正文区域切换底部栏显示/隐藏
  const handleContentTap = useCallback(
    (e: React.MouseEvent) => {
      // 不拦截按钮、链接等交互元素的点击
      const target = e.target as HTMLElement;
      if (
        target.closest("button") ||
        target.closest("a") ||
        target.closest("input") ||
        target.closest("select")
      )
        return;
      setMobileNavVisible((v) => !v);
    },
    [],
  );

  const activeTab: SettingsTabKey = toolbarPanel ?? "theme";
  const handleTabChange = useCallback(
    (key: SettingsTabKey) => setToolbarPanel(key),
    [],
  );

  const openSheetTab = useCallback((tab: SettingsTabKey) => {
    setSheetTab(tab);
    setSheetPanel("settings");
  }, []);

  const settingsPanelEl = (
    <SettingsPanel
      theme={theme}
      onSetTheme={setTheme}
      onCustomizeColor={customizeColor}
      settings={settings}
      onUpdateSettings={updateSettings}
      onResetSettings={resetSettings}
      activeTab={sheetPanel === "settings" ? sheetTab : activeTab}
      onTabChange={sheetPanel === "settings" ? setSheetTab : handleTabChange}
    />
  );

  return (
    <div className="h-dvh md:min-h-full bg-bg text-fg flex flex-col md:block overflow-hidden md:overflow-visible">
      {/* 移动端顶栏 */}
      <header className="md:hidden shrink-0 flex items-center justify-between px-4 py-2 bg-bg border-b border-border">
        <button
          aria-label="打开目录"
          onClick={openSidebar}
          className="text-fg text-lg"
        >
          ☰
        </button>
        <span className="text-accent font-bold text-sm">时序残本</span>
        <button
          aria-label="回到顶部"
          onClick={backToTop}
          className="text-fg text-lg"
        >
          ↑
        </button>
      </header>

      <div className="flex md:items-start flex-1 md:flex-initial min-h-0">
        <Sidebar
          open={sidebarOpen}
          chapters={chapters}
          currentNum={currentNum}
          onSelect={selectChapter}
          onClose={closeSidebar}
        />
        {/* 移动端：内部滚动；桌面端：自然流式滚动 */}
        <main
          ref={scrollRef}
          onClick={handleContentTap}
          className={`flex-1 min-w-0 py-6 overflow-y-auto md:overflow-visible ${
            mobileNavVisible ? "pb-14" : "pb-0"
          } md:pb-6`}
        >
          {listStatus === "error" ? (
            <ChapterView
              chapter={null}
              status="error"
              error={listError}
              html=""
              settings={settings}
              onRetry={retryList}
            />
          ) : currentChapter ? (
            <ChapterView
              chapter={currentChapter}
              status={chStatus}
              error={chError}
              html={html}
              settings={settings}
              onRetry={retryList}
              page={settings.pageMode === "scroll" ? 0 : progress.scrollTop}
              onPageChange={handlePageChange}
            />
          ) : (
            <div className="py-16 text-center text-muted">加载中…</div>
          )}
          {currentChapter && chStatus === "success" && (
            <div
              style={{ maxWidth: settings.contentWidth }}
              className="mx-auto px-4"
            >
              <NavButtons
                hasPrev={hasPrev}
                hasNext={hasNext}
                onPrev={goPrev}
                onNext={goNext}
              />
            </div>
          )}
        </main>
      </div>

      {/* PC 悬浮工具条 */}
      <FloatingToolbar
        activePanel={toolbarPanel}
        onOpenPanel={(p) => setToolbarPanel(p)}
        onClosePanel={() => setToolbarPanel(null)}
        onBackToTop={backToTop}
      >
        {settingsPanelEl}
      </FloatingToolbar>

      {/* 移动端底部图标导航栏：点击屏幕切换显示/隐藏 */}
      <nav
        className={`md:hidden fixed bottom-0 left-0 right-0 z-20 bg-bg border-t border-border transition-transform duration-300 ${
          mobileNavVisible ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="flex">
          {MOBILE_NAV_BUTTONS.map((b) => (
            <button
              key={b.key}
              aria-label={b.label}
              title={b.label}
              className="flex-1 py-2 flex flex-col items-center justify-center gap-0.5 text-muted hover:text-fg transition-colors"
              onClick={() => {
                if (b.action === "catalog") {
                  setSheetPanel("catalog");
                } else if (b.tab) {
                  openSheetTab(b.tab);
                }
              }}
            >
              <span className="text-lg leading-none">{b.icon}</span>
              <span className="text-[10px] leading-none">{b.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* 移动端底部弹层：目录 */}
      <BottomSheet
        open={sheetPanel === "catalog"}
        title="目录"
        onClose={() => setSheetPanel(null)}
      >
        <ul>
          {chapters.map((ch) => (
            <li key={ch.num}>
              <button
                onClick={() => selectChapter(ch.num)}
                className={`w-full text-left px-2 py-2 text-sm rounded ${
                  ch.num === currentNum
                    ? "bg-highlight text-accent"
                    : "text-muted"
                }`}
              >
                第{ch.num}章 {ch.title}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>

      {/* 移动端底部弹层：设置 */}
      <BottomSheet
        open={sheetPanel === "settings"}
        title={SHEET_TAB_TITLE[sheetTab]}
        onClose={() => setSheetPanel(null)}
      >
        {settingsPanelEl}
      </BottomSheet>

      {/* 亮度遮罩 */}
      {settings.brightness < 1 && (
        <div
          className="fixed inset-0 bg-black pointer-events-none z-60"
          style={{ opacity: 1 - settings.brightness }}
        />
      )}
    </div>
  );
}
