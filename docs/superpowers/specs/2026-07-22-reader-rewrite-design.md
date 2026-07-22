# Reader 重写设计文档：React + TypeScript + Tailwind CSS + 通用主题系统

**日期**：2026-07-22  
**状态**：已确认  
**作者**：wangqingsz + Claude

---

## 1. 背景与目标

现有 `reader/` 目录是一个基于 React + JavaScript 的小说阅读器，功能包括章节列表、章节阅读、进度记忆、字号切换、明暗主题、移动端抽屉目录。本次重写目标是：

1. **技术栈升级**：React 18 + TypeScript + Tailwind CSS v4 + Vite
2. **通用主题系统**：支持多套预设主题 + 用户自定义配色（类似起点/番茄小说）
3. **完整阅读设置**：字体、字号、行距、字间距、段间距、页宽、翻页模式、亮度
4. **双端适配**：PC 端右侧悬浮工具条，移动端底部弹层

---

## 2. 技术选型

| 技术 | 版本 | 说明 |
|------|------|------|
| React | 19.2.x | 函数组件 + Hooks |
| TypeScript | 7.0.x | 严格模式 |
| Tailwind CSS | 4.3.x | CSS-first 配置，无 `tailwind.config.js` |
| @tailwindcss/vite | 4.3.x | Tailwind v4 Vite 插件 |
| @tailwindcss/typography | 0.5.x | 正文排版插件 |
| Vite | 8.1.x | 构建工具 |
| Vitest | 4.1.x | 单元测试 |
| marked | 18.0.x | Markdown 渲染 |
| @vitejs/plugin-react | 6.0.x | React 插件 |
| jsdom | 29.1.x | DOM 环境 |
| @testing-library/react | 16.3.x | React 测试工具 |
| @testing-library/jest-dom | 7.0.x | DOM 断言扩展 |

### Tailwind v4 关键变化
- 使用 `@import "tailwindcss"` 替代 `@tailwind` 三件套
- 使用 `@theme { ... }` 在 CSS 中定义设计 token，自动暴露为 CSS 变量
- 自动检测模板文件，无需 `content` 数组

---

## 3. 主题系统设计

### 3.1 核心思路：CSS Variables 映射

- 定义 6 个 CSS 变量作为主题色槽位
- Tailwind 配置把这些变量映射为 `bg-bg`、`text-fg`、`border-border` 等工具类
- 切换主题 = 修改 `<html>` 元素上的 CSS 变量值
- 预设主题 = 一组预定义变量值；自定义主题 = 用户修改这 6 个变量

### 3.2 6 个颜色槽位

| 槽位 | CSS 变量 | 用途 |
|------|----------|------|
| 背景色 | `--color-bg` | 正文底色 |
| 文字色 | `--color-fg` | 正文颜色 |
| 强调色 | `--color-accent` | 章节标题、链接、按钮高亮 |
| 次要文字 | `--color-muted` | 章节目录、提示文字 |
| 边框色 | `--color-border` | 分隔线、卡片边 |
| 选中高亮 | `--color-highlight` | 当前章节、hover 背景 |

### 3.3 8 套预设主题

1. **日间白** — 纯白背景，深色文字
2. **羊皮纸** — 米黄背景，复古感
3. **护眼绿** — 浅绿背景，长时间阅读
4. **豆沙绿** — 深一点的绿，更柔和
5. **樱花粉** — 浅粉背景
6. **天空蓝** — 浅蓝背景
7. **夜间黑** — 纯黑背景，浅色文字
8. **深蓝夜** — 深蓝背景，护眼夜间

### 3.4 自定义主题

- 用户可在任意预设基础上微调 6 个颜色
- 修改后自动保存为"我的主题"（`name: 'custom'`）
- 持久化到 localStorage

---

## 4. 阅读设置设计

### 4.1 设置项

