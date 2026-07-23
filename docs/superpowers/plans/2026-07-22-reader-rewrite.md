# Reader 重写实施计划（React + TS + Tailwind v4 + 通用主题系统）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 `reader/` 目录从 React + JS 重写为 React 19 + TypeScript + Tailwind CSS v4，新增 8 套预设主题 + 6 色自定义、完整阅读设置（字体/字号/行距/字间距/段间距/页宽/翻页模式/亮度）、三种翻页模式，以及 PC 悬浮工具条 / 移动端底部弹层双端布局。

**Architecture:** CSS 变量映射主题（6 个色槽位写到 `<html>`），阅读设置以内联样式 + CSS 变量双通道应用；左右/上下翻页用 JS 分页；状态用 5 个 Hook 管理，localStorage 键保留 `sxcb-` 前缀。

**Tech Stack:** React 19, TypeScript 7(strict), Tailwind CSS v4 + @tailwindcss/vite + @tailwindcss/typography, Vite 8 + vite-tsconfig-paths, Vitest 4, marked 18, @testing-library/react 16, jsdom 29.

**Spec:** `docs/superpowers/specs/2026-07-22-reader-rewrite-design.md`

---

## 文件结构

```
reader/
├── package.json                        # 改：升级依赖 + vite-tsconfig-paths
├── vite.config.ts                      # 改：JS→TS，tsconfigPaths 插件，setupFiles
├── tsconfig.json                       # 新：严格模式 + paths 别名（唯一定义处）
├── tsconfig.node.json                  # 新：vite.config.ts 用
├── index.html                          # 改：入口 main.jsx → main.tsx
├── src/
│   ├── main.tsx                        # 新（替 main.jsx）
│   ├── App.tsx                         # 新（替 App.jsx）
│   ├── index.css                       # 新（替 App.css）：@theme + 断点 + 阅读变量
│   ├── types/{chapter,theme,settings}.ts        # 类型（Task 1 前置）
│   ├── themes/{presets,index}.ts                # 8 套预设 + applyTheme
│   ├── hooks/{useChapters,useChapter,useReadingProgress,useTheme,useReadingSettings}.ts
│   ├── lib/{raw,markdown,storage,paginate}.ts
│   └── components/
│       ├── layout/{Sidebar,FloatingToolbar,BottomSheet}.tsx
│       ├── reader/{ChapterView,ChapterList,NavButtons,Paginator,LoadingError}.tsx
│       ├── settings/{SettingsPanel,ThemeTab,TypographyTab,ReadingTab,ThemeCustomizer}.tsx
│       └── ui/{Button,Slider,ColorPicker,Tabs}.tsx
├── test/
│   ├── setup.ts                        # polyfill ResizeObserver 等
│   ├── lib/{raw,markdown,storage,paginate}.test.ts
│   ├── themes/presets.test.ts
│   ├── hooks/{useChapters,useChapter,useReadingProgress,useTheme,useReadingSettings}.test.ts
│   └── components/{ui,ChapterList,NavButtons,ChapterView,Sidebar,SettingsPanel,ThemeCustomizer,FloatingToolbar,BottomSheet}.test.tsx
└── （删除）App.css, main.jsx, App.jsx, src/components/*.jsx, src/hooks/*.js, src/lib/*.js, vite.config.js
```

---

## 任务总览

| Task | 内容 | 产出 |
|------|------|------|
| 1 | 脚手架升级 + 类型前置 + vite-tsconfig-paths 别名 + 测试 setup | 工具链可跑 |
| 2 | lib 层：storage / raw / markdown | 3 工具模块 + 测试 |
| 3 | themes：8 套预设 + applyTheme | 主题数据层 + 测试 |
| 4 | useTheme / useReadingSettings（含 applyReadingSettings） | 状态 Hook + 测试 |
| 5 | useChapters / useChapter / useReadingProgress 迁移 | 数据 Hook + 测试 |
| 6 | UI 基础组件：Button / Slider / ColorPicker / Tabs（受控） | 通用组件 + 测试 |
| 7 | index.css：@theme + 断点 + 阅读变量 | 主题 CSS |
| 8 | ChapterList / NavButtons / LoadingError | 基础组件 + 测试 |
| 9 | ChapterView：滚动模式 + 阅读设置应用 | 能看正文 |
| 10 | Sidebar：PC 侧边栏 / 移动端抽屉 | 目录布局 |
| 11 | SettingsPanel + 三 Tab（受控 activeTab） | 设置面板 + 测试 |
| 12 | ThemeCustomizer：6 色自定义 | 自定义主题 + 测试 |
| 13 | FloatingToolbar + BottomSheet | 双端设置入口 |
| 14 | App.tsx 装配 + main.tsx 正式版 | 完整可用（滚动） |
| 15 | 翻页模式：JS 分页 Paginator | 三种翻页 |
| 16 | 收尾清理 + README + 全量验证 | 验收 |

---

## 路径别名与测试风格约定（全计划统一）

**一律使用别名 import，禁止 `../xx` 相对路径。** 别名**只在 `tsconfig.json` 的 `paths` 定义一次**，Vite / Vitest 通过 `vite-tsconfig-paths` 插件自动读取，tsc / Vite / Vitest 三处共享，无需重复维护。

| 别名 | 指向 | 用途 |
|------|------|------|
| `@/*` | `src/*` | 兜底 |
| `@app-types/*` | `src/types/*` | 类型定义 |
| `@lib/*` | `src/lib/*` | 工具函数 |
| `@themes/*` | `src/themes/*` | 主题数据 |
| `@hooks/*` | `src/hooks/*` | Hooks |
| `@components/*` | `src/components/*` | 组件 |

> **用 `@app-types/*` 而非 `@types/*`**：`@types/*` 是 DefinitelyTyped 类型包保留命名空间（本项目也装了 `@types/node`、`@types/react`）。拿它当源码别名会撞名，vitest SSR 解析可能误判、IDE 易混淆，故用无歧义的 `@app-types/*`。

**测试 import**：测试在 `reader/test/` 下，引用被测源码也用别名（如 `import { useTheme } from '@hooks/useTheme'`）。

**测试 API 风格**：所有测试**显式 `import { describe, it, expect, vi } from 'vitest'`**，不依赖全局注入。vitest `globals: false`，tsconfig `types` 不含 `vitest/globals`。只 import 实际用到的 API，避免 `noUnusedLocals` 报错。

---

## Task 1: 脚手架升级 + 类型前置 + 别名 + 测试 setup

**目标**：升级工具链，前置创建全部类型文件，用 vite-tsconfig-paths 配别名，建测试 setup（polyfill）。此时 `src/` 其余仍是旧 JS 代码。测试配置指向 `test/**/*.test.{ts,tsx}`（旧 .jsx 测试在 Task 5 迁移删除）。

**Files:**
- Modify: `reader/package.json`
- Create: `reader/tsconfig.json`、`reader/tsconfig.node.json`
- Create: `reader/src/types/{chapter,theme,settings}.ts`（前置）
- Create: `reader/test/setup.ts`
- Replace: `reader/vite.config.js` → `reader/vite.config.ts`
- Modify: `reader/index.html`

- [ ] **Step 1: 更新 package.json**

完整替换 `reader/package.json`：

```json
{
  "name": "shixu-canben-reader",
  "private": true,
  "version": "0.2.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "marked": "^18.0.0",
    "react": "^19.2.0",
    "react-dom": "^19.2.0"
  },
  "devDependencies": {
    "@tailwindcss/typography": "^0.5.16",
    "@tailwindcss/vite": "^4.3.0",
    "@testing-library/jest-dom": "^7.0.0",
    "@testing-library/react": "^16.3.2",
    "@types/node": "^24.0.0",
    "@types/react": "^19.2.0",
    "@types/react-dom": "^19.2.0",
    "@vitejs/plugin-react": "^6.0.0",
    "jsdom": "^29.1.0",
    "tailwindcss": "^4.3.0",
    "typescript": "^7.0.0",
    "vite-tsconfig-paths": "^5.1.4",
    "vitest": "^4.1.0"
  }
}
```

- [ ] **Step 2: 安装依赖**

Run: `cd reader && npm install`
Expected: 成功安装。若 `typescript@^7.0.0` 尚未发布则改用 `^5.6.0`（以 registry 实际可用为准，选最新稳定版）。

- [ ] **Step 3: 写 tsconfig.json（含 paths 别名，types 不含 vitest/globals）**

