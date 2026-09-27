import { useEffect, useRef, useState } from 'react'

export default function BlurText({
  text, delay = 45, className = '',
}: { text: string; delay?: number; className?: string }) {
  const [visible, setVisible] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const words = text.split(' ').length
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true
          let i = 0
          const id = setInterval(() => {
            i += 1
            setVisible(i)
            if (i >= words) clearInterval(id)
          }, delay)
        }
      },
      { threshold: 0.3 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [text, delay])

  const words = text.split(' ')
  return (
    <span ref={ref} className={`blur-text ${className}`}>
      {words.map((w, i) => (
        <span key={i} className={i < visible ? 'is-visible' : ''}>
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </span>
      ))}
    </span>
  )
}
