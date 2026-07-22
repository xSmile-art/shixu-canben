import { useState, useEffect, useCallback, useRef } from 'react'
import { useChapters } from '@hooks/useChapters'
import { useChapter } from '@hooks/useChapter'
import { useReadingProgress } from '@hooks/useReadingProgress'
import { useTheme } from '@hooks/useTheme'
import { useReadingSettings } from '@hooks/useReadingSettings'
import { Sidebar } from '@components/layout/Sidebar'
import { FloatingToolbar, type ToolbarPanel } from '@components/layout/FloatingToolbar'
import { BottomSheet } from '@components/layout/BottomSheet'
import { ChapterView } from '@components/reader/ChapterView'
import { NavButtons } from '@components/reader/NavButtons'
import { SettingsPanel, type SettingsTabKey } from '@components/settings/SettingsPanel'

function readUrlNum(): number | null {
  const v = new URLSearchParams(window.location.search).get('ch')
  const n = v ? Number(v) : NaN
  return Number.isFinite(n) && n > 0 ? n : null
}
function writeUrlNum(num: number): void {
  const url = new URL(window.location.href)
  url.searchParams.set('ch', String(num))
  window.history.replaceState(null, '', url)
}

// 移动端 BottomSheet 标题随 Tab 变化
const SHEET_TAB_TITLE: Record<SettingsTabKey, string> = {
  theme: '主题',
  typography: '排版',
  reading: '阅读'
}