| 设置 | 类型 | 范围/选项 | 默认值 |
|------|------|-----------|--------|
| 字体 | 枚举 | 衬线 / 无衬线 / 楷体 | 衬线 |
| 字号 | 滑块 | 14-24px | 18px |
| 行距 | 滑块 | 1.5-2.5 | 1.9 |
| 字间距 | 滑块 | 0-4px | 0 |
| 段间距 | 滑块 | 0.5-2em | 1em |
| 首行缩进 | 开关 | 是/否 | 是 |
| 页宽 | 滑块 | 600-900px | 720px |
| 翻页模式 | 枚举 | 滚动 / 左右翻页 / 上下翻页 | 滚动 |
| 亮度 | 滑块 | 0.3-1.0 | 1.0 |

### 4.2 翻页模式实现

| 模式 | 实现方式 | 进度记忆 |
|------|----------|----------|
| 滚动 | 正常文档流，监听 scroll 事件 | scrollTop |
| 左右翻页 | JS 分页：隐藏容器渲染，按高度切分，每次显示一页 | 当前页码 / 总页数 |
| 上下翻页 | 每次显示一屏，点上/下半边翻页 | 当前页码 / 总页数 |

**左右翻页技术选型**：采用 **JS 分页**（而非 CSS multi-column），原因：
- 精确控制每页内容，支持中文字符宽度
- 字号/行距变化时可重新分页
- 页边界控制更精确

### 4.3 亮度调节

应用内遮罩实现，不影响系统亮度：

```tsx
<div
  className="fixed inset-0 bg-black pointer-events-none z-50"
  style={{ opacity: 1 - brightness }}
/>
```

---

## 5. 双端布局设计

### 5.1 PC 端（>720px）

- **左侧**：目录侧边栏（固定宽度 240px）
- **中间**：正文内容（自适应宽度，最大 720px）
- **右侧**：悬浮工具条（白色圆角胶囊，垂直居中，不影响正文布局）

**悬浮工具条按钮**：
- 🎨 主题
- Aa 排版
- ⚙ 阅读
- ↑ 回到顶部

**点击行为**：图标点击后在**左侧**弹出浮层（popover），点外部关闭

### 5.2 移动端（≤720px）

- **顶部**：工具栏（汉堡菜单 + 回到顶部）
- **底部**：弹层按钮栏（目录 / 主题 / 排版 / 阅读）
- **目录**：左侧抽屉（点击汉堡菜单或底部"目录"按钮滑出）

**底部弹层**：从底部滑出半屏面板，显示对应设置内容，点遮罩或下滑关闭

---

## 6. 架构与目录结构

```
reader/
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── index.css                 # @import "tailwindcss" + @theme 定义
│   ├── types/
│   │   ├── chapter.ts            # Chapter, ChapterIndex
│   │   ├── theme.ts              # Theme, ThemeColors
│   │   └── settings.ts           # ReadingSettings
│   ├── themes/
│   │   ├── presets.ts            # 8 套预设主题
│   │   └── index.ts              # 主题工具函数
│   ├── hooks/
│   │   ├── useChapters.ts        # 章节索引
│   │   ├── useChapter.ts         # 单章内容（带缓存）
│   │   ├── useReadingProgress.ts # 进度记忆
│   │   ├── useTheme.ts           # 主题状态 + CSS 变量注入
│   │   └── useReadingSettings.ts # 阅读设置状态
│   ├── lib/
│   │   ├── raw.ts                # GitHub Raw URL 构建
│   │   ├── markdown.ts           # marked 渲染
│   │   └── storage.ts            # localStorage 封装
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx       # 目录侧边栏
│   │   │   ├── FloatingToolbar.tsx  # PC 右侧悬浮工具条
│   │   │   └── BottomSheet.tsx   # 移动端底部弹层
│   │   ├── reader/
│   │   │   ├── ChapterView.tsx   # 正文渲染
│   │   │   ├── ChapterList.tsx   # 章节列表
│   │   │   └── NavButtons.tsx    # 上一章/下一章
│   │   ├── settings/
│   │   │   ├── SettingsPanel.tsx # 设置面板容器（Tab 切换）
│   │   │   ├── ThemeTab.tsx      # 主题选择 + 自定义入口
│   │   │   ├── TypographyTab.tsx # 字体/字号/行距/字间距
│   │   │   ├── ReadingTab.tsx    # 翻页模式/亮度/段间距
│   │   │   └── ThemeCustomizer.tsx # 6 色调色板
│   │   └── ui/                   # 通用 UI 组件
│   │       ├── Button.tsx
│   │       ├── Slider.tsx
│   │       ├── ColorPicker.tsx
│   │       └── Tab.tsx
│   └── test/                     # 测试（镜像 src 结构）
│       ├── hooks/
│       ├── lib/
│       └── components/
└── dist/                         # 构建输出
```

