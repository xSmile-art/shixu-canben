# 设计：《时序残本》在线阅读器

- 日期：2026-07-21
- 状态：已批准，待实现
- 关联仓库：xSmile-art/shixu-canben
- 目标访问地址：https://xsmile-art.github.io/shixu-canben/

## 1. 目标

在现有 `webnovel` 仓库内，新增一个 React 在线阅读器，部署到 GitHub Pages，让作者与读者可在网页上直接阅读《时序残本》正文。

核心诉求：

- 加新章节时**不重新构建、不重新部署站点**，只 push 正文与索引即可被网页读到。
- 站点代码与内容数据彻底解耦。
- 提供正文阅读所需的基础体验：目录、进度、上下章、字号、明暗主题、本地记忆位置。

## 2. 范围

- 展示内容：仅章节正文（`novels/时序残本/正文/*.md`）。设定资料（人物卡/伏笔台账/记忆台账等）不对外展示，留在仓库供创作使用。
- 章节：当前第 1–20 章已就绪，后续按编号递增。
- 不做：用户系统、评论、搜索、全文索引、设定集页面。

## 3. 前提条件

- 仓库可见性由 Private 改为 Public。这是运行时拉取 raw markdown 的硬性前提（浏览器匿名访问 raw 需要 `Access-Control-Allow-Origin: *`，已验证公开仓库满足）。
- 仓库默认分支为 `main`。

## 4. 整体架构

**核心模式**：站点本体（React 应用）与内容数据（markdown 正文 + JSON 索引）分属两个独立通道。React 应用构建部署一次后基本不动；章节正文与索引以原始 markdown/json 形式躺在 `main` 分支，浏览器运行时通过 raw URL 拉取。

### 仓库结构

```
webnovel/                                    仓库（Public）
├── novels/时序残本/正文/第NNN章-标题.md      ← 章节正文（main 分支）
├── chapters-index.json                      ← 章节索引（main 分支，仓库根）
├── docs/superpowers/specs/                  ← 本设计文档
└── reader/                                  ← React 项目（一次性构建部署）
    ├── src/…
    ├── package.json
    └── vite.config.js
```

### 两个独立数据通道

- **站点本体**（`gh-pages` 分支）：Vite 构建出的 React 应用，部署一次后基本不动。除非改 React 代码，否则不重新构建。
- **内容数据**（`main` 分支的 raw）：
  - 索引：`https://raw.githubusercontent.com/xSmile-art/shixu-canben/main/chapters-index.json`
  - 正文：`https://raw.githubusercontent.com/xSmile-art/shixu-canben/main/novels/时序残本/正文/第NNN章-标题.md`

两个通道互不依赖：改站点不碰内容，加内容不碰站点。

### 加新章流程（作者每次只做这一件事）

1. 写 `novels/时序残本/正文/第021章-xxx.md`
2. 在 `chapters-index.json` 追加一行 `{"num":"021","title":"xxx"}`
3. `git push origin main`
4. 完成。网页在 raw CDN 刷新后（约 5 分钟内）即可读到新章。站点零改动、零构建、零部署。

## 5. 技术选型

- 构建工具：Vite（轻量、快、GitHub Pages 部署生态成熟）
- 框架：React 18
- Markdown 解析：`marked`（运行时解析，单章几十 KB，毫秒级；正文是作者自有 markdown，无注入风险）
- 路由：无需 React Router——章节数即路由参数，用 URL query `?ch=021` 或 hash 承载
- 部署：GitHub Actions → `gh-pages` 分支

## 6. 组件结构

React 应用放在 `reader/`，组件职责单一、可独立理解。

```
reader/src/
├── App.jsx                  ← 应用壳：布局 + 主题 Provider + 路由参数解析
├── hooks/
│   ├── useChapters.js        ← fetch 索引，缓存章节数组（列表级）
│   ├── useChapter.js        ← 给章号 → fetch 单章 markdown → marked 转 HTML → 缓存（章级）
│   └── useReadingProgress.js← 读写 localStorage（当前章号 + 滚动位置）
├── components/
│   ├── ChapterList.jsx      ← 左侧目录，高亮当前章
│   ├── ChapterView.jsx      ← 正文区，dangerouslySetInnerHTML 渲染
│   ├── NavButtons.jsx       ← 上一章/下一章按钮
│   ├── Toolbar.jsx          ← 字号调节、主题切换、回顶
│   └── LoadingError.jsx     ← 加载中/出错占位 + 重试按钮
└── lib/
    ├── raw.js               ← 拼 raw URL，encodeURI 处理中文路径
    ├── markdown.js          ← marked 实例与配置（段落间距、转义）
    └── theme.js             ← 明暗主题 + localStorage 持久化
```

