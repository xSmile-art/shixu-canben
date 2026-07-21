export function NavButtons({ hasPrev, hasNext, onPrev, onNext }) {
  return (
    <div className="nav-buttons">
      <button onClick={onPrev} disabled={!hasPrev}>上一章</button>
      <button onClick={onNext} disabled={!hasNext}>下一章</button>
    </div>
  )
}