---

## 7. 核心代码设计

### 7.1 CSS 变量定义（index.css）

```css
@import "tailwindcss";

@theme {
  /* 6 个主题色槽位 — 默认值（日间白） */
  --color-bg: #ffffff;
  --color-fg: #1a1a1a;
  --color-accent: #8b5a2b;
  --color-muted: #666666;
  --color-border: #e0ddd5;
  --color-highlight: rgba(139, 90, 43, 0.12);

  /* 阅读设置相关变量 */
  --reader-font-size: 18px;
  --reader-line-height: 1.9;
  --reader-letter-spacing: 0;
  --reader-content-width: 720px;
  --reader-paragraph-spacing: 1em;
  --reader-paragraph-indent: 2em;

  /* 字体 */
  --font-serif: "Noto Serif SC", "Songti SC", serif;
  --font-sans: "Noto Sans SC", "PingFang SC", sans-serif;
  --font-kai: "Kaiti SC", "KaiTi", serif;
}

body {
  background: var(--color-bg);
  color: var(--color-fg);
  font-family: var(--font-serif);
}
```

### 7.2 主题类型（types/theme.ts）

```typescript
export interface ThemeColors {
  bg: string;
  fg: string;
  accent: string;
  muted: string;
  border: string;
  highlight: string;
}

export interface Theme {
  name: string;        // 'day' | 'night' | 'paper' | ...
  label: string;       // '日间白' | '夜间黑' | ...
  colors: ThemeColors;
  isCustom?: boolean;  // 是否用户自定义
}
```

### 7.3 useTheme Hook

```typescript
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => loadTheme());

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    saveTheme(t);        // 写 localStorage
    applyTheme(t);       // 写 CSS 变量到 <html>
  }, []);

  const customizeColor = useCallback((key: keyof ThemeColors, value: string) => {
    const custom: Theme = {
      ...theme,
      name: 'custom',
      label: '我的主题',
      colors: { ...theme.colors, [key]: value },
      isCustom: true,
    };
    setTheme(custom);
  }, [theme, setTheme]);

  return { theme, setTheme, customizeColor };
}
```

### 7.4 applyTheme（写 CSS 变量）

```typescript
function applyTheme(theme: Theme) {
  const root = document.documentElement;
  root.style.setProperty('--color-bg', theme.colors.bg);
  root.style.setProperty('--color-fg', theme.colors.fg);
  root.style.setProperty('--color-accent', theme.colors.accent);
  root.style.setProperty('--color-muted', theme.colors.muted);
  root.style.setProperty('--color-border', theme.colors.border);
  root.style.setProperty('--color-highlight', theme.colors.highlight);
}
```

### 7.5 阅读设置类型（types/settings.ts）

```typescript
export type FontFamily = 'serif' | 'sans' | 'kai';
export type PageMode = 'scroll' | 'horizontal' | 'vertical';

export interface ReadingSettings {
  fontFamily: FontFamily;
  fontSize: number;             // 14-24px
  lineHeight: number;           // 1.5-2.5
  letterSpacing: number;        // 0-4px
  paragraphSpacing: number;     // 0.5-2em
  paragraphIndent: boolean;
  contentWidth: number;         // 600-900px
  pageMode: PageMode;
  brightness: number;           // 0.3-1.0
}
```

### 7.6 阅读设置应用（ChapterView）

```tsx
<article
  className="prose text-fg bg-bg"
  style={{
    fontSize: 'var(--reader-font-size)',
    lineHeight: 'var(--reader-line-height)',
    letterSpacing: 'var(--reader-letter-spacing)',
    maxWidth: 'var(--reader-content-width)',
  }}
>
```

**说明**：阅读设置是动态值，推荐用内联样式（即时生效），不用 Tailwind 静态类名。

