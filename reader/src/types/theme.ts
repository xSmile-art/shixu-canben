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