export default function App() {
  const { chapters, status: listStatus, error: listError, retry: retryList } = useChapters()
  const progress = useReadingProgress()
  const { theme, setTheme, customizeColor } = useTheme()
  const { settings, update: updateSettings, reset: resetSettings } = useReadingSettings()

  const [currentNum, setCurrentNum] = useState<number | null>(() => readUrlNum() ?? progress.num)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [toolbarPanel, setToolbarPanel] = useState<ToolbarPanel>(null)
  const [sheetPanel, setSheetPanel] = useState<'catalog' | 'settings' | null>(null)
  // 移动端 BottomSheet 打开设置时定位到哪个 Tab（设计的 主题/排版/阅读 入口）
  const [sheetTab, setSheetTab] = useState<SettingsTabKey>('theme')

  const currentChapter = chapters.find(c => c.num === currentNum) ?? null
  const { html, status: chStatus, error: chError } = useChapter(currentChapter)

  // 索引就绪后兜底选章
  useEffect(() => {
    if (listStatus === 'success' && !currentNum && chapters.length) {
      const target = chapters.find(c => c.num === progress.num)
      setCurrentNum(target ? target.num : chapters[0].num)
    }
  }, [listStatus, currentNum, chapters, progress.num])

  const selectChapter = useCallback((num: number) => {
    setCurrentNum(num)
    writeUrlNum(num)
    progress.save(num, 0)
    window.scrollTo(0, 0)
    setSidebarOpen(false)
    setSheetPanel(null)
  }, [progress])

  const idx = chapters.findIndex(c => c.num === currentNum)
  const hasPrev = idx > 0
  const hasNext = idx >= 0 && idx < chapters.length - 1
  const goPrev = useCallback(() => { if (hasPrev) selectChapter(chapters[idx - 1].num) }, [hasPrev, chapters, idx, selectChapter])
  const goNext = useCallback(() => { if (hasNext) selectChapter(chapters[idx + 1].num) }, [hasNext, chapters, idx, selectChapter])

  // 键盘 ←/→ 翻章
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goPrev, goNext])

  // 滚动防抖存进度
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  useEffect(() => {
    if (chStatus !== 'success' || settings.pageMode !== 'scroll') return
    const onScroll = () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
      scrollTimer.current = setTimeout(() => {
        progress.save(currentNum, window.scrollY)
      }, 300)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [chStatus, currentNum, progress, settings.pageMode])

  // 进入恢复滚动位置（一次）。restored 须在相关 useEffect 之前声明。
  const restored = useRef(false)
  useEffect(() => {
    restored.current = false
  }, [currentNum])
  useEffect(() => {
    if (chStatus === 'success' && !restored.current && progress.num === currentNum && progress.scrollTop) {
      window.scrollTo(0, progress.scrollTop)
      restored.current = true
    }
  }, [chStatus, currentNum, progress])

  const backToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), [])
  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const openSidebar = useCallback(() => setSidebarOpen(true), [])

  // 工具条与 SettingsPanel 的 Tab 串联：点工具条图标，面板跳对应 Tab
  const activeTab: SettingsTabKey = toolbarPanel ?? 'theme'
  const handleTabChange = useCallback((key: SettingsTabKey) => setToolbarPanel(key), [])

  // 移动端：点底部 主题/排版/阅读 入口 → 打开 BottomSheet 并定位到对应 Tab
  const openSheetTab = useCallback((tab: SettingsTabKey) => {
    setSheetTab(tab)
    setSheetPanel('settings')
  }, [])

  const settingsPanelEl = (
    <SettingsPanel
      theme={theme}
      onSetTheme={setTheme}
      onCustomizeColor={customizeColor}
      settings={settings}
      onUpdateSettings={updateSettings}
      onResetSettings={resetSettings}
      activeTab={sheetPanel === 'settings' ? sheetTab : activeTab}
      onTabChange={sheetPanel === 'settings' ? setSheetTab : handleTabChange}
    />
  )

  return (
    <div className="min-h-full bg-bg text-fg">
      {/* 移动端顶栏 */}
      <header className="md:hidden sticky top-0 z-20 flex items-center justify-between px-4 py-2 bg-bg border-b border-border">
        <button aria-label="打开目录" onClick={openSidebar} className="text-fg text-lg">☰</button>
        <span className="text-accent font-bold text-sm">时序残本</span>
        <button aria-label="回到顶部" onClick={backToTop} className="text-fg text-lg">↑</button>
      </header>

      <div className="flex">
        <Sidebar
          open={sidebarOpen}
          chapters={chapters}
          currentNum={currentNum}
          onSelect={selectChapter}
          onClose={closeSidebar}
        />
        {/* pb-24 给移动端底部按钮栏留位，避免遮挡正文 */}
        <main className="flex-1 min-w-0 py-6 pb-24 md:pb-6">
          {listStatus === 'error' ? (
            <ChapterView chapter={null} status="error" error={listError} html="" settings={settings} onRetry={retryList} />
          ) : currentChapter ? (
            <ChapterView
              chapter={currentChapter}
              status={chStatus}
              error={chError}
              html={html}
              settings={settings}
              onRetry={retryList}
            />
          ) : (
            <div className="py-16 text-center text-muted">加载中…</div>
          )}
          {currentChapter && chStatus === 'success' && (
            <div style={{ maxWidth: settings.contentWidth }} className="mx-auto px-4">
              <NavButtons hasPrev={hasPrev} hasNext={hasNext} onPrev={goPrev} onNext={goNext} />
            </div>
          )}
        </main>
      </div>

      {/* PC 悬浮工具条 */}
      <FloatingToolbar
        activePanel={toolbarPanel}
        onOpenPanel={p => setToolbarPanel(p)}
        onClosePanel={() => setToolbarPanel(null)}
        onBackToTop={backToTop}
      >
        {settingsPanelEl}
      </FloatingToolbar>

      {/* 移动端底部按钮栏：目录 + 主题/排版/阅读 4 入口 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 flex bg-bg border-t border-border">
        <button className="flex-1 py-3 text-sm text-fg" onClick={() => setSheetPanel('catalog')}>目录</button>
        <button className="flex-1 py-3 text-sm text-fg" onClick={() => openSheetTab('theme')}>主题</button>
        <button className="flex-1 py-3 text-sm text-fg" onClick={() => openSheetTab('typography')}>排版</button>
        <button className="flex-1 py-3 text-sm text-fg" onClick={() => openSheetTab('reading')}>阅读</button>
      </nav>

      {/* 移动端底部弹层：目录 */}
      <BottomSheet open={sheetPanel === 'catalog'} title="目录" onClose={() => setSheetPanel(null)}>
        <ul>
          {chapters.map(ch => (
            <li key={ch.num}>
              <button
                onClick={() => selectChapter(ch.num)}
                className={`w-full text-left px-2 py-2 text-sm rounded ${
                  ch.num === currentNum ? 'bg-highlight text-accent' : 'text-muted'
                }`}
              >
                第{ch.num}章 {ch.title}
              </button>
            </li>
          ))}
        </ul>
      </BottomSheet>

      {/* 移动端底部弹层：设置（按入口定位到对应 Tab） */}
      <BottomSheet
        open={sheetPanel === 'settings'}
        title={SHEET_TAB_TITLE[sheetTab]}
        onClose={() => setSheetPanel(null)}
      >
        {settingsPanelEl}
      </BottomSheet>

      {/* 亮度遮罩 */}
      {settings.brightness < 1 && (
        <div
          className="fixed inset-0 bg-black pointer-events-none z-[60]"
          style={{ opacity: 1 - settings.brightness }}
        />
      )}
    </div>
  )
}