Create `reader/tsconfig.json`：

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "useDefineForClassFields": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"],
      "@app-types/*": ["src/types/*"],
      "@lib/*": ["src/lib/*"],
      "@themes/*": ["src/themes/*"],
      "@hooks/*": ["src/hooks/*"],
      "@components/*": ["src/components/*"]
    },
    "types": ["@testing-library/jest-dom"]
  },
  "include": ["src", "test"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

- [ ] **Step 4: 写 tsconfig.node.json**

Create `reader/tsconfig.node.json`：

```json
{
  "compilerOptions": {
    "composite": true,
    "skipLibCheck": true,
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "strict": true,
    "types": ["node"]
  },
  "include": ["vite.config.ts"]
}
```

- [ ] **Step 5: 前置创建三个类型文件**

Create `reader/src/types/chapter.ts`：

```typescript
export interface Chapter {
  num: number
  title: string
}

export type ChapterIndex = Chapter[]

export type LoadStatus = 'loading' | 'success' | 'error'
```

Create `reader/src/types/theme.ts`：

```typescript
export interface ThemeColors {
  bg: string
  fg: string
  accent: string
  muted: string
  border: string
  highlight: string
}

export interface Theme {
  name: string
  label: string
  colors: ThemeColors
  isCustom?: boolean
}
```

Create `reader/src/types/settings.ts`：

```typescript
export type FontFamily = 'serif' | 'sans' | 'kai'
export type PageMode = 'scroll' | 'horizontal' | 'vertical'

export interface ReadingSettings {
  fontFamily: FontFamily
  fontSize: number          // 14-24 px
  lineHeight: number        // 1.5-2.5
  letterSpacing: number     // 0-4 px
  paragraphSpacing: number  // 0.5-2 em
  paragraphIndent: boolean
  contentWidth: number      // 600-900 px
  pageMode: PageMode
  brightness: number        // 0.3-1.0
}

export const DEFAULT_SETTINGS: ReadingSettings = {
  fontFamily: 'serif',
  fontSize: 18,
  lineHeight: 1.9,
  letterSpacing: 0,
  paragraphSpacing: 1,
  paragraphIndent: true,
  contentWidth: 720,
  pageMode: 'scroll',
  brightness: 1.0
}
```

- [ ] **Step 6: 替换 vite.config.js 为 vite.config.ts（tsconfigPaths + setupFiles）**

Delete `reader/vite.config.js`，Create `reader/vite.config.ts`：

```typescript
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  base: '/shixu-canben/',
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: false,
    include: ['test/**/*.test.{ts,tsx}'],
    setupFiles: ['test/setup.ts'],
    coverage: { reporter: [] }
  }
})
```

> `tsconfigPaths()` 让 Vite 和 Vitest 直接读 tsconfig 的 `paths`，无需手写 `resolve.alias`。

- [ ] **Step 7: 建 test/setup.ts（polyfill jsdom 缺失 API）**

Create `reader/test/setup.ts`：

```typescript
// jsdom 未实现的浏览器 API 在此 polyfill，供全部测试使用。
import { vi } from 'vitest'

// Paginator 用 ResizeObserver 监听容器尺寸，jsdom 没有 → 空实现
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver
}

// jsdom 的 scrollTo 未实现，调用抛 "Not implemented" → 静默化
window.scrollTo = window.scrollTo ?? vi.fn()
```

- [ ] **Step 8: 改 index.html 入口**

把 `reader/index.html` 中 `<script type="module" src="/src/main.jsx">` 改为 `<script type="module" src="/src/main.tsx">`。

- [ ] **Step 9: 建占位 main.tsx + 占位 index.css**

建占位 `reader/src/main.tsx`（Task 14 换成正式引入 App 的版本）：

```tsx
import { createRoot } from 'react-dom/client'
import './index.css'

createRoot(document.getElementById('root')!).render(<div>脚手架 OK</div>)
```

建占位 `reader/src/index.css`（Task 7 换正式版）：

```css
@import "tailwindcss";
```

- [ ] **Step 10: 验证工具链与别名**

Run: `cd reader && npm run build`
Expected: TS 编译 + Vite 构建成功，`@app-types/*` 可解析。
可选验证：在 `main.tsx` 顶部加 `import type { Chapter } from '@app-types/chapter'`，build 应通过，验证后删掉。

Run: `cd reader && npm test`
Expected: Vitest 启动成功，"No test files found"。

- [ ] **Step 11: Commit**

```bash
git add reader/package.json reader/package-lock.json reader/tsconfig.json reader/tsconfig.node.json reader/vite.config.ts reader/index.html reader/src/main.tsx reader/src/index.css reader/src/types reader/test/setup.ts
git rm reader/vite.config.js
git commit -m "chore(reader): 脚手架升级 + 类型前置 + vite-tsconfig-paths 别名 + 测试 setup"
```

---

## Task 2: lib 层 — storage / raw / markdown

**目标**：三个纯函数工具模块，TDD。类型文件已在 Task 1 建好，直接用 `@app-types/*` 别名。

**Files:**
- Create: `reader/src/lib/{storage,raw,markdown}.ts`
- Test: `reader/test/lib/{storage,raw,markdown}.test.ts`

### storage.ts

- [ ] **Step 1: 写 storage 失败测试**

Create `reader/test/lib/storage.test.ts`：

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { readStorage, writeStorage } from '@lib/storage'

describe('storage', () => {
  beforeEach(() => localStorage.clear())

  it('键不存在时返回默认值', () => {
    expect(readStorage('nope', { a: 1 })).toEqual({ a: 1 })
  })

  it('写入后能读回', () => {
    writeStorage('k', { a: 2 })
    expect(readStorage('k', { a: 1 })).toEqual({ a: 2 })
  })

  it('JSON 损坏时返回默认值且不抛错', () => {
    localStorage.setItem('bad', '{not-json')
    expect(readStorage('bad', 'fallback')).toBe('fallback')
  })

  it('localStorage 抛错时返回默认值', () => {
    const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied') })
    expect(readStorage('x', 42)).toBe(42)
    spy.mockRestore()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd reader && npx vitest run test/lib/storage.test.ts`
Expected: FAIL — 找不到 `@lib/storage`。

- [ ] **Step 3: 实现 storage.ts**

Create `reader/src/lib/storage.ts`：

```typescript
// localStorage 安全读写：解析失败/不可用都回退到默认值，不阻塞渲染
export function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function writeStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // 存储被禁用/超限时静默忽略
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd reader && npx vitest run test/lib/storage.test.ts`
Expected: PASS（4 用例全绿）。

### raw.ts

- [ ] **Step 5: 写 raw 失败测试**

Create `reader/test/lib/raw.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { buildFileName, buildChapterUrl, buildIndexUrl } from '@lib/raw'

describe('raw', () => {
  it('buildFileName 拼出仓库文件名', () => {
    expect(buildFileName({ num: 3, title: '雨夜' })).toBe('第3章-雨夜.md')
  })

  it('buildChapterUrl 生成编码后的 raw 地址', () => {
    const url = buildChapterUrl({ num: 1, title: '开始' })
    expect(url).toContain('https://raw.githubusercontent.com/xSmile-art/shixu-canben/main/')
    expect(url).toContain(encodeURI('novels/时序残本/正文/第1章-开始.md'))
  })

  it('buildIndexUrl 指向 chapters-index.json', () => {
    expect(buildIndexUrl()).toBe(
      'https://raw.githubusercontent.com/xSmile-art/shixu-canben/main/chapters-index.json'
    )
  })
})
```

- [ ] **Step 6: 跑测试确认失败**

Run: `cd reader && npx vitest run test/lib/raw.test.ts`
Expected: FAIL。

- [ ] **Step 7: 实现 raw.ts**

Create `reader/src/lib/raw.ts`：

```typescript
import type { Chapter } from '@app-types/chapter'

// 仓库坐标——迁移仓库只改这里
const OWNER = 'xSmile-art'
const REPO = 'shixu-canben'
const BRANCH = 'main'
const NOVELS_PREFIX = 'novels/时序残本/正文'

const RAW_BASE = `https://raw.githubusercontent.com/${OWNER}/${REPO}/${BRANCH}`

export function buildFileName({ num, title }: Chapter): string {
  return `第${num}章-${title}.md`
}

export function buildChapterUrl(chapter: Chapter): string {
  const path = `${NOVELS_PREFIX}/${buildFileName(chapter)}`
  return `${RAW_BASE}/${encodeURI(path)}`
}

export function buildIndexUrl(): string {
  return `${RAW_BASE}/chapters-index.json`
}
```

- [ ] **Step 8: 跑测试确认通过**

Run: `cd reader && npx vitest run test/lib/raw.test.ts`
Expected: PASS。

### markdown.ts

- [ ] **Step 9: 写 markdown 失败测试**

Create `reader/test/lib/markdown.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { renderMarkdown } from '@lib/markdown'

describe('markdown', () => {
  it('渲染标题与段落', async () => {
    const html = await renderMarkdown('# 标题\n\n正文段落')
    expect(html).toContain('<h1>')
    expect(html).toContain('标题')
    expect(html).toContain('<p>正文段落</p>')
  })

  it('渲染 GFM 表格语法', async () => {
    const html = await renderMarkdown('| a | b |\n|---|---|\n| 1 | 2 |')
    expect(html).toContain('<table>')
  })
})
```

- [ ] **Step 10: 跑测试确认失败**

Run: `cd reader && npx vitest run test/lib/markdown.test.ts`
Expected: FAIL。

- [ ] **Step 11: 实现 markdown.ts**

Create `reader/src/lib/markdown.ts`：

```typescript
import { marked } from 'marked'

marked.setOptions({
  gfm: true,
  breaks: false
})

// markdown → HTML。marked 默认转义内联 HTML，正文为自有内容无注入风险。
// marked v18 的 parse 返回 string | Promise<string>，统一成 Promise 便于调用方。
export async function renderMarkdown(md: string): Promise<string> {
  return marked.parse(md)
}
```

- [ ] **Step 12: 跑测试确认通过 + Commit**

Run: `cd reader && npx vitest run test/lib`
Expected: 三组全 PASS。

```bash
git add reader/src/lib reader/test/lib
git commit -m "feat(reader): lib 层 TS 化 — storage/raw/markdown + 测试"
```

---

## Task 3: themes — 8 套预设 + applyTheme

**目标**：主题数据层（8 套预设 + CSS 变量注入 + 持久化）。

**Files:**
- Create: `reader/src/themes/{presets,index}.ts`
- Test: `reader/test/themes/presets.test.ts`

- [ ] **Step 1: 写预设主题测试**

Create `reader/test/themes/presets.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { PRESET_THEMES } from '@themes/presets'

const REQUIRED_KEYS = ['bg', 'fg', 'accent', 'muted', 'border', 'highlight'] as const

describe('PRESET_THEMES', () => {
  it('恰好 8 套预设', () => {
    expect(PRESET_THEMES).toHaveLength(8)
  })

  it('每套都有 name/label 且齐全 6 色', () => {
    for (const t of PRESET_THEMES) {
      expect(t.name).toBeTruthy()
      expect(t.label).toBeTruthy()
      for (const k of REQUIRED_KEYS) {
        expect(typeof t.colors[k]).toBe('string')
        expect(t.colors[k].length).toBeGreaterThan(0)
      }
    }
  })

  it('name 全局唯一', () => {
    const names = PRESET_THEMES.map(t => t.name)
    expect(new Set(names).size).toBe(names.length)
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd reader && npx vitest run test/themes/presets.test.ts`
Expected: FAIL。

- [ ] **Step 3: 实现 themes/presets.ts**

Create `reader/src/themes/presets.ts`：

```typescript
import type { Theme } from '@app-types/theme'

export const PRESET_THEMES: Theme[] = [
  { name: 'day', label: '日间白',
    colors: { bg: '#ffffff', fg: '#1a1a1a', accent: '#8b5a2b', muted: '#666666', border: '#e0ddd5', highlight: 'rgba(139,90,43,0.12)' } },
  { name: 'paper', label: '羊皮纸',
    colors: { bg: '#f5ecd7', fg: '#3a2f23', accent: '#8b5a2b', muted: '#7a6f5d', border: '#d8cdb4', highlight: 'rgba(139,90,43,0.14)' } },
  { name: 'green', label: '护眼绿',
    colors: { bg: '#e6f2e6', fg: '#1f2d1f', accent: '#2f6b2f', muted: '#5a6b5a', border: '#c2d8c2', highlight: 'rgba(47,107,47,0.12)' } },
  { name: 'douban', label: '豆沙绿',
    colors: { bg: '#c7d6c5', fg: '#1c261c', accent: '#3a6b3a', muted: '#4c5c4c', border: '#a8bda6', highlight: 'rgba(58,107,58,0.14)' } },
  { name: 'sakura', label: '樱花粉',
    colors: { bg: '#fbeef0', fg: '#2d1f24', accent: '#b0536b', muted: '#7a5f68', border: '#e4ccd3', highlight: 'rgba(176,83,107,0.12)' } },
  { name: 'sky', label: '天空蓝',
    colors: { bg: '#e8f1f8', fg: '#1c2733', accent: '#2b6a9e', muted: '#5a6b7a', border: '#c4d6e4', highlight: 'rgba(43,106,158,0.12)' } },
  { name: 'night', label: '夜间黑',
    colors: { bg: '#0f0f0f', fg: '#d6d6d6', accent: '#c9a86a', muted: '#8a8a8a', border: '#2c2c2c', highlight: 'rgba(201,168,106,0.16)' } },
  { name: 'deepnight', label: '深蓝夜',
    colors: { bg: '#0d1b2a', fg: '#cfd8e3', accent: '#7aa2c9', muted: '#7a8a9c', border: '#22354a', highlight: 'rgba(122,162,201,0.16)' } }
]
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd reader && npx vitest run test/themes/presets.test.ts`
Expected: PASS。

- [ ] **Step 5: 实现 themes/index.ts**

Create `reader/src/themes/index.ts`：

```typescript
import type { Theme } from '@app-types/theme'
import { PRESET_THEMES } from '@themes/presets'
import { readStorage, writeStorage } from '@lib/storage'

export const THEME_KEY = 'sxcb-theme'

export function applyTheme(theme: Theme): void {
  const root = document.documentElement
  root.style.setProperty('--color-bg', theme.colors.bg)
  root.style.setProperty('--color-fg', theme.colors.fg)
  root.style.setProperty('--color-accent', theme.colors.accent)
  root.style.setProperty('--color-muted', theme.colors.muted)
  root.style.setProperty('--color-border', theme.colors.border)
  root.style.setProperty('--color-highlight', theme.colors.highlight)
}

export function saveTheme(theme: Theme): void {
  writeStorage(THEME_KEY, theme)
}

// 读持久化主题；无记录或找不到对应 name 时回退到第一套预设（日间白）
export function loadTheme(): Theme {
  const saved = readStorage<Theme | null>(THEME_KEY, null)
  if (!saved) return PRESET_THEMES[0]
  if (saved.name === 'custom' && saved.isCustom) return saved
  const found = PRESET_THEMES.find(t => t.name === saved.name)
  return found ?? PRESET_THEMES[0]
}
```

> jsdom 不支持 CSS 变量实际生效，`applyTheme`/`loadTheme` 不写单测（按设计 §12）；持久化走 `storage.ts`，已在 Task 2 测过。

- [ ] **Step 6: Commit**

```bash
git add reader/src/themes reader/test/themes
git commit -m "feat(reader): 8 套预设主题 + applyTheme/loadTheme/saveTheme"
```

---

## Task 4: useTheme / useReadingSettings

**目标**：主题状态 Hook（含自定义）与阅读设置 Hook（含 `applyReadingSettings` 写 `--reader-*` 变量，驱动段间距/缩进）。

**Files:**
- Create: `reader/src/hooks/{useTheme,useReadingSettings}.ts`
- Test: `reader/test/hooks/{useTheme,useReadingSettings}.test.ts`

- [ ] **Step 1: 写 useTheme 失败测试**

Create `reader/test/hooks/useTheme.test.ts`：

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useTheme } from '@hooks/useTheme'
import { PRESET_THEMES } from '@themes/presets'
import { THEME_KEY } from '@themes/index'

describe('useTheme', () => {
  beforeEach(() => localStorage.clear())

  it('无记录时默认第一套预设', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme.name).toBe(PRESET_THEMES[0].name)
  })

  it('setTheme 切换主题并持久化', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.setTheme(PRESET_THEMES[6]))
    expect(result.current.theme.name).toBe('night')
    expect(JSON.parse(localStorage.getItem(THEME_KEY)!).name).toBe('night')
  })

  it('customizeColor 生成 isCustom 的 custom 主题', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.customizeColor('bg', '#123456'))
    expect(result.current.theme.name).toBe('custom')
    expect(result.current.theme.isCustom).toBe(true)
    expect(result.current.theme.colors.bg).toBe('#123456')
    expect(result.current.theme.colors.fg).toBe(PRESET_THEMES[0].colors.fg)
  })

  it('刷新后恢复持久化主题', () => {
    localStorage.setItem(THEME_KEY, JSON.stringify(PRESET_THEMES[2]))
    const { result } = renderHook(() => useTheme())
    expect(result.current.theme.name).toBe('green')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd reader && npx vitest run test/hooks/useTheme.test.ts`
Expected: FAIL。

- [ ] **Step 3: 实现 useTheme.ts**

Create `reader/src/hooks/useTheme.ts`：

```typescript
import { useState, useCallback, useEffect } from 'react'
import type { Theme, ThemeColors } from '@app-types/theme'
import { applyTheme, loadTheme, saveTheme } from '@themes/index'

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => loadTheme())

  useEffect(() => { applyTheme(theme) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t)
    saveTheme(t)
    applyTheme(t)
  }, [])

  const customizeColor = useCallback((key: keyof ThemeColors, value: string) => {
    setThemeState(prev => {
      const custom: Theme = {
        ...prev,
        name: 'custom',
        label: '我的主题',
        colors: { ...prev.colors, [key]: value },
        isCustom: true
      }
      saveTheme(custom)
      applyTheme(custom)
      return custom
    })
  }, [])

  return { theme, setTheme, customizeColor }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd reader && npx vitest run test/hooks/useTheme.test.ts`
Expected: PASS。

- [ ] **Step 5: 写 useReadingSettings 失败测试**

Create `reader/test/hooks/useReadingSettings.test.ts`：

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReadingSettings, SETTINGS_KEY } from '@hooks/useReadingSettings'
import { DEFAULT_SETTINGS } from '@app-types/settings'

describe('useReadingSettings', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.removeAttribute('style')
  })

  it('无记录时返回默认设置', () => {
    const { result } = renderHook(() => useReadingSettings())
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('update 单项更新并持久化', () => {
    const { result } = renderHook(() => useReadingSettings())
    act(() => result.current.update({ fontSize: 22 }))
    expect(result.current.settings.fontSize).toBe(22)
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY)!)
    expect(saved.fontSize).toBe(22)
    expect(saved.lineHeight).toBe(DEFAULT_SETTINGS.lineHeight)
  })

  it('update 同时写入 --reader-* CSS 变量', () => {
    const { result } = renderHook(() => useReadingSettings())
    act(() => result.current.update({ paragraphSpacing: 1.5, fontSize: 20 }))
    const style = document.documentElement.style
    expect(style.getPropertyValue('--reader-paragraph-spacing')).toBe('1.5em')
    expect(style.getPropertyValue('--reader-font-size')).toBe('20px')
  })

  it('paragraphIndent=false 时 --reader-paragraph-indent 写 0', () => {
    const { result } = renderHook(() => useReadingSettings())
    act(() => result.current.update({ paragraphIndent: false }))
    expect(document.documentElement.style.getPropertyValue('--reader-paragraph-indent')).toBe('0')
  })

  it('reset 恢复默认并写回', () => {
    const { result } = renderHook(() => useReadingSettings())
    act(() => result.current.update({ fontSize: 24 }))
    act(() => result.current.reset())
    expect(result.current.settings).toEqual(DEFAULT_SETTINGS)
  })

  it('刷新后恢复持久化设置', () => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, brightness: 0.6 }))
    const { result } = renderHook(() => useReadingSettings())
    expect(result.current.settings.brightness).toBe(0.6)
  })
})
```

- [ ] **Step 6: 跑测试确认失败**

Run: `cd reader && npx vitest run test/hooks/useReadingSettings.test.ts`
Expected: FAIL。

- [ ] **Step 7: 实现 useReadingSettings.ts（含 applyReadingSettings）**

Create `reader/src/hooks/useReadingSettings.ts`：

```typescript
import { useState, useCallback, useEffect } from 'react'
import type { ReadingSettings } from '@app-types/settings'
import { DEFAULT_SETTINGS } from '@app-types/settings'
import { readStorage, writeStorage } from '@lib/storage'

export const SETTINGS_KEY = 'sxcb-settings'

// 把阅读设置写到 <html> 的 --reader-* CSS 变量，驱动 index.css 里 .chapter-body 的
// 字号/行距/字间距/段间距/首行缩进/页宽。缺了这步，段间距与缩进设置不生效。
export function applyReadingSettings(s: ReadingSettings): void {
  const root = document.documentElement
  root.style.setProperty('--reader-font-size', `${s.fontSize}px`)
  root.style.setProperty('--reader-line-height', String(s.lineHeight))
  root.style.setProperty('--reader-letter-spacing', `${s.letterSpacing}px`)
  root.style.setProperty('--reader-content-width', `${s.contentWidth}px`)
  root.style.setProperty('--reader-paragraph-spacing', `${s.paragraphSpacing}em`)
  root.style.setProperty('--reader-paragraph-indent', s.paragraphIndent ? '2em' : '0')
}

export function useReadingSettings() {
  const [settings, setSettings] = useState<ReadingSettings>(() =>
    readStorage<ReadingSettings>(SETTINGS_KEY, DEFAULT_SETTINGS)
  )

  useEffect(() => { applyReadingSettings(settings) }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const update = useCallback((patch: Partial<ReadingSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      writeStorage(SETTINGS_KEY, next)
      applyReadingSettings(next)
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    writeStorage(SETTINGS_KEY, DEFAULT_SETTINGS)
    applyReadingSettings(DEFAULT_SETTINGS)
  }, [])

  return { settings, update, reset }
}
```

> `--reader-paragraph-indent` 由 `paragraphIndent` 布尔映射为 `2em`/`0`；ChapterView 同时会加/去 `no-indent` 类（双保险）。段间距仅靠 `applyReadingSettings` 写入生效。

- [ ] **Step 8: 跑测试确认通过 + Commit**

Run: `cd reader && npx vitest run test/hooks`
Expected: useTheme / useReadingSettings 全 PASS。

```bash
git add reader/src/hooks/useTheme.ts reader/src/hooks/useReadingSettings.ts reader/test/hooks
git commit -m "feat(reader): useTheme / useReadingSettings（含 applyReadingSettings）+ 测试"
```

---

## Task 5: useChapters / useChapter / useReadingProgress 迁移

**目标**：三个数据 Hook 从 JS 迁到 TS，逻辑沿用旧代码，补类型。同时迁移测试为 TS，删除旧 `.js` hook 与旧测试。

**Files:**
- Create: `reader/src/hooks/{useChapters,useChapter,useReadingProgress}.ts`
- Test: `reader/test/hooks/{useChapters,useChapter,useReadingProgress}.test.ts`
- Delete: `reader/src/hooks/*.js`、`reader/test/hooks/*.test.js`、旧 `test/lib/*.test.js`、旧 `test/components/ChapterList.test.jsx`

- [ ] **Step 1: 迁移 useChapters + 测试**

Create `reader/src/hooks/useChapters.ts`：

```typescript
import { useEffect, useState, useCallback } from 'react'
import { buildIndexUrl } from '@lib/raw'
import type { ChapterIndex, LoadStatus } from '@app-types/chapter'

export function useChapters() {
  const [chapters, setChapters] = useState<ChapterIndex>([])
  const [status, setStatus] = useState<LoadStatus>('loading')
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setStatus('loading')
    setError(null)
    try {
      const res = await fetch(buildIndexUrl())
      if (!res.ok) throw new Error(`索引加载失败 (HTTP ${res.status})`)
      const data = await res.json()
      setChapters(Array.isArray(data) ? data : [])
      setStatus('success')
    } catch (e) {
      setError(e instanceof Error ? e.message : '未知错误')
      setStatus('error')
    }
  }, [])

  useEffect(() => { load() }, [load])

  const retry = useCallback(() => { load() }, [load])
  return { chapters, status, error, retry }
}
```

Create `reader/test/hooks/useChapters.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useChapters } from '@hooks/useChapters'

const mockIndex = [{ num: 1, title: '开始' }, { num: 2, title: '雨夜' }]

describe('useChapters', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => mockIndex })))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('加载成功后返回章节数组', async () => {
    const { result } = renderHook(() => useChapters())
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.chapters).toEqual(mockIndex)
  })

  it('HTTP 错误时进入 error 态', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 404, json: async () => ({}) })))
    const { result } = renderHook(() => useChapters())
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toContain('404')
  })
})
```

- [ ] **Step 2: 迁移 useChapter + 测试**

Create `reader/src/hooks/useChapter.ts`：

```typescript
import { useEffect, useState } from 'react'
import { buildChapterUrl } from '@lib/raw'
import { renderMarkdown } from '@lib/markdown'
import type { Chapter, LoadStatus } from '@app-types/chapter'

// 模块级缓存：章号 -> HTML。同章多次挂载只 fetch 一次。
const cache = new Map<number, string>()

export function __resetChapterCache(): void {
  cache.clear()
}

export function useChapter(chapter: Chapter | null) {
  const num = chapter?.num
  const [html, setHtml] = useState<string>(() => (num && cache.has(num)) ? cache.get(num)! : '')
  const [status, setStatus] = useState<LoadStatus>(() => (num && cache.has(num)) ? 'success' : 'loading')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!num) return
    if (cache.has(num)) {
      setHtml(cache.get(num)!)
      setStatus('success')
      return
    }
    let cancelled = false
    setStatus('loading')
    setError(null)
    fetch(buildChapterUrl(chapter!))
      .then(res => {
        if (!res.ok) throw new Error(`章节加载失败 (HTTP ${res.status})`)
        return res.text()
      })
      .then(md => renderMarkdown(md))
      .then(out => {
        cache.set(num, out)
        if (!cancelled) { setHtml(out); setStatus('success') }
      })
      .catch(e => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '未知错误')
          setStatus('error')
        }
      })
    return () => { cancelled = true }
  }, [num]) // eslint-disable-line react-hooks/exhaustive-deps

  return { html, status, error }
}
```

Create `reader/test/hooks/useChapter.test.ts`：

```typescript
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useChapter, __resetChapterCache } from '@hooks/useChapter'

describe('useChapter', () => {
  beforeEach(() => {
    __resetChapterCache()
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, text: async () => '# 正文' })))
  })
  afterEach(() => vi.unstubAllGlobals())

  it('加载成功渲染 HTML 并缓存', async () => {
    const ch = { num: 1, title: '开始' }
    const { result } = renderHook(() => useChapter(ch))
    await waitFor(() => expect(result.current.status).toBe('success'))
    expect(result.current.html).toContain('<h1>')
    const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length
    renderHook(() => useChapter(ch))
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(calls)
  })

  it('HTTP 错误进入 error 态', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, text: async () => '' })))
    const { result } = renderHook(() => useChapter({ num: 9, title: 'x' }))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(result.current.error).toContain('500')
  })

  it('chapter 为 null 时不请求', () => {
    renderHook(() => useChapter(null))
    expect((fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0)
  })
})
```

- [ ] **Step 3: 迁移 useReadingProgress + 测试**

Create `reader/src/hooks/useReadingProgress.ts`：

```typescript
import { useState, useCallback } from 'react'
import { readStorage, writeStorage } from '@lib/storage'

export const PROGRESS_KEY = 'sxcb-progress'

export interface Progress {
  num: number | null
  scrollTop: number
}

const DEFAULT_PROGRESS: Progress = { num: null, scrollTop: 0 }

export function useReadingProgress() {
  const [state, setState] = useState<Progress>(() => readStorage(PROGRESS_KEY, DEFAULT_PROGRESS))

  const save = useCallback((num: number | null, scrollTop: number) => {
    const next: Progress = { num, scrollTop }
    writeStorage(PROGRESS_KEY, next)
    setState(next)
  }, [])

  return { ...state, save }
}
```

Create `reader/test/hooks/useReadingProgress.test.ts`：

```typescript
import { describe, it, expect, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useReadingProgress, PROGRESS_KEY } from '@hooks/useReadingProgress'

describe('useReadingProgress', () => {
  beforeEach(() => localStorage.clear())

  it('默认无进度', () => {
    const { result } = renderHook(() => useReadingProgress())
    expect(result.current.num).toBeNull()
    expect(result.current.scrollTop).toBe(0)
  })

  it('save 写入并持久化', () => {
    const { result } = renderHook(() => useReadingProgress())
    act(() => result.current.save(3, 120))
    expect(result.current.num).toBe(3)
    expect(result.current.scrollTop).toBe(120)
    expect(JSON.parse(localStorage.getItem(PROGRESS_KEY)!)).toEqual({ num: 3, scrollTop: 120 })
  })

  it('刷新后恢复进度', () => {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify({ num: 5, scrollTop: 88 }))
    const { result } = renderHook(() => useReadingProgress())
    expect(result.current.num).toBe(5)
    expect(result.current.scrollTop).toBe(88)
  })
})
```

- [ ] **Step 4: 删除旧 JS hook 与旧测试**

```bash
cd reader
git rm src/hooks/useChapters.js src/hooks/useChapter.js src/hooks/useReadingProgress.js
git rm test/hooks/useChapters.test.js test/hooks/useChapter.test.js test/hooks/useReadingProgress.test.js
git rm test/lib/raw.test.js test/lib/markdown.test.js test/lib/theme.test.js test/components/ChapterList.test.jsx
```

> 旧 `test/lib/theme.test.js` 测旧 `lib/theme.js`（light/dark），新主题系统已替代。`theme.js` 本身在 Task 16 删（旧 App.jsx 还引用它）。

- [ ] **Step 5: 全量测试 + Commit**

Run: `cd reader && npm test`
Expected: lib / themes / hooks 全 PASS。

```bash
git add reader/src/hooks reader/test/hooks reader/test/lib
git commit -m "feat(reader): 数据 Hook TS 化迁移（useChapters/useChapter/useReadingProgress）"
```

---

## Task 6: UI 基础组件 — Button / Slider / ColorPicker / Tabs（受控）

**目标**：通用 UI 组件，供设置面板复用。Tabs 支持受控/非受控。

**Files:**
- Create: `reader/src/components/ui/{Button,Slider,ColorPicker,Tabs}.tsx`
- Test: `reader/test/components/ui.test.tsx`

- [ ] **Step 1: 写 UI 组件失败测试**

Create `reader/test/components/ui.test.tsx`：

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Button } from '@components/ui/Button'
import { Slider } from '@components/ui/Slider'
import { ColorPicker } from '@components/ui/ColorPicker'
import { Tabs } from '@components/ui/Tabs'

describe('Button', () => {
  it('点击触发 onClick，disabled 时不触发', () => {
    const onClick = vi.fn()
    const { rerender } = render(<Button onClick={onClick}>确定</Button>)
    fireEvent.click(screen.getByText('确定'))
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(<Button onClick={onClick} disabled>确定</Button>)
    fireEvent.click(screen.getByText('确定'))
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})

describe('Slider', () => {
  it('拖动触发 onChange 并显示当前值', () => {
    const onChange = vi.fn()
    render(<Slider label="字号" min={14} max={24} step={1} value={18} onChange={onChange} />)
    fireEvent.change(screen.getByRole('slider'), { target: { value: '20' } })
    expect(onChange).toHaveBeenCalledWith(20)
    expect(screen.getByText('字号')).toBeInTheDocument()
  })
})

describe('ColorPicker', () => {
  it('选择颜色触发 onChange', () => {
    const onChange = vi.fn()
    render(<ColorPicker label="背景色" value="#ffffff" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText('背景色'), { target: { value: '#123456' } })
    expect(onChange).toHaveBeenCalledWith('#123456')
  })
})

describe('Tabs', () => {
  const twoTabs = [
    { key: 'a', label: '主题', content: <div>主题面板</div> },
    { key: 'b', label: '排版', content: <div>排版面板</div> }
  ]

  it('非受控：切换 Tab 显示对应面板', () => {
    render(<Tabs tabs={twoTabs} />)
    expect(screen.getByText('主题面板')).toBeInTheDocument()
    fireEvent.click(screen.getByText('排版'))
    expect(screen.getByText('排版面板')).toBeInTheDocument()
    expect(screen.queryByText('主题面板')).not.toBeInTheDocument()
  })

  it('受控：activeKey 由父组件决定', () => {
    const { rerender } = render(<Tabs activeKey="a" onChange={() => {}} tabs={twoTabs} />)
    expect(screen.getByText('主题面板')).toBeInTheDocument()
    rerender(<Tabs activeKey="b" onChange={() => {}} tabs={twoTabs} />)
    expect(screen.getByText('排版面板')).toBeInTheDocument()
  })

  it('受控：点 Tab 触发 onChange 而不自行切换', () => {
    const onChange = vi.fn()
    render(<Tabs activeKey="a" onChange={onChange} tabs={twoTabs} />)
    fireEvent.click(screen.getByText('排版'))
    expect(onChange).toHaveBeenCalledWith('b')
    expect(screen.getByText('主题面板')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd reader && npx vitest run test/components/ui.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 实现 Button.tsx**

Create `reader/src/components/ui/Button.tsx`：

```tsx
import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'ghost'
}

export function Button({ children, variant = 'primary', disabled, className = '', ...rest }: ButtonProps) {
  const base = 'px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
  const styles = variant === 'primary'
    ? 'bg-accent text-bg hover:opacity-90'
    : 'bg-transparent text-fg border border-border hover:bg-highlight'
  return (
    <button className={`${base} ${styles} ${className}`} disabled={disabled} {...rest}>
      {children}
    </button>
  )
}
```

- [ ] **Step 4: 实现 Slider.tsx**

Create `reader/src/components/ui/Slider.tsx`：

```tsx
interface SliderProps {
  label: string
  min: number
  max: number
  step: number
  value: number
  onChange: (v: number) => void
  formatValue?: (v: number) => string
}

export function Slider({ label, min, max, step, value, onChange, formatValue }: SliderProps) {
  return (
    <label className="block mb-4">
      <span className="flex justify-between text-sm text-fg mb-1">
        <span>{label}</span>
        <span className="text-muted">{formatValue ? formatValue(value) : value}</span>
      </span>
      <input
        type="range"
        role="slider"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
    </label>
  )
}
```

- [ ] **Step 5: 实现 ColorPicker.tsx**

Create `reader/src/components/ui/ColorPicker.tsx`：

```tsx
interface ColorPickerProps {
  label: string
  value: string
  onChange: (v: string) => void
}

export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  return (
    <label className="flex items-center justify-between mb-3 gap-3">
      <span className="text-sm text-fg">{label}</span>
      <input
        type="color"
        aria-label={label}
        value={toHex6(value)}
        onChange={e => onChange(e.target.value)}
        className="w-10 h-8 rounded border border-border cursor-pointer bg-transparent"
      />
    </label>
  )
}

// input[type=color] 只接受 #rrggbb；rgba 等格式回退黑色避免报错
function toHex6(v: string): string {
  return /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#000000'
}
```

- [ ] **Step 6: 实现 Tabs.tsx（受控 / 非受控）**

Create `reader/src/components/ui/Tabs.tsx`：

```tsx
import { useState, type ReactNode } from 'react'

export interface TabItem {
  key: string
  label: string
  content: ReactNode
}

interface TabsProps {
  tabs: TabItem[]
  initialKey?: string          // 非受控：初始激活项
  activeKey?: string           // 受控：由父组件决定激活项
  onChange?: (key: string) => void
}

// 受控（传 activeKey + onChange）用于 PC 工具条点图标让面板跳对应 Tab；非受控（只传 initialKey）自管。
export function Tabs({ tabs, initialKey, activeKey, onChange }: TabsProps) {
  const [inner, setInner] = useState(initialKey ?? tabs[0]?.key)
  const active = activeKey ?? inner

  const handleSelect = (key: string) => {
    if (activeKey === undefined) setInner(key)
    onChange?.(key)
  }

  const current = tabs.find(t => t.key === active)
  return (
    <div>
      <div className="flex gap-1 border-b border-border mb-4">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => handleSelect(t.key)}
            className={`px-4 py-2 text-sm -mb-px border-b-2 transition-colors ${
              t.key === active
                ? 'border-accent text-accent font-medium'
                : 'border-transparent text-muted hover:text-fg'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div>{current?.content}</div>
    </div>
  )
}
```

- [ ] **Step 7: 跑测试确认通过 + Commit**

Run: `cd reader && npx vitest run test/components/ui.test.tsx`
Expected: PASS。

```bash
git add reader/src/components/ui reader/test/components/ui.test.tsx
git commit -m "feat(reader): 通用 UI 组件 Button/Slider/ColorPicker/Tabs（Tabs 受控）"
```

---

## Task 7: index.css — @theme + 断点 + 阅读变量

**目标**：全站样式入口。**只改 index.css，不动 main.tsx。** 含 720px 断点覆盖。

**Files:**
- Replace: `reader/src/index.css`

- [ ] **Step 1: 写正式 index.css**

Replace `reader/src/index.css`：

```css
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@theme {
  /* 6 个主题色槽位 — 默认值（日间白），运行时由 applyTheme 覆盖 */
  --color-bg: #ffffff;
  --color-fg: #1a1a1a;
  --color-accent: #8b5a2b;
  --color-muted: #666666;
  --color-border: #e0ddd5;
  --color-highlight: rgba(139, 90, 43, 0.12);

  /* 阅读设置变量 — 运行时由 applyReadingSettings 写入 <html> */
  --reader-font-size: 18px;
  --reader-line-height: 1.9;
  --reader-letter-spacing: 0px;
  --reader-content-width: 720px;
  --reader-paragraph-spacing: 1em;
  --reader-paragraph-indent: 2em;

  /* PC/移动端分界：设计要求 720px（Tailwind 默认 md 是 768px，这里覆盖） */
  --breakpoint-md: 720px;

  /* 字体 */
  --font-serif: "Noto Serif SC", "Songti SC", serif;
  --font-sans: "Noto Sans SC", "PingFang SC", sans-serif;
  --font-kai: "Kaiti SC", "KaiTi", serif;
}

html, body, #root {
  height: 100%;
}

