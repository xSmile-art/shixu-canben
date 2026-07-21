export function ChapterList({ chapters, currentNum, onSelect }) {
  return (
    <nav className="chapter-list">
      <ul>
        {chapters.map(ch => (
          <li key={ch.num} className={ch.num === currentNum ? 'active' : ''}>
            <button onClick={() => onSelect(ch.num)}>
              第{ch.num}章 {ch.title}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
