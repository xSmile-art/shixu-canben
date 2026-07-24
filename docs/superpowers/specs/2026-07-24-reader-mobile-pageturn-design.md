# Reader 移动端适配 + 翻页动画重构 设计规格

- 日期：2026-07-24
- 项目：`reader/`（React 19 + TS + Tailwind v4 + Vite 小说阅读器）
- 分支：`feat/reader-rewrite`

## 1. 背景与目标

现状问题：

1. **点按冲突**：翻页模式下 Paginator 在内容区叠加了左右两个 1/3 宽的全高透明按钮（`ClickAreas`），而 App 层 `main onClick={handleContentTap}` 又负责切换底部导航显隐。点正文中间区域会同时冒泡触发两件事（翻页 + 弹菜单），点两侧按钮虽然 `stopPropagation` 之外靠 `target.closest("button")` 规避，但语义混乱。
2. **移动端适配**：分页高度用 `calc(100vh - 220px)` 估算，移动端 URL 栏伸缩导致视口高度跳动、频繁触发重新分页；无安全区（刘海/Home 指示条）适配；页码指示器位置/尺寸不适合触屏；`NavButtons`（上一章/下一章）在移动端冗余。
3. **动画体验**：现有五种翻页动画（仿真/覆盖/平移/上下/无）基于 CSS `@keyframes` 一次性播放，不支持跟手滑动、不可中断、无回弹，与番茄小说的手感差距大。

目标：

- 番茄小说式三段点按分区（左 1/3 上一页、中 1/3 呼出菜单、右 1/3 下一页），从根上消除与底部栏显隐的事件冲突。
- 跟手滑动翻页：页面随手指位移，松手按阈值补间完成或回弹，动画可中断接管。
- 移动端视口高度稳定、安全区适配、页码指示器适配触屏。
- 章节边界自动跨章（末页再翻 → 下一章第 1 页；首页回翻 → 上一章最后页）。

## 2. 范围

**做**：移动端（<720px）交互与适配改造；Paginator 动画引擎重构；翻页模式手势；跨章翻页；安全区。

**不做**：PC 端交互保持不变（仅 NavButtons 样式调整为 `hidden md:block`，移动端不再渲染章节导航按钮）；不改数据源、主题系统、滚动模式的阅读体验（滚动模式仅顶栏联动隐藏）；不引入第三方翻页库。

## 3. 交互模型

### 3.1 界面状态机（移动端）

两种状态：

- **沉浸态**：顶栏 + 底部导航均隐藏（`translateY` 滑出），正文全屏。
- **菜单态**：顶栏 + 底部导航滑入显示。

顶栏从文档流改为 `fixed top-0`，底部导航保持 `fixed bottom-0`；正文容器高度恒定，不随菜单显隐变化（避免重新分页）。

状态切换：

- 翻页模式：点按屏幕中 1/3 区域切换。
- 滚动模式：点正文任意空白处切换（沿用现有 `handleContentTap` 语义，但改为同时控制顶栏）。
- 打开 BottomSheet / Sidebar 时自动进入菜单态；关闭后不强制回到沉浸态。

### 3.2 翻页模式点按（三段分区）

统一由 Paginator 根节点的 `onTap` 处理器判定，**删除现有 `ClickAreas` 透明按钮层**，从根上解决冲突：

| 区域 | 行为 | 边界 |
|---|---|---|
| 左 1/3 | 上一页 | 第 1 页时 → `onRequestChapter("prev", "last")`（上一章最后一页） |
| 中 1/3 | 切换菜单态 | 调用 App 传入的 `onToggleMenu` |
| 右 1/3 | 下一页 | 最后页时 → `onRequestChapter("next", 1)`（下一章第 1 页） |

无上一章/下一章时，边界点按无反应。

### 3.3 手势（翻页模式）

统一在 Paginator 根节点用 Pointer Events 处理：