body {
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: var(--font-serif);
  transition: background-color 0.2s ease, color 0.2s ease;
}

/* 正文排版：字号/行距/字间距/段间距/缩进由 --reader-* 变量驱动 */
.chapter-body {
  font-size: var(--reader-font-size);
  line-height: var(--reader-line-height);
  letter-spacing: var(--reader-letter-spacing);
}
.chapter-body p {
  margin-bottom: var(--reader-paragraph-spacing);
  text-indent: var(--reader-paragraph-indent);
}
.chapter-body.no-indent p {
  text-indent: 0;
}
```

- [ ] **Step 2: 验证 Tailwind 编译**

Run: `cd reader && npm run build`
Expected: 构建成功，dist CSS 含 `@theme` 变量与 `.bg-bg` 等工具类。可 `grep -r "color-bg" dist/assets/*.css` 确认。

- [ ] **Step 3: Commit**

```bash
git add reader/src/index.css
git commit -m "feat(reader): Tailwind v4 @theme 主题变量 + 720 断点 + 阅读设置 CSS"
```

---

## Task 8: ChapterList / NavButtons / LoadingError

**目标**：三个基础阅读组件的 TS 化，样式用 Tailwind。

**Files:**
- Create: `reader/src/components/reader/{ChapterList,NavButtons,LoadingError}.tsx`
- Test: `reader/test/components/{ChapterList,NavButtons,LoadingError}.test.tsx`

- [ ] **Step 1: 写 ChapterList / NavButtons 失败测试**

Create `reader/test/components/ChapterList.test.tsx`：

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ChapterList } from '@components/reader/ChapterList'

const chapters = [
  { num: 1, title: '开始' },
  { num: 2, title: '雨夜' },
  { num: 3, title: '归途' }
]

describe('ChapterList', () => {
  it('渲染全部章节', () => {
    render(<ChapterList chapters={chapters} currentNum={2} onSelect={() => {}} />)
    expect(screen.getByText(/开始/)).toBeInTheDocument()
    expect(screen.getByText(/雨夜/)).toBeInTheDocument()
    expect(screen.getByText(/归途/)).toBeInTheDocument()
  })

  it('当前章节带 active 标记', () => {
    render(<ChapterList chapters={chapters} currentNum={2} onSelect={() => {}} />)
    const activeBtn = screen.getByText(/雨夜/).closest('button')!
    expect(activeBtn.className).toMatch(/bg-highlight|text-accent/)
  })

  it('点击章节触发 onSelect', () => {
    const onSelect = vi.fn()
    render(<ChapterList chapters={chapters} currentNum={1} onSelect={onSelect} />)
    fireEvent.click(screen.getByText(/归途/))
    expect(onSelect).toHaveBeenCalledWith(3)
  })
})
```

Create `reader/test/components/NavButtons.test.tsx`：

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NavButtons } from '@components/reader/NavButtons'

describe('NavButtons', () => {
  it('hasPrev/hasNext 为 false 时按钮禁用', () => {
    render(<NavButtons hasPrev={false} hasNext={false} onPrev={() => {}} onNext={() => {}} />)
    expect(screen.getByText('上一章')).toBeDisabled()
    expect(screen.getByText('下一章')).toBeDisabled()
  })

  it('点击触发回调', () => {
    const onPrev = vi.fn(); const onNext = vi.fn()
    render(<NavButtons hasPrev hasNext onPrev={onPrev} onNext={onNext} />)
    fireEvent.click(screen.getByText('上一章'))
    fireEvent.click(screen.getByText('下一章'))
    expect(onPrev).toHaveBeenCalled()
    expect(onNext).toHaveBeenCalled()
  })
})
```

Create `reader/test/components/LoadingError.test.tsx`：

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LoadingError } from '@components/reader/LoadingError'

describe('LoadingError', () => {
  it('loading 时显示加载提示', () => {
    render(<LoadingError status="loading" error={null} />)
    expect(screen.getByText('加载中…')).toBeInTheDocument()
  })

  it('error 时显示错误文本与重试按钮', () => {
    render(<LoadingError status="error" error="网络错误" onRetry={() => {}} />)
    expect(screen.getByText('网络错误')).toBeInTheDocument()
    expect(screen.getByText('重试')).toBeInTheDocument()
  })

  it('点重试触发 onRetry', () => {
    const onRetry = vi.fn()
    render(<LoadingError status="error" error="失败" onRetry={onRetry} />)
    fireEvent.click(screen.getByText('重试'))
    expect(onRetry).toHaveBeenCalled()
  })

  it('error 但无 onRetry 时不显示重试按钮', () => {
    render(<LoadingError status="error" error="失败" />)
    expect(screen.queryByText('重试')).not.toBeInTheDocument()
  })

  it('success 时不渲染任何内容', () => {
    const { container } = render(<LoadingError status="success" error={null} />)
    expect(container.firstChild).toBeNull()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd reader && npx vitest run test/components/ChapterList.test.tsx test/components/NavButtons.test.tsx test/components/LoadingError.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 实现 ChapterList.tsx**

Create `reader/src/components/reader/ChapterList.tsx`：

```tsx
import type { ChapterIndex } from '@app-types/chapter'

interface ChapterListProps {
  chapters: ChapterIndex
  currentNum: number | null
  onSelect: (num: number) => void
}

export function ChapterList({ chapters, currentNum, onSelect }: ChapterListProps) {
  return (
    <nav aria-label="章节目录" className="overflow-y-auto">
      <ul>
        {chapters.map(ch => {
          const active = ch.num === currentNum
          return (
            <li key={ch.num}>
              <button
                onClick={() => onSelect(ch.num)}
                className={`w-full text-left px-4 py-2 text-sm truncate transition-colors ${
                  active
                    ? 'bg-highlight text-accent font-medium'
                    : 'text-muted hover:bg-highlight hover:text-fg'
                }`}
              >
                第{ch.num}章 {ch.title}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
```

- [ ] **Step 4: 实现 NavButtons.tsx**

Create `reader/src/components/reader/NavButtons.tsx`：

```tsx
interface NavButtonsProps {
  hasPrev: boolean
  hasNext: boolean
  onPrev: () => void
  onNext: () => void
}

export function NavButtons({ hasPrev, hasNext, onPrev, onNext }: NavButtonsProps) {
  const cls = 'px-4 py-2 rounded border border-border text-sm text-fg transition-colors hover:bg-highlight disabled:opacity-40 disabled:cursor-not-allowed'
  return (
    <div className="flex justify-between gap-4 my-8">
      <button className={cls} onClick={onPrev} disabled={!hasPrev}>上一章</button>
      <button className={cls} onClick={onNext} disabled={!hasNext}>下一章</button>
    </div>
  )
}
```

- [ ] **Step 5: 实现 LoadingError.tsx**

Create `reader/src/components/reader/LoadingError.tsx`：

```tsx
import type { LoadStatus } from '@app-types/chapter'

interface LoadingErrorProps {
  status: LoadStatus
  error: string | null
  onRetry?: () => void
}

export function LoadingError({ status, error, onRetry }: LoadingErrorProps) {
  if (status === 'loading') {
    return <div className="py-16 text-center text-muted">加载中…</div>
  }
  if (status === 'error') {
    return (
      <div className="py-16 text-center">
        <p className="text-fg mb-4">{error ?? '加载失败'}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 rounded bg-accent text-bg text-sm hover:opacity-90"
          >
            重试
          </button>
        )}
      </div>
    )
  }
  return null
}
```

- [ ] **Step 6: 跑测试确认通过 + Commit**

Run: `cd reader && npx vitest run test/components`
Expected: 全 PASS。

```bash
git add reader/src/components/reader reader/test/components
git commit -m "feat(reader): ChapterList/NavButtons/LoadingError 组件"
```

---

## Task 9: ChapterView — 滚动模式正文渲染 + 阅读设置应用

**目标**：正文渲染（滚动模式；翻页在 Task 15 扩展）。`settings` 设为**可选**（默认 `DEFAULT_SETTINGS`），使旧 App.jsx 过渡期不传也能编译。

**Files:**
- Create: `reader/src/components/reader/ChapterView.tsx`
- Test: `reader/test/components/ChapterView.test.tsx`

- [ ] **Step 1: 写 ChapterView 失败测试**

Create `reader/test/components/ChapterView.test.tsx`：

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ChapterView } from '@components/reader/ChapterView'
import { DEFAULT_SETTINGS } from '@app-types/settings'

const chapter = { num: 1, title: '开始' }

describe('ChapterView', () => {
  it('success 时渲染标题与正文 HTML', () => {
    render(<ChapterView chapter={chapter} status="success" error={null} html="<p>正文内容</p>" settings={DEFAULT_SETTINGS} />)
    expect(screen.getByText(/第1章/)).toBeInTheDocument()
    expect(screen.getByText('正文内容')).toBeInTheDocument()
  })

  it('不传 settings 时用默认值正常渲染', () => {
    render(<ChapterView chapter={chapter} status="success" error={null} html="<p>默认渲染</p>" />)
    expect(screen.getByText('默认渲染')).toBeInTheDocument()
  })

  it('正文容器应用字号与行距内联样式', () => {
    const { container } = render(
      <ChapterView chapter={chapter} status="success" error={null} html="<p>x</p>"
        settings={{ ...DEFAULT_SETTINGS, fontSize: 22, lineHeight: 2.2 }} />
    )
    const body = container.querySelector('.chapter-body') as HTMLElement
    expect(body.style.fontSize).toBe('22px')
    expect(body.style.lineHeight).toBe('2.2')
  })

  it('paragraphIndent=false 时加 no-indent 类', () => {
    const { container } = render(
      <ChapterView chapter={chapter} status="success" error={null} html="<p>x</p>"
        settings={{ ...DEFAULT_SETTINGS, paragraphIndent: false }} />
    )
    expect(container.querySelector('.chapter-body')!.className).toContain('no-indent')
  })

  it('error 时显示错误与重试', () => {
    render(<ChapterView chapter={chapter} status="error" error="网络错误" html="" settings={DEFAULT_SETTINGS} onRetry={() => {}} />)
    expect(screen.getByText('网络错误')).toBeInTheDocument()
    expect(screen.getByText('重试')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd reader && npx vitest run test/components/ChapterView.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 实现 ChapterView.tsx**

Create `reader/src/components/reader/ChapterView.tsx`：

```tsx
import type { Chapter, LoadStatus } from '@app-types/chapter'
import type { ReadingSettings } from '@app-types/settings'
import { DEFAULT_SETTINGS } from '@app-types/settings'
import { LoadingError } from './LoadingError'

// settings 可选：旧 App.jsx 过渡期不传也能编译/渲染（用默认值），Task 14 起由 App 正式传入。
interface ChapterViewProps {
  chapter: Chapter | null
  status: LoadStatus
  error: string | null
  html: string
  settings?: ReadingSettings
  onRetry?: () => void
}

const FONT_FAMILY_VAR: Record<ReadingSettings['fontFamily'], string> = {
  serif: 'var(--font-serif)',
  sans: 'var(--font-sans)',
  kai: 'var(--font-kai)'
}

export function ChapterView({ chapter, status, error, html, settings = DEFAULT_SETTINGS, onRetry }: ChapterViewProps) {
  return (
    <article
      className="mx-auto px-4 text-fg"
      style={{ maxWidth: settings.contentWidth }}
    >
      <LoadingError status={status} error={error} onRetry={onRetry} />
      {status === 'success' && chapter && (
        <>
          <h1
            className="text-accent font-bold mb-6"
            style={{ fontSize: `calc(${settings.fontSize}px + 6px)` }}
          >
            第{chapter.num}章 {chapter.title}
          </h1>
          <div
            className={`chapter-body prose max-w-none ${settings.paragraphIndent ? '' : 'no-indent'}`}
            style={{
              fontSize: settings.fontSize,
              lineHeight: settings.lineHeight,
              letterSpacing: settings.letterSpacing,
              fontFamily: FONT_FAMILY_VAR[settings.fontFamily]
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </>
      )}
    </article>
  )
}
```

> `prose` 来自 `@tailwindcss/typography`；动态值用内联 style 覆盖。段间距/缩进由 index.css 的 `--reader-*` 变量驱动（靠 Task 4 的 `applyReadingSettings` 写入），`no-indent` 类做缩进的双保险。

- [ ] **Step 4: 跑测试确认通过 + Commit**

Run: `cd reader && npx vitest run test/components/ChapterView.test.tsx`
Expected: PASS。

```bash
git add reader/src/components/reader/ChapterView.tsx reader/test/components/ChapterView.test.tsx
git commit -m "feat(reader): ChapterView 滚动模式正文渲染 + 阅读设置应用"
```

---

## Task 10: Sidebar — PC 侧边栏 / 移动端抽屉

**目标**：目录容器。PC（>720px）固定左侧栏；移动端（≤720px）左侧滑出抽屉 + 遮罩。断点用 Task 7 已定义的 `--breakpoint-md: 720px`，直接 `md:` 前缀即可。

**Files:**
- Create: `reader/src/components/layout/Sidebar.tsx`
- Test: `reader/test/components/Sidebar.test.tsx`

- [ ] **Step 1: 写 Sidebar 失败测试**

Create `reader/test/components/Sidebar.test.tsx`：

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { Sidebar } from '@components/layout/Sidebar'

const chapters = [{ num: 1, title: '开始' }]

describe('Sidebar', () => {
  it('渲染书名与章节列表', () => {
    render(<Sidebar open={false} chapters={chapters} currentNum={1} onSelect={() => {}} onClose={() => {}} />)
    expect(screen.getByText('时序残本')).toBeInTheDocument()
    expect(screen.getByText(/开始/)).toBeInTheDocument()
  })

  it('点关闭按钮触发 onClose', () => {
    const onClose = vi.fn()
    render(<Sidebar open chapters={chapters} currentNum={1} onSelect={() => {}} onClose={onClose} />)
    fireEvent.click(screen.getByLabelText('关闭目录'))
    expect(onClose).toHaveBeenCalled()
  })

  it('点遮罩触发 onClose', () => {
    const onClose = vi.fn()
    const { container } = render(<Sidebar open chapters={chapters} currentNum={1} onSelect={() => {}} onClose={onClose} />)
    fireEvent.click(container.querySelector('[data-testid="sidebar-overlay"]')!)
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd reader && npx vitest run test/components/Sidebar.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 实现 Sidebar.tsx**

Create `reader/src/components/layout/Sidebar.tsx`：

```tsx
import type { ChapterIndex } from '@app-types/chapter'
import { ChapterList } from '@components/reader/ChapterList'

interface SidebarProps {
  open: boolean                 // 移动端抽屉是否展开（PC 端忽略）
  chapters: ChapterIndex
  currentNum: number | null
  onSelect: (num: number) => void
  onClose: () => void
}

export function Sidebar({ open, chapters, currentNum, onSelect, onClose }: SidebarProps) {
  return (
    <>
      {/* 移动端遮罩 */}
      <div
        data-testid="sidebar-overlay"
        onClick={onClose}
        className={`fixed inset-0 bg-black/40 z-30 transition-opacity md:hidden ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />
      <aside
        className={`
          fixed top-0 left-0 h-full w-60 z-40 bg-bg border-r border-border
          flex flex-col transition-transform duration-200
          md:static md:translate-x-0 md:z-auto md:h-auto md:shrink-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h2 className="text-accent font-bold">时序残本</h2>
          <button
            aria-label="关闭目录"
            onClick={onClose}
            className="text-muted hover:text-fg md:hidden"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <ChapterList chapters={chapters} currentNum={currentNum} onSelect={onSelect} />
        </div>
      </aside>
    </>
  )
}
```

> `--breakpoint-md: 720px` 已在 Task 7 定义，本任务直接用 `md:` 前缀，无需再改 CSS。

- [ ] **Step 4: 跑测试确认通过 + Commit**

Run: `cd reader && npx vitest run test/components/Sidebar.test.tsx`
Expected: PASS。

```bash
git add reader/src/components/layout reader/test/components/Sidebar.test.tsx
git commit -m "feat(reader): Sidebar 目录侧边栏（PC 固定 / 移动端抽屉）"
```

---

## Task 11: SettingsPanel + 三 Tab（受控 activeTab）

**目标**：设置面板容器 + 主题/排版/阅读三页。`activeTab` 受控，供 PC 工具条点图标跳对应 Tab。PC 与移动端共用。

**Files:**
- Create: `reader/src/components/settings/{SettingsPanel,ThemeTab,TypographyTab,ReadingTab}.tsx`
- Create: `reader/src/components/settings/ThemeCustomizer.tsx`（占位，Task 12 替换）
- Test: `reader/test/components/SettingsPanel.test.tsx`

- [ ] **Step 1: 写 SettingsPanel 失败测试**

Create `reader/test/components/SettingsPanel.test.tsx`：

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SettingsPanel } from '@components/settings/SettingsPanel'
import { PRESET_THEMES } from '@themes/presets'
import { DEFAULT_SETTINGS } from '@app-types/settings'

function makeProps() {
  return {
    theme: PRESET_THEMES[0],
    onSetTheme: vi.fn(),
    onCustomizeColor: vi.fn(),
    settings: DEFAULT_SETTINGS,
    onUpdateSettings: vi.fn(),
    onResetSettings: vi.fn()
  }
}

describe('SettingsPanel', () => {
  it('默认显示主题 Tab，含 8 套预设', () => {
    render(<SettingsPanel {...makeProps()} />)
    expect(screen.getByText('日间白')).toBeInTheDocument()
    expect(screen.getByText('深蓝夜')).toBeInTheDocument()
  })

  it('受控 activeTab="typography" 直接显示排版面板', () => {
    render(<SettingsPanel {...makeProps()} activeTab="typography" onTabChange={() => {}} />)
    expect(screen.getByText('字号')).toBeInTheDocument()
    expect(screen.getByText('行距')).toBeInTheDocument()
  })

  it('受控 activeTab="reading" 直接显示阅读面板', () => {
    render(<SettingsPanel {...makeProps()} activeTab="reading" onTabChange={() => {}} />)
    expect(screen.getByText('翻页模式')).toBeInTheDocument()
    expect(screen.getByText('亮度')).toBeInTheDocument()
  })

  it('点预设主题触发 onSetTheme', () => {
    const props = makeProps()
    render(<SettingsPanel {...props} />)
    fireEvent.click(screen.getByText('夜间黑'))
    expect(props.onSetTheme).toHaveBeenCalledWith(expect.objectContaining({ name: 'night' }))
  })

  it('排版 Tab 调字号触发 onUpdateSettings', () => {
    const props = makeProps()
    render(<SettingsPanel {...props} activeTab="typography" onTabChange={() => {}} />)
    fireEvent.change(screen.getByRole('slider', { name: '字号' }), { target: { value: '22' } })
    expect(props.onUpdateSettings).toHaveBeenCalledWith({ fontSize: 22 })
  })

  it('受控时点 Tab 触发 onTabChange', () => {
    const onTabChange = vi.fn()
    render(<SettingsPanel {...makeProps()} activeTab="theme" onTabChange={onTabChange} />)
    fireEvent.click(screen.getByRole('button', { name: '排版' }))
    expect(onTabChange).toHaveBeenCalledWith('typography')
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd reader && npx vitest run test/components/SettingsPanel.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 实现 ThemeTab.tsx**

Create `reader/src/components/settings/ThemeTab.tsx`：

```tsx
import type { Theme } from '@app-types/theme'
import { PRESET_THEMES } from '@themes/presets'

