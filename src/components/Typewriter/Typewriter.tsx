import { useEffect, useRef, useState } from 'react'

export default function Typewriter({
  text, speed = 40, className = '',
}: { text: string; speed?: number; className?: string }) {
  const [count, setCount] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const started = useRef(false)

  useEffect(() => {
    setCount(0)
    started.current = false
    const el = ref.current
    if (!el) return
    let id: ReturnType<typeof setInterval> | undefined
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !started.current) {
          started.current = true
          let i = 0
          id = setInterval(() => {
            i += 1
            setCount(i)
            if (i >= text.length && id) clearInterval(id)
          }, speed)
        }
      },
      { threshold: 0.3 }
    )
    io.observe(el)
    return () => {
      io.disconnect()
      if (id) clearInterval(id)
    }
  }, [text, speed])

  const done = count >= text.length
  return (
    <span ref={ref} className={`typewriter ${className}`}>
      {text.slice(0, count)}
      <span className={`typewriter-caret${done ? ' is-done' : ''}`} aria-hidden="true" />
    </span>
  )
}
