import { useState, useEffect, useCallback, useRef } from 'react'
import { useChapters } from './hooks/useChapters.js'
import { useChapter } from './hooks/useChapter.js'
import { useReadingProgress } from './hooks/useReadingProgress.js'
import { getTheme, setTheme } from './lib/theme.js'
import { ChapterList } from './components/ChapterList.jsx'
import { ChapterView } from './components/ChapterView.jsx'
import { NavButtons } from './components/NavButtons.jsx'
import { Toolbar } from './components/Toolbar.jsx'
import './App.css'

const FONT_SIZE_KEY = 'sxcb-fontsize'

function readUrlNum() {
  const p = new URLSearchParams(window.location.search)
  return p.get('ch')
}
function writeUrlNum(num) {
  const url = new URL(window.location.href)
  url.searchParams.set('ch', num)
  window.history.replaceState(null, '', url)
}

export default function App() {
  const { chapters, status: listStatus, error: listError, retry: retryList } = useChapters()
  const progress = useReadingProgress()

  // 初始章号：URL > 进度 > 第一章（章号在索引就绪后兜底选中）
  const [currentNum, setCurrentNum] = useState(() => readUrlNum() || progress.num || null)
  // 移动端目录抽屉开关
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const currentChapter = chapters.find(c => c.num === currentNum) || null
  const { html, status: chStatus, error: chError } = useChapter(currentChapter)

  // 主题
  const [theme, setThemeState] = useState(() => getTheme())
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  const toggleTheme = useCallback(() => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    setThemeState(next)
  }, [theme])

  // 字号
  const [fontSize, setFontSize] = useState(() => localStorage.getItem(FONT_SIZE_KEY) || 'medium')
  useEffect(() => {
    localStorage.setItem(FONT_SIZE_KEY, fontSize)
    document.documentElement.dataset.fontSize = fontSize
  }, [fontSize])

  // 索引就绪后若还没选章，选第一章或进度章
  useEffect(() => {
    if (listStatus === 'success' && !currentNum && chapters.length) {
      const target = chapters.find(c => c.num === progress.num)
      setCurrentNum(target ? target.num : chapters[0].num)
    }
  }, [listStatus, currentNum, chapters, progress.num])

  // 切章：更新状态 + URL + 进度，滚到顶，并关闭移动端目录
  const selectChapter = useCallback((num) => {
    setCurrentNum(num)
    writeUrlNum(num)
    progress.save(num, 0)
    window.scrollTo(0, 0)
    setSidebarOpen(false)
  }, [progress])

  // 邻章
  const idx = chapters.findIndex(c => c.num === currentNum)
  const hasPrev = idx > 0
  const hasNext = idx >= 0 && idx < chapters.length - 1
  const goPrev = useCallback(() => { if (hasPrev) selectChapter(chapters[idx - 1].num) }, [hasPrev, chapters, idx, selectChapter])
  const goNext = useCallback(() => { if (hasNext) selectChapter(chapters[idx + 1].num) }, [hasNext, chapters, idx, selectChapter])

  // 键盘 ←/→ 翻章
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [goPrev, goNext])

  // 滚动位置记忆：滚动时防抖存进度
  const scrollTimer = useRef(null)
  useEffect(() => {
    if (chStatus !== 'success') return
    const onScroll = () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current)
      scrollTimer.current = setTimeout(() => {
        progress.save(currentNum, window.scrollY)
      }, 300)
    }
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [chStatus, currentNum, progress])

  // 进入时若有进度滚动位置，恢复一次
  const restored = useRef(false)
  useEffect(() => {
    if (chStatus === 'success' && !restored.current && progress.num === currentNum && progress.scrollTop) {
      window.scrollTo(0, progress.scrollTop)
      restored.current = true
    }
  }, [chStatus, currentNum, progress])

  const backToTop = useCallback(() => window.scrollTo({ top: 0, behavior: 'smooth' }), [])

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const toggleSidebar = useCallback(() => setSidebarOpen(v => !v), [])

  return (
    <div className={`app ${sidebarOpen ? 'sidebar-open' : ''}`}>
      <Toolbar
        theme={theme}
        onToggleTheme={toggleTheme}
        fontSize={fontSize}
        onChangeFontSize={setFontSize}
        onBackToTop={backToTop}
        sidebarOpen={sidebarOpen}
        onToggleSidebar={toggleSidebar}
      />
      {/* 移动端遮罩：点空白关闭目录 */}
      <div className="overlay" onClick={closeSidebar} />
      <div className="main">
        <aside className="sidebar">
          <div className="sidebar-head">
            <h2 className="book-title">时序残本</h2>
            <button className="sidebar-close" onClick={closeSidebar} aria-label="关闭目录">✕</button>
          </div>
          <ChapterList chapters={chapters} currentNum={currentNum} onSelect={selectChapter} />
        </aside>
        <main className="content">
          {listStatus === 'error'
            ? <ChapterView status="error" error={listError} onRetry={retryList} />
            : currentChapter
              ? <ChapterView
                  chapter={currentChapter}
                  status={chStatus}
                  error={chError}
                  html={html}
                  onRetry={retryList}
                />
              : <div className="state loading">加载中…</div>}
          {currentChapter && (
            <NavButtons hasPrev={hasPrev} hasNext={hasNext} onPrev={goPrev} onNext={goNext} />
          )}
        </main>
      </div>
    </div>
  )
}
