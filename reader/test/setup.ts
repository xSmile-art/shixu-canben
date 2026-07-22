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