interface ThemeTabProps {
  theme: Theme
  onSetTheme: (t: Theme) => void
  onOpenCustomizer: () => void
}

export function ThemeTab({ theme, onSetTheme, onOpenCustomizer }: ThemeTabProps) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-2 mb-4">
        {PRESET_THEMES.map(t => (
          <button
            key={t.name}
            onClick={() => onSetTheme(t)}
            className={`flex flex-col items-center gap-1 p-2 rounded border transition-colors ${
              theme.name === t.name ? 'border-accent' : 'border-border hover:border-muted'
            }`}
          >
            <span className="w-8 h-8 rounded-full border border-border" style={{ background: t.colors.bg }} />
            <span className="text-xs text-fg">{t.label}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onOpenCustomizer}
        className="w-full py-2 rounded border border-dashed border-muted text-sm text-muted hover:text-fg hover:border-fg transition-colors"
      >
        {theme.isCustom ? '编辑我的主题' : '自定义配色…'}
      </button>
    </div>
  )
}
```

- [ ] **Step 4: 实现 TypographyTab.tsx**

Create `reader/src/components/settings/TypographyTab.tsx`：

```tsx
import type { ReadingSettings, FontFamily } from '@app-types/settings'
import { Slider } from '@components/ui/Slider'

interface TypographyTabProps {
  settings: ReadingSettings
  onUpdate: (patch: Partial<ReadingSettings>) => void
}