---

## 8. 状态管理

| 状态 | Hook | 持久化 | 作用域 |
|------|------|--------|--------|
| 章节索引 | `useChapters` | 无（网络） | App |
| 当前章节 | `useChapter` | 模块级缓存 | App |
| 阅读进度 | `useReadingProgress` | localStorage | App |
| 主题 | `useTheme` | localStorage | App |
| 阅读设置 | `useReadingSettings` | localStorage | App |
| 目录/设置面板开关 | 局部 useState | 无 | 组件内 |

---

## 9. 组件树

```
App
├── Sidebar                 # 目录（PC 侧边栏 / 移动端抽屉）
│   └── ChapterList
├── ChapterView             # 正文渲染（滚动 / 左右翻页 / 上下翻页）
│   └── NavButtons
├── FloatingToolbar         # PC 右侧悬浮工具条
│   └── SettingsPanel       # 弹出设置面板
│       ├── ThemeTab
│       │   └── ThemeCustomizer
│       ├── TypographyTab
│       └── ReadingTab
└── BottomSheet             # 移动端底部弹层
    └── SettingsPanel       # 同一个设置面板
```

---

## 10. 数据流

1. **章节加载**：App 挂载 → useChapters fetch 索引 → 用户选章 / URL 参数 / 进度恢复 → useChapter fetch 单章 → marked 渲染 → ChapterView 展示
2. **主题切换**：用户选预设或自定义 → useTheme 更新 state → useEffect 写 CSS 变量到 `<html>` → 全站颜色即时更新
3. **设置变更**：用户在 SettingsPanel 调整 → useReadingSettings 更新 → 写 localStorage → ChapterView 根据设置调整样式（字号、行距、翻页模式等）
4. **进度记忆**：滚动 / 翻页时防抖保存 → 下次进入时恢复

---

## 11. 错误处理

| 场景 | 处理 |
|------|------|
| 章节索引加载失败 | 显示错误提示 + 重试按钮，保留上次成功的索引（如果有） |
| 单章加载失败 | 显示错误提示 + 重试按钮，不清空目录 |
| localStorage 读失败 | 用默认值，不阻塞渲染 |
| 主题色值非法 | ColorPicker 限制输入格式，applyTheme 前校验 |
| JS 分页计算失败 | 降级到滚动模式，提示用户 |

---

## 12. 测试策略

### 单元测试（Vitest + Testing Library）

- **lib/**：raw.ts（URL 构建）、markdown.ts（渲染）、storage.ts（localStorage 封装）
- **hooks/**：useTheme（主题切换、自定义、持久化）、useReadingSettings（设置更新、持久化）、useChapters / useChapter / useReadingProgress（保留现有测试）
- **components/**：SettingsPanel（Tab 切换）、ThemeCustomizer（颜色选择）、ChapterList（选中态）、NavButtons（禁用态）

### 不测的

- CSS 变量注入（jsdom 不支持）
- 翻页分页算法（E2E 更适合）
- 视觉样式

---

## 13. 迁移策略

1. **保留**：所有现有功能（章节加载、进度记忆、URL 参数、移动端抽屉）
2. **重写**：全部组件改为 React + TS + Tailwind，样式从 App.css 迁移到 Tailwind 类
3. **新增**：主题系统、阅读设置、翻页模式、双端设置面板
4. **兼容**：localStorage 键名保持 `sxcb-` 前缀，老用户数据不丢

---

## 14. 验收标准

- ✅ 8 套预设主题一键切换，颜色即时生效
- ✅ 6 色自定义，保存为"我的主题"
- ✅ 字体/字号/行距/字间距/段间距/页宽/亮度可调，即时生效
- ✅ 三种翻页模式切换，进度记忆正确
- ✅ PC 右侧悬浮工具条，移动端底部弹层
- ✅ 所有现有功能正常（目录、章节导航、进度恢复）
- ✅ 单元测试覆盖核心逻辑

---

## 15. 后续扩展（不在本次范围）

- 书签/笔记功能
- 多本书支持
- 搜索功能
- 听书（TTS）
- 云端同步