- `pointerdown` 记录起点/时间；`setPointerCapture`。
- `pointermove`：位移 <10px 视为潜在 tap 不动作；超过后按 flipStyle 判定主轴：
  - `simulate` / `cover` / `slide`：水平滑动跟手（dx 映射进度 p）。
  - `vertical`：垂直滑动跟手（dy 映射 p）。
  - `none`：不跟手，仅记录。
  - 方向合法性：向右/下滑 = 上一页方向，向左/上滑 = 下一页方向；边界（第 1 页回翻、末页顺翻且无下一章）不给跟手进度（阻尼为 0）。
- `pointerup`：
  - 位移 <10px 且时长 <300ms → tap，走 3.2 三段分区。
  - 否则：p ≥ 0.3 或 |速度| ≥ 0.5 px/ms → 补间到 p=1（完成翻页）；否则补间回 p=0（回弹）。
- 动画补间进行中再次 `pointerdown`：接管当前 p，转为跟手。

### 3.4 滚动模式

点按行为、跨章导航均不变。顶栏随 `mobileNavVisible`（改名 `chromeVisible`）一起显隐。

## 4. 动画引擎（方案 A：进度驱动）

### 4.1 核心抽象

```ts
// 一次翻页的进行态
interface FlipState {
  dir: "next" | "prev";
  from: number;   // 旧页页码
  to: number;     // 新页页码
  p: number;      // 0..1 进度
}

// 每种动画样式的纯函数：给定 p，输出新旧两层的样式
interface FlipFrame {
  front: CSSProperties;  // 上层（z-index 高）
  back: CSSProperties;   // 下层
  stage?: CSSProperties; // 容器（如 perspective）
  frontIsNew: boolean;   // 上层渲染的是 to 页还是 from 页
}
type FlipFn = (p: number, dir: "next" | "prev") => FlipFrame;
```

- **simulate**：stage `perspective:1500px`；前层 `rotateY(-180°·p)`（next）/`rotateY(-180°+180°·p)`（prev），transform-origin left，书脊阴影层 opacity 随 p。
- **cover**：next → 新页在上 `translateX(100%·(1-p))`，旧页静止在下；prev → 旧页在上 `translateX(100%·p)`，新页静止在下。
- **slide**：旧页 `translateX(∓100%·p)`，新页 `translateX(±100%·(1-p))`（首尾相接，两层同动）。
- **vertical**：同 slide 换 Y 轴（向上翻：旧页 `translateY(-100%·p)`，新页 `translateY(100%·(1-p))`）。
- **none**：不渲染双层；松手过阈值直接瞬切。

全部只动 `transform`（必要时 `opacity`），两层 `will-change: transform`，严格保持两层渲染避免闪动。

### 4.2 补间

`lib/tween.ts`：手写 rAF 补间（不用 WAAPI，避免 jsdom/旧浏览器兼容问题）：

```ts
tween(from: number, to: number, ms: number, ease: (t:number)=>number,
      onFrame: (v:number)=>void, onDone: ()=>void): () => void // 返回取消函数
```

- 完成翻页：p → 1，时长 `240ms·(1-p)`，easeOutCubic。
- 回弹：p → 0，时长 `240ms·p`，easeOutCubic。
- 点按翻页：p 0→1，240ms。
- `prefers-reduced-motion` 时所有动画降级为瞬切（等同 none）。

### 4.3 页码 commit 时机

- 动画**完成**（p 到达 1）才调用 `onPageChange(to, total)` 提交新页码。
- 回弹（p 归 0）不提交，页码不变。
- 修复现状「`go()` 立即提交、动画中页码已变」的不一致。

### 4.4 组件接口

```ts
interface PaginatorProps {
  html: string;
  flipStyle: FlipStyle;
  page: number;                       // 受控页码（章节切换/进度恢复时外部改变）
  pendingPage?: number | "last" | null; // 跨章后落点，分页就绪后消费并回调清除
  onPageChange: (page: number, total: number) => void;
  onToggleMenu: () => void;           // 中段点按
  onRequestChapter: (dir: "prev" | "next", land: "first" | "last") => void;
  className?: string;
  style?: CSSProperties;
}
```

