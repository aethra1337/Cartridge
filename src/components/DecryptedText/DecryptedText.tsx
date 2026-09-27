import { useEffect, useState } from 'react'

const CHARS = '!<>-_\\/[]{}—=+*^?#________'

export default function DecryptedText({
  text, speed = 35, maxIterations = 12, className = '', animateOn = 'view',
}: { text: string; speed?: number; maxIterations?: number; className?: string; animateOn?: 'view' | 'hover' }) {
  const [display, setDisplay] = useState(text)
  const [running, setRunning] = useState(animateOn === 'view')

  useEffect(() => {
    if (!running) { setDisplay(text); return }
    let iteration = 0
    const id = setInterval(() => {
      iteration += 1 / 3
      setDisplay(text.split('').map((c, i) => {
        if (c === ' ') return ' '
        if (i < iteration) return c
        return CHARS[Math.floor(Math.random() * CHARS.length)]
      }).join(''))
      if (iteration >= text.length + maxIterations * 0.1) { clearInterval(id); setDisplay(text) }
    }, speed)
    return () => clearInterval(id)
  }, [text, speed, maxIterations, running])

  return (
    <span
      className={`decrypted-text ${className}`}
      onMouseEnter={() => animateOn === 'hover' && setRunning(true)}
      onMouseLeave={() => animateOn === 'hover' && setRunning(false)}
    >
      {display}
    </span>
  )
}
