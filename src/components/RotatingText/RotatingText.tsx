import { useEffect, useState } from 'react'

export default function RotatingText({ words, interval = 2200, className = '' }: { words: string[]; interval?: number; className?: string }) {
  const [index, setIndex] = useState(0)
  const [leaving, setLeaving] = useState(false)
  useEffect(() => {
    let inner: ReturnType<typeof setTimeout> | undefined
    const id = setInterval(() => {
      setLeaving(true)
      inner = setTimeout(() => { setIndex((i) => (i + 1) % words.length); setLeaving(false) }, 320)
    }, interval)
    return () => {
      clearInterval(id)
      if (inner) clearTimeout(inner)
    }
  }, [words.length, interval])
  return (
    <span className={`rotating-text ${leaving ? 'is-leaving' : ''} ${className}`}>
      {words[index]}
    </span>
  )
}
