const FONT_SIZES = [
  { key: 'small', label: '小' },
  { key: 'medium', label: '中' },
  { key: 'large', label: '大' }
]

export function Toolbar({ theme, onToggleTheme, fontSize, onChangeFontSize, onBackToTop }) {
  return (
    <div className="toolbar">
      <div className="font-sizes">
        {FONT_SIZES.map(fs => (
          <button
            key={fs.key}
            className={fontSize === fs.key ? 'active' : ''}
            onClick={() => onChangeFontSize(fs.key)}
          >{fs.label}</button>
        ))}
      </div>
      <button onClick={onToggleTheme}>
        {theme === 'dark' ? '☀ 浅色' : '☾ 深色'}
      </button>
      <button onClick={onBackToTop}>↑ 顶部</button>
    </div>
  )
}
