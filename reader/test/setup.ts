// jsdom 未实现的浏览器 API 在此 polyfill，供全部测试使用。
import '@testing-library/jest-dom/vitest'
import { vi, afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// vitest globals: false，@testing-library/react 的自动 cleanup 不生效 → 手动挂 afterEach
afterEach(cleanup)

// Paginator 用 ResizeObserver 监听容器尺寸，jsdom 没有 → 空实现
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof globalThis.ResizeObserver
}

// jsdom 的 scrollTo 是未实现的 stub，调用会打 "Not implemented" 噪音 → 直接替换为 mock
window.scrollTo = vi.fn()