`ChapterView` 透传以上回调；`App` 提供：

- `handleRequestChapter("next", "first")` → `selectChapter(nextNum)` + `setPendingPage(1)`（实际由 URL/状态驱动，落地实现见 §7）
- `handleRequestChapter("prev", "last")` → `selectChapter(prevNum)` + `setPendingPage("last")`

跨章时 Paginator 因 `html` 变化重新分页，就绪后若 `pendingPage` 非空则跳到对应页（`"last"` → `total-1`），随后 `onPageChange` 提交并清除 pending。

## 5. 移动端适配

### 5.1 视口高度稳定

- 根容器（`App` 顶层 div、`html/body/#root`）高度：`100vh` → 兜底，`100dvh` → 兜底，`100lvh` 优先（URL 栏伸缩不改变 lvh，消除跳动）。
- 顶栏/底栏改 `fixed` 后，正文 `<main>` 高度恒定为 `100lvh`（不再因底栏显隐改变 `pb` 影响分页区）。
- Paginator 的 ResizeObserver 重分页增加阈值：**仅当宽度变化，或高度变化 >100px 时才重新分页**（URL 栏收缩 <100px 不触发；横竖屏旋转才触发）。重新分页后保持阅读位置（按页码比例或直接保持当前页码，取实现简单的保持页码并 clamp）。

### 5.2 分页容器高度

- 现状 `calc(100vh - 220px)` 估算改为精确：翻页模式下 `<main>` 不再承担滚动（`overflow-hidden`），Paginator 容器占满 main 的内容盒（`h-full`），上下内边距固定（如 `py-4`）。章节标题保留在分页区上方，参与固定布局而非估算。
- 实现：ChapterView 翻页分支改为 flex 列布局：`h1`（shrink-0）+ Paginator 容器（flex-1 min-h-0）。

### 5.3 安全区

- `index.html` meta viewport 增加 `viewport-fit=cover`。
- 顶栏：`padding-top: env(safe-area-inset-top)`；底部导航与 BottomSheet：`padding-bottom: env(safe-area-inset-bottom)`。
- 页码指示器：`bottom: calc(8px + env(safe-area-inset-bottom))`；字号/触控区适配（`text-xs` → `text-sm`，并加 `pointer-events-none` 避免拦截手势）。

### 5.4 NavButtons

- `NavButtons`（上一章/下一章）容器加 `hidden md:block`：移动端不再渲染，PC 保留。

## 6. 文件改动

| 文件 | 改动 |
|---|---|
| `src/lib/tapZone.ts` | 新增。纯函数 `zoneOf(xRatio): "prev"\|"menu"\|"next"`（<1/3、<2/3、else）。 |
| `src/lib/flipStyle.ts` | 新增。五种 `FlipFn` 纯函数 + 主轴映射 `axisOf(flipStyle)`。 |
| `src/lib/tween.ts` | 新增。rAF 补间 + easeOutCubic + `prefersReducedMotion()`。 |
| `src/components/reader/Paginator.tsx` | 重写。删除 `ClickAreas`；进度驱动双层渲染 + Pointer 手势 + 跨章 pendingPage；ResizeObserver 阈值。 |
| `src/components/reader/ChapterView.tsx` | 翻页分支改 flex 布局；透传 `onToggleMenu`/`onRequestChapter`/`pendingPage`。 |
| `src/App.tsx` | `mobileNavVisible` → `chromeVisible`（同时控制顶栏）；顶栏改 `fixed` + 显隐动画；NavButtons 包装 `hidden md:block`；跨章回调与 `pendingPage` 状态；main 的手势冲突清理（翻页模式下不再依赖 main onClick）。 |
| `src/index.css` | `100lvh` 链、安全区 padding、`.paginate-*` 双层基础样式（`will-change` 等）。 |
| `index.html` | `viewport-fit=cover`。 |
| `test/lib/tapZone.test.ts` | 新增。三段判定边界。 |
| `test/lib/flipStyle.test.ts` | 新增。五种 FlipFn 在 p=0/0.5/1 的关键 transform 断言。 |
| `test/lib/tween.test.ts` | 新增。补间到值/取消/reduced-motion。 |
| `test/components/Paginator.test.tsx` | 更新。三段点按回调、跨章 `onRequestChapter`、commit 时机（完成才提交）。 |
| `test/components/ChapterView.test.tsx` | 更新透传。 |
| `test/components/NavButtons.test.tsx` | 视情况更新（容器类名）。 |

