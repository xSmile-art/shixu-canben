# 时序残本 · 在线阅读器

React 19 + TypeScript + Tailwind CSS v4 + Vite 构建的小说阅读器。

## 功能

- 章节目录 / 阅读 / 上一章·下一章 / 进度记忆 / URL 章节参数（`?ch=N`）
- 8 套预设主题 + 6 色自定义（"我的主题"），localStorage 持久化
- 阅读设置：字体（衬线/无衬线/楷体）、字号、行距、字间距、段间距、首行缩进、页宽、亮度
- 三种翻页模式：滚动 / 左右翻页 / 上下翻页（JS 分页）
- 双端布局：PC 右侧悬浮工具条；移动端底部弹层 + 抽屉目录

## 开发

```bash
npm install
npm run dev      # 本地开发
npm test         # 单元测试（Vitest）
npm run build    # 类型检查 + 构建到 dist/
```

## 数据

章节来自 GitHub Raw（见 `src/lib/raw.ts`）。localStorage 键前缀 `sxcb-`。
路径别名见 `tsconfig.json` 的 `paths`（Vite/Vitest 经 vite-tsconfig-paths 共享）。

## 结构

- `src/types/` — 类型定义
- `src/themes/` — 8 套预设主题 + applyTheme
- `src/hooks/` — useChapters/useChapter/useReadingProgress/useTheme/useReadingSettings
- `src/lib/` — raw/markdown/storage/paginate 工具
- `src/components/` — layout / reader / settings / ui 组件
- `test/` — 镜像 src 的单元测试