### 组件边界

- `useChapter(num)` 只负责"章号 → HTML 字符串"，内部含 fetch + marked + 缓存。调用方不关心数据来源。
- `ChapterView` 只负责把 HTML 字符串渲染进 DOM，不关心怎么来的。
- `ChapterList` 只负责渲染列表 + 高亮，章节数据由父组件传入。
- 组件互不耦合，可各自独立理解与测试。

## 7. 数据流

### 打开网页 → 看到目录

1. `useChapters` fetch `chapters-index.json`（几 KB，秒下）→ 得到章节列表数组
2. 渲染左侧 `ChapterList`
3. 若 localStorage 有上次阅读章号 → 自动选中并加载该章；否则默认选第 1 章

### 点开某章

1. `useChapter(num)` 用 `num` 从索引查到对应文件名
2. `lib/raw.js` 拼 raw URL，`encodeURI` 处理中文路径（`时序残本/正文/第001章-草稿层`）
3. fetch markdown 原文
4. `marked` 转 HTML
5. `ChapterView` 用 `dangerouslySetInnerHTML` 渲染
6. `useReadingProgress` 写入 localStorage 当前章号

### 回到网页（续读）

1. 读 localStorage → 得到上次章号 + 滚动位置
2. 自动跳到该章 → 渲染后 `scrollTo` 到记录位置

### 路由参数

- URL 形如 `https://xsmile-art.github.io/shixu-canben/?ch=021`
- 读：进入时解析 `ch` 参数决定初始章
- 写：切章时更新 `history.replaceState`，便于分享某章链接

## 8. 错误处理

- **fetch 失败/404**：`LoadingError` 组件显示"章节加载失败"+ 重试按钮
- **单章失败不影响其他章**：索引里某章文件名写错只导致该章 404，目录与其他章正常
- **索引 fetch 失败**：全站降级为"目录加载失败，请稍后重试"，不崩
- **raw CDN 缓存延迟**：刚 push 的新章，raw 最多 5 分钟后才更新（raw 的固有 CDN 缓存）。远比重新构建部署快，可接受。UI 不做额外处理，只在文档中说明此延迟。
- **marked 安全**：正文是作者自有 markdown，无第三方注入风险。marked 默认对内联 HTML 转义，可满足。

## 9. 部署（GitHub Pages）

### 一次性配置（实现阶段完成）

1. 在 `reader/` 初始化 Vite + React 项目，`vite.config.js` 设 `base: '/shixu-canben/'`（子路径部署必需）
2. 新增 `.github/workflows/deploy.yml`：当 push 到 `main` 且 `reader/` 或 `.github/workflows/` 有改动时 → `npm ci && npm run build` → 推送 `reader/dist` 到 `gh-pages` 分支
3. GitHub 仓库 Settings → Pages → Source 选 `gh-pages` 分支 / `/(root)`

### 之后

- 改 React 代码（动 `reader/`）→ push → Action 自动重新部署站点
- 加新章节（只动 `novels/` 和 `chapters-index.json`）→ 不触发站点构建，raw 立即生效（受 5 分钟 CDN 缓存约束）

### 仓库可见性

作者需手动将仓库设为 Public（Settings → 最底部 Danger Zone → Change visibility）。这是运行时拉取的前提。设为公开后，仓库内所有文件（含设定资料）均可被匿名访问——已在范围章节确认可接受。

## 10. 章节索引格式

`chapters-index.json`（仓库根，手动维护）：

```json
[
  { "num": "001", "title": "草稿层" },
  { "num": "002", "title": "十秒" },
  { "num": "003", "title": "残本" }
]
```

- `num`：三位编号，与文件名 `第001章-草稿层.md` 中的编号段一致
- `title`：章节标题，与文件名中标题段一致
- 文件名还原规则：`第${num}章-${title}.md`，配合 `encodeURI` 生成 raw URL
- 顺序：数组顺序即目录展示顺序

## 11. 阅读功能清单

- [x] 章节目录 + 高亮当前章
- [x] 上一章/下一章按钮 + 键盘左右键翻章
- [x] 字号调节（小/中/大）
- [x] 顶部跳转（点击章名或回顶按钮滚到顶）
- [x] 本地记忆阅读位置（章号 + 滚动位置，存 localStorage）
- [x] 手动切换明暗主题，选择持久化

## 12. 不做（YAGNI）

- 设定集页面（人物卡/伏笔台账等不对外）
- 搜索/全文索引
- 用户系统/评论
- 阅读进度跨设备同步
- 多语言/多作品切换（当前仅《时序残本》一部）
