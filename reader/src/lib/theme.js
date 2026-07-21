export const THEME_KEY = 'sxcb-theme'

// 读主题，无记录默认 light
export function getTheme() {
  const v = localStorage.getItem(THEME_KEY)
  return v === 'dark' ? 'dark' : 'light'
}

// 写主题并持久化
export function setTheme(theme) {
  localStorage.setItem(THEME_KEY, theme)
}