## 7. 状态与数据流

- App 新增状态：`pendingPage: number | "last" | null`（随 `selectChapter` 设置，随 Paginator 消费清除）。
- `selectChapter` 现有签名不变；新增可选第二参 `land?: "first" | "last"`，内部 `setPendingPage(land === "last" ? "last" : 1)`。
- 进度存储键不变（页码仍存 `progress.scrollTop` 字段，语义沿用）。
- `chromeVisible` 初始 `true`；进入翻页模式首次点按正文前不强制隐藏。

## 8. 错误与边界处理

- **无上一/下一章**：边界点按/滑动无反应（`hasPrev/hasNext` 由 App 传入或经 `onRequestChapter` 内部判断后忽略）。
- **分页未完成（total=0）**：点按仅中段呼出菜单有效，两侧无反应；手势禁用。
- **单页章节（total=1）**：左右点按直接等价跨章请求；滑动直接给跨章提示逻辑（同边界）。
- **动画中切章/切 flipStyle**：取消进行中的补间，立即落到最后提交页，重新分页。
- **多指/鼠标**：只跟踪首个 pointerId；`pointercancel` 等同回弹。
- **长按选择文本**：位移 <10px 但 ≥300ms 不视为 tap（不翻页不呼出），留给系统选择。

## 9. 性能

- 动画仅 `transform`/`opacity`；双层 `will-change: transform`；静态层在动画结束后才替换。
- `splitBlocks` 结果 `useMemo`；测量用 ghost 节点，ResizeObserver 阈值防抖。
- 手势 `pointermove` 直接写 style（绕过 React state 高频渲染，p 存 ref，仅在 commit/回弹时 setState）。

## 10. 测试策略

- **纯函数**：`tapZone`（0/1/3、1/2、2/3、1 边界）、`flipStyle`（p=0 时新页在屏外、p=1 时旧页在屏外、simulate 的 rotateY 端点）、`tween`（到达目标值调用 onDone、取消后不再 onFrame、reduced-motion 下瞬切）。
- **Paginator**：渲染后点左/中/右分别触发 `page-1`/`onToggleMenu`/`page+1`；第 1 页点左触发 `onRequestChapter("prev","last")`；末页点右触发 `onRequestChapter("next","first")`；模拟补间完成后才 `onPageChange`。
- **App 级**：`chromeVisible` 同时控制顶栏与底栏类名；跨章后 `pendingPage` 传递。
- 既有测试（分页算法、hooks、其余组件）保持通过。

## 11. 验收标准

1. 手机（或 DevTools 设备模拟）翻页模式：点左/中/右分别上一页/呼出菜单/下一页，菜单态不再误翻页。
2. 左右跟手滑动页面随指移动，松手过半翻页、未过半回弹；动画中可反向滑接管。
3. 末页继续翻自动进入下一章第 1 页；首页回翻进入上一章最后页；进度记忆正确。
4. 上下滑动/覆盖/平移/仿真/无五种效果均符合 §4.1 描述。
5. URL 栏伸缩不触发重新分页；旋转屏幕才触发；无内容跳动。
6. 刘海/Home 指示条设备上顶栏、底栏、页码不被遮挡。
7. 移动端不再显示上一章/下一章按钮；PC 端行为不变。
8. `pnpm test`、`pnpm build` 全绿。
