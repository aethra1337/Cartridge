import type { ReactNode, MouseEvent } from 'react'

export default function StarBorder({ children, onClick, href, className = '' }: { children: ReactNode; onClick?: () => void; href?: string; className?: string }) {
  const inner = <span className="starborder-inner">{children}</span>
  if (href) return <a href={href} className={`starborder ${className}`}>{inner}</a>
  return <button className={`starborder ${className}`} onClick={(e: MouseEvent) => { e.preventDefault(); onClick?.() }}>{inner}</button>
}