const FONT_OPTIONS: { value: FontFamily; label: string }[] = [
  { value: 'serif', label: '衬线' },
  { value: 'sans', label: '无衬线' },
  { value: 'kai', label: '楷体' }
]

export function TypographyTab({ settings, onUpdate }: TypographyTabProps) {
  return (
    <div>
      <div className="mb-4">
        <span className="block text-sm text-fg mb-2">字体</span>
        <div className="flex gap-2">
          {FONT_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => onUpdate({ fontFamily: o.value })}
              className={`flex-1 py-1.5 rounded border text-sm transition-colors ${
                settings.fontFamily === o.value ? 'border-accent text-accent' : 'border-border text-muted hover:text-fg'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <Slider label="字号" min={14} max={24} step={1} value={settings.fontSize}
        onChange={v => onUpdate({ fontSize: v })} formatValue={v => `${v}px`} />
      <Slider label="行距" min={1.5} max={2.5} step={0.1} value={settings.lineHeight}
        onChange={v => onUpdate({ lineHeight: v })} formatValue={v => v.toFixed(1)} />
      <Slider label="字间距" min={0} max={4} step={0.5} value={settings.letterSpacing}
        onChange={v => onUpdate({ letterSpacing: v })} formatValue={v => `${v}px`} />
    </div>
  )
}
```

- [ ] **Step 5: 实现 ReadingTab.tsx**

Create `reader/src/components/settings/ReadingTab.tsx`：

```tsx
import type { ReadingSettings, PageMode } from '@app-types/settings'
import { Slider } from '@components/ui/Slider'

interface ReadingTabProps {
  settings: ReadingSettings
  onUpdate: (patch: Partial<ReadingSettings>) => void
}

const PAGE_MODE_OPTIONS: { value: PageMode; label: string }[] = [
  { value: 'scroll', label: '滚动' },
  { value: 'horizontal', label: '左右翻页' },
  { value: 'vertical', label: '上下翻页' }
]

export function ReadingTab({ settings, onUpdate }: ReadingTabProps) {
  return (
    <div>
      <div className="mb-4">
        <span className="block text-sm text-fg mb-2">翻页模式</span>
        <div className="flex gap-2">
          {PAGE_MODE_OPTIONS.map(o => (
            <button
              key={o.value}
              onClick={() => onUpdate({ pageMode: o.value })}
              className={`flex-1 py-1.5 rounded border text-sm transition-colors ${
                settings.pageMode === o.value ? 'border-accent text-accent' : 'border-border text-muted hover:text-fg'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <Slider label="段间距" min={0.5} max={2} step={0.1} value={settings.paragraphSpacing}
        onChange={v => onUpdate({ paragraphSpacing: v })} formatValue={v => `${v.toFixed(1)}em`} />
      <Slider label="页宽" min={600} max={900} step={10} value={settings.contentWidth}
        onChange={v => onUpdate({ contentWidth: v })} formatValue={v => `${v}px`} />
      <Slider label="亮度" min={0.3} max={1} step={0.05} value={settings.brightness}
        onChange={v => onUpdate({ brightness: v })} formatValue={v => `${Math.round(v * 100)}%`} />
      <label className="flex items-center justify-between mt-2">
        <span className="text-sm text-fg">首行缩进</span>
        <input
          type="checkbox"
          checked={settings.paragraphIndent}
          onChange={e => onUpdate({ paragraphIndent: e.target.checked })}
          className="w-4 h-4 accent-accent"
        />
      </label>
    </div>
  )
}
```

- [ ] **Step 6: 实现 SettingsPanel.tsx（受控 activeTab）+ ThemeCustomizer 占位**

Create `reader/src/components/settings/SettingsPanel.tsx`：

```tsx
import { useState } from 'react'
import type { Theme } from '@app-types/theme'
import type { ReadingSettings } from '@app-types/settings'
import { Tabs } from '@components/ui/Tabs'
import { ThemeTab } from './ThemeTab'
import { TypographyTab } from './TypographyTab'
import { ReadingTab } from './ReadingTab'
import { ThemeCustomizer } from './ThemeCustomizer'

export type SettingsTabKey = 'theme' | 'typography' | 'reading'

interface SettingsPanelProps {
  theme: Theme
  onSetTheme: (t: Theme) => void
  onCustomizeColor: (key: keyof Theme['colors'], value: string) => void
  settings: ReadingSettings
  onUpdateSettings: (patch: Partial<ReadingSettings>) => void
  onResetSettings: () => void
  activeTab?: SettingsTabKey                    // 受控：PC 工具条点哪个图标显示哪个 Tab
  onTabChange?: (key: SettingsTabKey) => void
}

export function SettingsPanel(props: SettingsPanelProps) {
  const { theme, onSetTheme, onCustomizeColor, settings, onUpdateSettings, activeTab, onTabChange } = props
  const [customizing, setCustomizing] = useState(false)

  if (customizing) {
    return (
      <ThemeCustomizer
        theme={theme}
        onChange={onCustomizeColor}
        onBack={() => setCustomizing(false)}
      />
    )
  }

  return (
    <Tabs
      activeKey={activeTab}
      onChange={k => onTabChange?.(k as SettingsTabKey)}
      tabs={[
        { key: 'theme', label: '主题',
          content: <ThemeTab theme={theme} onSetTheme={onSetTheme} onOpenCustomizer={() => setCustomizing(true)} /> },
        { key: 'typography', label: '排版',
          content: <TypographyTab settings={settings} onUpdate={onUpdateSettings} /> },
        { key: 'reading', label: '阅读',
          content: <ReadingTab settings={settings} onUpdate={onUpdateSettings} /> }
      ]}
    />
  )
}
```

Create 占位 `reader/src/components/settings/ThemeCustomizer.tsx`（Task 12 替换）：

```tsx
import type { Theme, ThemeColors } from '@app-types/theme'

interface ThemeCustomizerProps {
  theme: Theme
  onChange: (key: keyof ThemeColors, value: string) => void
  onBack: () => void
}

export function ThemeCustomizer(_props: ThemeCustomizerProps) {
  return <div>自定义主题（Task 12 实现）</div>
}
```

- [ ] **Step 7: 跑测试确认通过 + Commit**

Run: `cd reader && npx vitest run test/components/SettingsPanel.test.tsx`
Expected: PASS。

```bash
git add reader/src/components/settings reader/test/components/SettingsPanel.test.tsx
git commit -m "feat(reader): SettingsPanel 三 Tab（受控 activeTab）"
```

---

## Task 12: ThemeCustomizer — 6 色自定义

**目标**：6 色调色板，修改任一色即生成"我的主题"。替换 Task 11 占位组件。

**Files:**
- Replace: `reader/src/components/settings/ThemeCustomizer.tsx`
- Test: `reader/test/components/ThemeCustomizer.test.tsx`

- [ ] **Step 1: 写 ThemeCustomizer 失败测试**

Create `reader/test/components/ThemeCustomizer.test.tsx`：

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ThemeCustomizer } from '@components/settings/ThemeCustomizer'
import { PRESET_THEMES } from '@themes/presets'

describe('ThemeCustomizer', () => {
  it('渲染 6 个颜色选择器', () => {
    render(<ThemeCustomizer theme={PRESET_THEMES[0]} onChange={() => {}} onBack={() => {}} />)
    expect(screen.getByLabelText('背景色')).toBeInTheDocument()
    expect(screen.getByLabelText('文字色')).toBeInTheDocument()
    expect(screen.getByLabelText('强调色')).toBeInTheDocument()
    expect(screen.getByLabelText('次要文字')).toBeInTheDocument()
    expect(screen.getByLabelText('边框色')).toBeInTheDocument()
    expect(screen.getByLabelText('选中高亮')).toBeInTheDocument()
  })

  it('改背景色触发 onChange("bg", value)', () => {
    const onChange = vi.fn()
    render(<ThemeCustomizer theme={PRESET_THEMES[0]} onChange={onChange} onBack={() => {}} />)
    fireEvent.change(screen.getByLabelText('背景色'), { target: { value: '#123456' } })
    expect(onChange).toHaveBeenCalledWith('bg', '#123456')
  })

  it('点返回触发 onBack', () => {
    const onBack = vi.fn()
    render(<ThemeCustomizer theme={PRESET_THEMES[0]} onChange={() => {}} onBack={onBack} />)
    fireEvent.click(screen.getByText('返回'))
    expect(onBack).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd reader && npx vitest run test/components/ThemeCustomizer.test.tsx`
Expected: FAIL（占位组件无这些元素）。

- [ ] **Step 3: 实现 ThemeCustomizer.tsx**

Replace `reader/src/components/settings/ThemeCustomizer.tsx`：

```tsx
import type { Theme, ThemeColors } from '@app-types/theme'
import { ColorPicker } from '@components/ui/ColorPicker'

interface ThemeCustomizerProps {
  theme: Theme
  onChange: (key: keyof ThemeColors, value: string) => void
  onBack: () => void
}

const COLOR_FIELDS: { key: keyof ThemeColors; label: string }[] = [
  { key: 'bg', label: '背景色' },
  { key: 'fg', label: '文字色' },
  { key: 'accent', label: '强调色' },
  { key: 'muted', label: '次要文字' },
  { key: 'border', label: '边框色' },
  { key: 'highlight', label: '选中高亮' }
]

export function ThemeCustomizer({ theme, onChange, onBack }: ThemeCustomizerProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-fg">我的主题</h3>
        <button onClick={onBack} className="text-sm text-muted hover:text-fg">返回</button>
      </div>
      {/* 预览条 */}
      <div
        className="rounded p-3 mb-4 text-sm border"
        style={{ background: theme.colors.bg, color: theme.colors.fg, borderColor: theme.colors.border }}
      >
        预览：<span style={{ color: theme.colors.accent }}>章节标题</span> 与正文文字效果
      </div>
      {COLOR_FIELDS.map(f => (
        <ColorPicker
          key={f.key}
          label={f.label}
          value={theme.colors[f.key]}
          onChange={v => onChange(f.key, v)}
        />
      ))}
      <p className="text-xs text-muted mt-2">修改任意颜色即保存为"我的主题"</p>
    </div>
  )
}
```

- [ ] **Step 4: 跑测试确认通过 + Commit**

Run: `cd reader && npx vitest run test/components/ThemeCustomizer.test.tsx`
Expected: PASS。

```bash
git add reader/src/components/settings/ThemeCustomizer.tsx reader/test/components/ThemeCustomizer.test.tsx
git commit -m "feat(reader): ThemeCustomizer 6 色自定义主题"
```

---

## Task 13: FloatingToolbar（PC）+ BottomSheet（移动端）

**目标**：双端设置入口。PC 右侧悬浮工具条（点图标左侧弹 popover）；移动端底部按钮栏 + 底部滑出半屏弹层。

**Files:**
- Create: `reader/src/components/layout/{FloatingToolbar,BottomSheet}.tsx`
- Test: `reader/test/components/{FloatingToolbar,BottomSheet}.test.tsx`

- [ ] **Step 1: 写失败测试**

Create `reader/test/components/FloatingToolbar.test.tsx`：

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FloatingToolbar } from '@components/layout/FloatingToolbar'

describe('FloatingToolbar', () => {
  it('渲染主题/排版/阅读/回到顶部按钮', () => {
    render(
      <FloatingToolbar activePanel={null} onOpenPanel={() => {}} onClosePanel={() => {}} onBackToTop={() => {}}>
        <div>面板内容</div>
      </FloatingToolbar>
    )
    expect(screen.getByLabelText('主题')).toBeInTheDocument()
    expect(screen.getByLabelText('排版')).toBeInTheDocument()
    expect(screen.getByLabelText('阅读')).toBeInTheDocument()
    expect(screen.getByLabelText('回到顶部')).toBeInTheDocument()
  })

  it('点主题按钮触发 onOpenPanel("theme")', () => {
    const onOpenPanel = vi.fn()
    render(
      <FloatingToolbar activePanel={null} onOpenPanel={onOpenPanel} onClosePanel={() => {}} onBackToTop={() => {}}>
        <div />
      </FloatingToolbar>
    )
    fireEvent.click(screen.getByLabelText('主题'))
    expect(onOpenPanel).toHaveBeenCalledWith('theme')
  })

  it('activePanel 非空时显示 children 面板', () => {
    render(
      <FloatingToolbar activePanel="theme" onOpenPanel={() => {}} onClosePanel={() => {}} onBackToTop={() => {}}>
        <div>设置面板体</div>
      </FloatingToolbar>
    )
    expect(screen.getByText('设置面板体')).toBeInTheDocument()
  })

  it('点回到顶部触发 onBackToTop', () => {
    const onBackToTop = vi.fn()
    render(
      <FloatingToolbar activePanel={null} onOpenPanel={() => {}} onClosePanel={() => {}} onBackToTop={onBackToTop}>
        <div />
      </FloatingToolbar>
    )
    fireEvent.click(screen.getByLabelText('回到顶部'))
    expect(onBackToTop).toHaveBeenCalled()
  })

  it('打开面板时点外部遮罩触发 onClosePanel', () => {
    const onClosePanel = vi.fn()
    render(
      <FloatingToolbar activePanel="theme" onOpenPanel={() => {}} onClosePanel={onClosePanel} onBackToTop={() => {}}>
        <div>面板体</div>
      </FloatingToolbar>
    )
    fireEvent.click(screen.getByTestId('toolbar-backdrop'))
    expect(onClosePanel).toHaveBeenCalled()
  })

  it('关闭状态不渲染遮罩', () => {
    render(
      <FloatingToolbar activePanel={null} onOpenPanel={() => {}} onClosePanel={() => {}} onBackToTop={() => {}}>
        <div />
      </FloatingToolbar>
    )
    expect(screen.queryByTestId('toolbar-backdrop')).not.toBeInTheDocument()
  })
})
```

Create `reader/test/components/BottomSheet.test.tsx`：

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { BottomSheet } from '@components/layout/BottomSheet'

describe('BottomSheet', () => {
  it('open=false 时不渲染内容', () => {
    render(<BottomSheet open={false} title="设置" onClose={() => {}}><div>弹层内容</div></BottomSheet>)
    expect(screen.queryByText('弹层内容')).not.toBeInTheDocument()
  })

  it('open=true 时渲染标题与内容', () => {
    render(<BottomSheet open title="设置" onClose={() => {}}><div>弹层内容</div></BottomSheet>)
    expect(screen.getByText('设置')).toBeInTheDocument()
    expect(screen.getByText('弹层内容')).toBeInTheDocument()
  })

  it('点遮罩触发 onClose', () => {
    const onClose = vi.fn()
    const { container } = render(<BottomSheet open title="设置" onClose={onClose}><div>x</div></BottomSheet>)
    fireEvent.click(container.querySelector('[data-testid="sheet-overlay"]')!)
    expect(onClose).toHaveBeenCalled()
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd reader && npx vitest run test/components/FloatingToolbar.test.tsx test/components/BottomSheet.test.tsx`
Expected: FAIL。

- [ ] **Step 3: 实现 FloatingToolbar.tsx（含点外部关闭）**

Create `reader/src/components/layout/FloatingToolbar.tsx`：

```tsx
import type { ReactNode } from 'react'

export type ToolbarPanel = 'theme' | 'typography' | 'reading' | null

interface FloatingToolbarProps {
  activePanel: ToolbarPanel
  onOpenPanel: (p: Exclude<ToolbarPanel, null>) => void
  onClosePanel: () => void
  onBackToTop: () => void
  children: ReactNode   // SettingsPanel
}

const BUTTONS: { key: Exclude<ToolbarPanel, null>; label: string; icon: string }[] = [
  { key: 'theme', label: '主题', icon: '🎨' },
  { key: 'typography', label: '排版', icon: 'Aa' },
  { key: 'reading', label: '阅读', icon: '⚙' }
]

export function FloatingToolbar({ activePanel, onOpenPanel, onClosePanel, onBackToTop, children }: FloatingToolbarProps) {
  return (
    <div className="hidden md:block">
      {/* 打开面板时的全屏透明层：点外部关闭（设计 §5.1） */}
      {activePanel && (
        <div
          data-testid="toolbar-backdrop"
          onClick={onClosePanel}
          className="fixed inset-0 z-30"
        />
      )}
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40 flex items-center gap-2">
        {activePanel && (
          <div className="w-80 max-h-[70vh] overflow-y-auto bg-bg border border-border rounded-lg shadow-lg p-4">
            {children}
          </div>
        )}
        <div className="flex flex-col gap-1 bg-bg border border-border rounded-full shadow-lg p-1.5">
          {BUTTONS.map(b => (
            <button
              key={b.key}
              aria-label={b.label}
              title={b.label}
              onClick={() => (activePanel === b.key ? onClosePanel() : onOpenPanel(b.key))}
              className={`w-10 h-10 rounded-full text-sm flex items-center justify-center transition-colors ${
                activePanel === b.key ? 'bg-highlight text-accent' : 'text-muted hover:bg-highlight hover:text-fg'
              }`}
            >
              {b.icon}
            </button>
          ))}
          <button
            aria-label="回到顶部"
            title="回到顶部"
            onClick={onBackToTop}
            className="w-10 h-10 rounded-full text-sm flex items-center justify-center text-muted hover:bg-highlight hover:text-fg transition-colors"
          >
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: 实现 BottomSheet.tsx**

Create `reader/src/components/layout/BottomSheet.tsx`：

```tsx
import type { ReactNode } from 'react'

interface BottomSheetProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
}

