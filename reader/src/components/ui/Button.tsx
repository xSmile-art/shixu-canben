import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: 'primary' | 'ghost'
}

export function Button({ children, variant = 'primary', disabled, className = '', ...rest }: ButtonProps) {
  const base = 'px-3 py-1.5 rounded text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
  const styles = variant === 'primary'
    ? 'bg-accent text-bg hover:opacity-90'
    : 'bg-transparent text-fg border border-border hover:bg-highlight'
  return (
    <button className={`${base} ${styles} ${className}`} disabled={disabled} {...rest}>
      {children}
    </button>
  )
}
