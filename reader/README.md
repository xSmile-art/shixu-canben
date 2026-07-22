# 时序残本 · 在线阅读器

基于 Vite + React 的静态阅读器，部署在 GitHub Pages。

## 本地开发

```bash
cd reader
npm install
npm run dev
```

## 测试

```bash
npm test
```

## 构建

```bash
npm run build
```

## 架构要点

站点本体与内容数据解耦：章节正文和索引以原始 markdown/json 形式躺在仓库 `main` 分支，浏览器运行时通过 `raw.githubusercontent.com` 拉取。加新章只需 push 正文与索引，不重新构建站点。

详见 `docs/superpowers/specs/2026-07-21-reader-design.md`。