export function BottomSheet({ open, title, onClose, children }: BottomSheetProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 md:hidden">
      <div data-testid="sheet-overlay" onClick={onClose} className="absolute inset-0 bg-black/40" />
      <div className="absolute bottom-0 left-0 right-0 max-h-[70vh] bg-bg rounded-t-2xl border-t border-border flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-fg font-medium">{title}</h3>
          <button aria-label="关闭" onClick={onClose} className="text-muted hover:text-fg">✕</button>
        </div>
        <div className="overflow-y-auto p-4">{children}</div>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: 跑测试确认通过 + Commit**

Run: `cd reader && npx vitest run test/components/FloatingToolbar.test.tsx test/components/BottomSheet.test.tsx`
Expected: PASS。

```bash
git add reader/src/components/layout/FloatingToolbar.tsx reader/src/components/layout/BottomSheet.tsx reader/test/components/FloatingToolbar.test.tsx reader/test/components/BottomSheet.test.tsx
git commit -m "feat(reader): FloatingToolbar(PC) + BottomSheet(移动端) 双端设置入口"
```

---

## Task 14: App.tsx 装配 + main.tsx 正式版

**目标**：把所有 Hook 与组件装配成完整应用（滚动模式可用）。逻辑沿用旧 App.jsx：初始章号 URL > 进度 > 第一章；切章写 URL + 进度 + 滚顶；滚动防抖存进度；恢复滚动位置；←/→ 键盘翻章。`restored` 在切章时重置；工具条与面板 Tab 串联；`<main>` 加底部留白防遮挡；含亮度遮罩。

**Files:**
- Create: `reader/src/App.tsx`
- Replace: `reader/src/main.tsx`（正式引入 App）
- Delete: `reader/src/App.jsx`、`reader/src/App.css`、`reader/src/main.jsx`

- [ ] **Step 1: 实现 App.tsx**

Create `reader/src/App.tsx`：

```tsx
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
  // 移动端 BottomSheet 打开设置时定位到哪个 Tab（设计 §5.2 的 主题/排版/阅读 入口）
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

      {/* 移动端底部按钮栏：目录 + 主题/排版/阅读 4 入口（设计 §5.2） */}
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
```

- [ ] **Step 2: 替换 main.tsx 为正式版**

Replace `reader/src/main.tsx`：

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
```

- [ ] **Step 3: 删除旧入口与旧 App**

```bash
cd reader
git rm src/App.jsx src/App.css src/main.jsx
```

- [ ] **Step 4: 验证编译与测试**

Run: `cd reader && npm run build`
Expected: TS + Vite 构建成功，无类型错误。

Run: `cd reader && npm test`
Expected: 全部测试 PASS。

- [ ] **Step 5: 手动冒烟（dev server）**

Run: `cd reader && npm run dev`，浏览器打开：
- 目录加载、选章、上一章/下一章可用
- PC 右侧悬浮工具条点开主题/排版/阅读，切预设主题即时变色，点图标面板跳对应 Tab
- 移动端（窗口调窄 ≤720px）底部"目录/设置"弹层可用，正文不被底栏遮挡
- 刷新后进度、主题、设置保持

- [ ] **Step 6: Commit**

```bash
git add reader/src/App.tsx reader/src/main.tsx
git commit -m "feat(reader): App 装配 — 状态串联/URL/进度恢复/键盘翻章/双端布局/亮度遮罩"
```

---

## Task 15: 翻页模式 — JS 分页 Paginator（左右 / 上下）

**目标**：在 ChapterView 内集成 `horizontal`（左右翻页）与 `vertical`（上下翻页）。JS 分页：离屏渲染全文量出每块高，按容器高切页，每次显示一页；页码作进度记忆（复用 `progress.scrollTop` 字段存页码）。`ResizeObserver` 已在 test/setup.ts polyfill，测试环境安全。

> 分页属视觉/布局逻辑，jsdom 测不准（按设计 §12 用 E2E 覆盖）。本任务只给纯函数 `splitIntoPages` 写单测，组件接线手动冒烟验证。

**Files:**
- Create: `reader/src/lib/paginate.ts`
- Create: `reader/src/components/reader/Paginator.tsx`
- Modify: `reader/src/components/reader/ChapterView.tsx`（按 pageMode 分支）
- Modify: `reader/src/App.tsx`（翻页模式存页码进度）
- Test: `reader/test/lib/paginate.test.ts`
- Test: `reader/test/components/Paginator.test.tsx`
- Modify: `reader/test/components/ChapterView.test.tsx`（补分页分支）

- [ ] **Step 1: 写 paginate 失败测试**

Create `reader/test/lib/paginate.test.ts`：

```typescript
import { describe, it, expect } from 'vitest'
import { splitIntoPages } from '@lib/paginate'

describe('splitIntoPages', () => {
  const heights = [100, 200, 100, 300, 100]

  it('按页高累计切分，块顺序不变', () => {
    const pages = splitIntoPages(heights, 300)
    expect(pages.length).toBeGreaterThan(1)
    expect(pages.flat()).toEqual([0, 1, 2, 3, 4])
  })

  it('单个块超高时独占一页', () => {
    expect(splitIntoPages([500, 100], 300)).toEqual([[0], [1]])
  })

  it('空数组返回空', () => {
    expect(splitIntoPages([], 300)).toEqual([])
  })
})
```

- [ ] **Step 2: 跑测试确认失败**

Run: `cd reader && npx vitest run test/lib/paginate.test.ts`
Expected: FAIL — 找不到 `@lib/paginate`。

- [ ] **Step 3: 实现 paginate.ts**

Create `reader/src/lib/paginate.ts`：

```typescript
// 把一组块高按页高贪心切分，返回每页包含的块下标数组。
// 单个块超过页高时独占一页（不拆分）。
export function splitIntoPages(blockHeights: number[], pageHeight: number): number[][] {
  if (blockHeights.length === 0) return []
  const pages: number[][] = []
  let current: number[] = []
  let used = 0
  blockHeights.forEach((h, i) => {
    if (h >= pageHeight) {
      if (current.length) { pages.push(current); current = []; used = 0 }
      pages.push([i])
      return
    }
    if (used + h > pageHeight && current.length) {
      pages.push(current)
      current = []
      used = 0
    }
    current.push(i)
    used += h
  })
  if (current.length) pages.push(current)
  return pages
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `cd reader && npx vitest run test/lib/paginate.test.ts`
Expected: PASS。

- [ ] **Step 5: 写 Paginator / ChapterView 分页分支测试（先失败）**

> 关键：jsdom 不做布局，`clientHeight`/`offsetHeight` 恒为 0，导致 Paginator 的 `measure()` 早退、`pages` 永远空。因此**必须 mock 这两个属性**才能测分页行为。

Create `reader/test/components/Paginator.test.tsx`：

```tsx
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Paginator } from '@components/reader/Paginator'

// 让容器 100px 高；每个块在 measureBlock 里临时设 data-measure-height 提供高度。
// 这里约定 measureBlock 优先读该 data 属性（见 Paginator 实现），3 块 × 40px → 两页（[2块][1块]）。
function mockLayout() {
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100)
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300)
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(40)
}

const html = '<p>第一段</p><p>第二段</p><p>第三段</p>'

describe('Paginator', () => {
  beforeEach(mockLayout)
  afterEach(() => vi.restoreAllMocks())

  it('按容器高度切分出多页并显示页码', async () => {
    render(<Paginator html={html} mode="horizontal" page={0} onPageChange={() => {}} />)
    await waitFor(() => expect(screen.getByText('1 / 2')).toBeInTheDocument())
  })

  it('左右翻页：点下一页更新页码并回调', async () => {
    const onPageChange = vi.fn()
    render(<Paginator html={html} mode="horizontal" page={0} onPageChange={onPageChange} />)
    await waitFor(() => expect(screen.getByText('1 / 2')).toBeInTheDocument())
    fireEvent.click(screen.getByLabelText('下一页'))
    expect(onPageChange).toHaveBeenCalledWith(1, 2)
  })

  it('第一页时上一页禁用', async () => {
    render(<Paginator html={html} mode="horizontal" page={0} onPageChange={() => {}} />)
    await waitFor(() => expect(screen.getByText('1 / 2')).toBeInTheDocument())
    expect(screen.getByLabelText('上一页')).toBeDisabled()
  })
})
```

在 `reader/test/components/ChapterView.test.tsx` **追加**分页分支用例（放现有 describe 内，并同样 mock 布局）：

```tsx
  it('pageMode=horizontal 时渲染翻页按钮（Paginator）', () => {
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(100)
    vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockReturnValue(50)
    render(
      <ChapterView chapter={chapter} status="success" error={null} html="<p>x</p><p>y</p>"
        settings={{ ...DEFAULT_SETTINGS, pageMode: 'horizontal' }} page={0} onPageChange={() => {}} />
    )
    expect(screen.getByLabelText('下一页')).toBeInTheDocument()
    vi.restoreAllMocks()
  })

  it('pageMode=scroll 时渲染滚动正文（无翻页按钮）', () => {
    render(
      <ChapterView chapter={chapter} status="success" error={null} html="<p>x</p>"
        settings={{ ...DEFAULT_SETTINGS, pageMode: 'scroll' }} />
    )
    expect(screen.queryByLabelText('下一页')).not.toBeInTheDocument()
  })
```

- [ ] **Step 6: 跑测试确认失败**

Run: `cd reader && npx vitest run test/components/Paginator.test.tsx test/components/ChapterView.test.tsx`
Expected: FAIL（Paginator 组件尚未实现）。

- [ ] **Step 7: 实现 Paginator.tsx**

Create `reader/src/components/reader/Paginator.tsx`：

```tsx
import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react'
import { splitIntoPages } from '@lib/paginate'

interface PaginatorProps {
  html: string
  mode: 'horizontal' | 'vertical'
  page: number                    // 受控当前页（父组件记进度）
  onPageChange: (page: number, total: number) => void
  className?: string
  style?: CSSProperties
}

// JS 分页：离屏渲染全文量出每个块高，按容器高切页，仅显示当前页的块。
export function Paginator({ html, mode, page, onPageChange, className = '', style }: PaginatorProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [pages, setPages] = useState<string[][]>([])
  const blocks = useMemo(() => splitBlocks(html), [html])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const measure = () => {
      const pageHeight = el.clientHeight
      if (!pageHeight) return
      const heights = blocks.map(b => measureBlock(b, el))
      const idxPages = splitIntoPages(heights, pageHeight)
      setPages(idxPages.map(idxArr => idxArr.map(i => blocks[i])))
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [blocks])

  const total = pages.length
  const safePage = Math.min(Math.max(page, 0), Math.max(total - 1, 0))

  useEffect(() => {
    if (total > 0) onPageChange(safePage, total)
  }, [safePage, total]) // eslint-disable-line react-hooks/exhaustive-deps

  const go = (delta: number) => {
    const next = Math.min(Math.max(safePage + delta, 0), total - 1)
    onPageChange(next, total)
  }

  return (
    <div className="relative h-full">
      <div ref={containerRef} className={`h-full overflow-hidden ${className}`} style={style}>
        <div dangerouslySetInnerHTML={{ __html: pages[safePage]?.join('') ?? '' }} />
      </div>
      {total > 1 && (
        <>
          {mode === 'horizontal' ? (
            <>
              <button aria-label="上一页" onClick={() => go(-1)} disabled={safePage === 0}
                className="absolute left-0 top-0 h-full w-1/3 disabled:opacity-0" />
              <button aria-label="下一页" onClick={() => go(1)} disabled={safePage >= total - 1}
                className="absolute right-0 top-0 h-full w-1/3 disabled:opacity-0" />
            </>
          ) : (
            <>
              <button aria-label="上一页" onClick={() => go(-1)} disabled={safePage === 0}
                className="absolute left-0 top-0 w-full h-1/2 disabled:opacity-0" />
              <button aria-label="下一页" onClick={() => go(1)} disabled={safePage >= total - 1}
                className="absolute left-0 bottom-0 w-full h-1/2 disabled:opacity-0" />
            </>
          )}
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-muted">
            {safePage + 1} / {total}
          </div>
        </>
      )}
    </div>
  )
}

// 把 HTML 拆成块数组。注意：只取块级子元素（doc.body.children），
// 假设 marked 输出的正文都被 <p>/<h*>/<ul> 等块标签包裹，元素间的裸文本会被忽略。
// 对本项目（marked 渲染的章节正文）该假设成立。
function splitBlocks(html: string): string[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  return Array.from(doc.body.children).map(el => el.outerHTML)
}

// 离屏测量单块高度
function measureBlock(blockHtml: string, container: HTMLElement): number {
  const ghost = document.createElement('div')
  ghost.style.cssText = `position:absolute;visibility:hidden;width:${container.clientWidth}px;`
  ghost.innerHTML = blockHtml
  container.appendChild(ghost)
  const h = ghost.offsetHeight
  container.removeChild(ghost)
  return h
}
```

- [ ] **Step 8: 在 ChapterView 按 pageMode 分支**

Modify `reader/src/components/reader/ChapterView.tsx`：引入 `Paginator`；`ChapterViewProps` 增加可选 `page?: number`、`onPageChange?: (page: number, total: number) => void`；`status === 'success'` 分支改为：

```tsx
{status === 'success' && chapter && (
  <>
    <h1 className="text-accent font-bold mb-6" style={{ fontSize: `calc(${settings.fontSize}px + 6px)` }}>
      第{chapter.num}章 {chapter.title}
    </h1>
    {settings.pageMode === 'scroll' ? (
      <div
        className={`chapter-body prose max-w-none ${settings.paragraphIndent ? '' : 'no-indent'}`}
        style={{ fontSize: settings.fontSize, lineHeight: settings.lineHeight, letterSpacing: settings.letterSpacing, fontFamily: FONT_FAMILY_VAR[settings.fontFamily] }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    ) : (
      <div style={{ height: 'calc(100vh - 220px)' }}>
        <Paginator
          html={html}
          mode={settings.pageMode}
          page={page ?? 0}
          onPageChange={onPageChange ?? (() => {})}
          className={`chapter-body prose max-w-none ${settings.paragraphIndent ? '' : 'no-indent'}`}
          style={{ fontSize: settings.fontSize, lineHeight: settings.lineHeight, letterSpacing: settings.letterSpacing, fontFamily: FONT_FAMILY_VAR[settings.fontFamily] }}
        />
      </div>
    )}
  </>
)}
```

并在文件顶部加 `import { Paginator } from './Paginator'`。

- [ ] **Step 9: 跑 ChapterView / Paginator 测试确认通过**

Run: `cd reader && npx vitest run test/components/Paginator.test.tsx test/components/ChapterView.test.tsx`
Expected: PASS（mock 布局高度后分页可测）。

- [ ] **Step 10: App 传入页码进度**

Modify `reader/src/App.tsx`，加：

```tsx
const handlePageChange = useCallback((page: number, _total: number) => {
  progress.save(currentNum, page)
}, [progress, currentNum])
```

给 ChapterView 传：

```tsx
page={settings.pageMode === 'scroll' ? 0 : progress.scrollTop}
onPageChange={handlePageChange}
```

- [ ] **Step 11: 验证 + Commit**

Run: `cd reader && npm test`（paginate / Paginator / ChapterView 通过、其它不回归）
Run: `cd reader && npm run build`
手动冒烟（**强制**）：切到左右/上下翻页，点击区域翻页、页码显示正确、刷新回到上次页码。

```bash
git add reader/src/lib/paginate.ts reader/src/components/reader/Paginator.tsx reader/src/components/reader/ChapterView.tsx reader/src/App.tsx reader/test/lib/paginate.test.ts reader/test/components/Paginator.test.tsx reader/test/components/ChapterView.test.tsx
git commit -m "feat(reader): 左右/上下翻页 JS 分页模式 + 页码进度记忆 + 分页测试"
```

---

## Task 16: 收尾清理 + README + 全量验证

**目标**：删除所有被替换的旧文件，更新 README，全量验证。亮度遮罩已在 Task 14 实现，这里复核。

**Files:**
- Delete: `reader/src/lib/{theme,raw,markdown}.js`
- Delete: `reader/src/components/{ChapterList,ChapterView,LoadingError,NavButtons,Toolbar}.jsx`
- Modify: `reader/README.md`

- [ ] **Step 1: 删除残留旧文件**

```bash
cd reader
git rm src/lib/theme.js src/lib/raw.js src/lib/markdown.js
git rm src/components/ChapterList.jsx src/components/ChapterView.jsx src/components/LoadingError.jsx src/components/NavButtons.jsx src/components/Toolbar.jsx
```

确认无残留：

Run: `cd reader && ls src/*.jsx src/**/*.jsx src/*.js src/**/*.js 2>/dev/null`
Expected: 无输出。

- [ ] **Step 2: 检查无遗留引用**

Run: `cd reader && grep -rn "App.css\|lib/theme\|from '\.\./" src`
Expected: 无输出（无旧 CSS/旧 theme 引用，无相对路径 import）。

- [ ] **Step 3: 更新 README.md**

Rewrite `reader/README.md`：

```markdown
# 时序残本 · 在线阅读器

React 19 + TypeScript + Tailwind CSS v4 + Vite 构建的小说阅读器。

## 功能

- 章节目录 / 阅读 / 上一章·下一章 / 进度记忆 / URL 章节参数（`?ch=N`）
- 8 套预设主题 + 6 色自定义（"我的主题"），localStorage 持久化
- 阅读设置：字体（衬线/无衬线/楷体）、字号、行距、字间距、段间距、首行缩进、页宽、亮度
- 三种翻页模式：滚动 / 左右翻页 / 上下翻页（JS 分页）
- 双端布局：PC 右侧悬浮工具条；移动端底部弹层 + 抽屉目录

## 开发

​```bash
npm install
npm run dev      # 本地开发
npm test         # 单元测试（Vitest）
npm run build    # 类型检查 + 构建到 dist/
​```

## 数据

章节来自 GitHub Raw（见 `src/lib/raw.ts`）。localStorage 键前缀 `sxcb-`。
路径别名见 `tsconfig.json` 的 `paths`（Vite/Vitest 经 vite-tsconfig-paths 共享）。
```

- [ ] **Step 4: 全量测试**

Run: `cd reader && npm test`
Expected: 全部 PASS。

- [ ] **Step 5: 类型检查 + 构建**

Run: `cd reader && npm run build`
Expected: `tsc -b` 无类型错误，Vite 构建成功。

- [ ] **Step 6: 最终冒烟（核对设计 §14 验收）**

`npm run dev` 逐项核对：
- ✅ 8 套预设一键切换，颜色即时生效
- ✅ 6 色自定义保存为"我的主题"，刷新保留
- ✅ 字体/字号/行距/字间距/段间距/页宽/亮度可调，即时生效
- ✅ 三种翻页模式切换，进度记忆正确
- ✅ PC 右侧悬浮工具条，移动端底部弹层
- ✅ 目录、章节导航、进度恢复、URL 参数正常
- ✅ 单元测试通过

- [ ] **Step 7: Commit**

```bash
git add reader/README.md
git commit -m "chore(reader): 清理旧 JS 文件 + 更新 README（重写完成）"
```

---

## 自检结论（Self-Review）

**Spec 覆盖**：§2 技术栈（T1）、§3 主题系统（T3/T4/T11/T12）、§4 阅读设置（T1/T4/T9/T11，亮度 T14，翻页 T15）、§5 双端布局（T7 断点/T10/T13/T14）、§6 目录结构（贯穿）、§7 核心代码（T3/T4/T7/T9）、§8 状态管理（T4/T5）、§9 组件树（T8–T14）、§10 数据流（T14）、§11 错误处理（T2 storage 回退 / T5、T8 LoadingError 重试 / T15 分页 pageHeight 为 0 时不切页等价单页滚动降级）、§12 测试策略（各任务 TDD，CSS 变量注入与视觉不测）、§13 迁移（T5 保留进度/URL/缓存，`sxcb-` 前缀保留）、§14 验收（T16）。

**关键接缝已闭环**：
- 类型前置到 Task 1，后续任务直接 `@app-types/*` 引用，无"先用后建"。
- `@types/node` 已加入 package.json；`tsconfig.node.json` 的 `types:["node"]` 可解析。
- 测试统一显式 import vitest API + `globals:false` + tsconfig 不含 `vitest/globals`，`noUnusedLocals` 不冲突。
- 别名只在 tsconfig `paths` 定义一次，Vite/Vitest 经 `vite-tsconfig-paths` 共享，不写 `resolve.alias`。
- `applyReadingSettings`（Task 4）把 settings 写入 `--reader-*` 变量，段间距/缩进真正生效；ChapterView 内联 style 管字号/行距/字间距/字体，双通道齐备。
- `--breakpoint-md: 720px` 已并入 Task 7 的 index.css，Sidebar/FloatingToolbar/BottomSheet/App 的 `md:` 前缀统一生效。
- ChapterView `settings` 可选（默认 `DEFAULT_SETTINGS`），旧 App.jsx 过渡期不传也能编译，Task 14 起正式传入。
- `test/setup.ts` polyfill `ResizeObserver` 与 `scrollTo`，Paginator 与 App 的浏览器 API 调用在 jsdom 下安全。
- App 的 `restored` 在使用前声明、且 `currentNum` 变化时重置；`<main>` 加 `pb-24 md:pb-6` 防底栏遮挡；工具条 `toolbarPanel` 经 `activeTab` 与 SettingsPanel 受控 Tab 串联（`ToolbarPanel` 与 `SettingsTabKey` 取值一致 theme/typography/reading）。
- LoadingError 有独立测试（loading/error/重试/无 onRetry/success 五态）。
- FloatingToolbar 打开面板时有全屏透明遮罩，点外部触发 `onClosePanel`（设计 §5.1），含测试。
- 移动端底部为 目录/主题/排版/阅读 4 入口（设计 §5.2），主题/排版/阅读直接开 BottomSheet 并经 `sheetTab` 定位到对应受控 Tab。
- Paginator / ChapterView 分页分支有测试（mock `clientHeight`/`offsetHeight` 解决 jsdom 无布局问题），翻页不再只靠手动冒烟。

**类型一致性**：`Theme/ThemeColors`（T1）贯穿 useTheme/ThemeTab/ThemeCustomizer；`ReadingSettings`（T1）贯穿 useReadingSettings/ChapterView/ReadingTab/App；`Chapter/LoadStatus`（T1）贯穿 hooks 与组件；`settings.fontSize` 内联 style 用数值（React 自动加 px），测试断言 `'22px'` 一致。

**遗留说明**：
- Paginator 的 `splitBlocks` 只取块级子元素，假设 marked 输出被块标签包裹（本项目成立，已在代码注释标注）。
- 自定义配色入口在主题 Tab，进入 customizer 期间 `activeTab` 保持 `theme`，返回后仍落主题 Tab（行为明确）。
- **JS 分页的首行缩进**：`.chapter-body p { text-indent: 2em }` 会让每页第一个 `<p>`（可能是上页截断的段）也缩进 2em，看起来像新段落。这是 JS 分页的固有近似，本次接受不完美；如需修正，可在 Paginator 给每页首块加 `text-indent: 0` 的修正类（属打磨项，不在本次范围）。
- Paginator 测试通过 mock `clientHeight`/`offsetHeight` 实现（jsdom 无布局）；真实翻页手感仍以 Task 15 Step 11 的强制手动冒烟为准。

---
