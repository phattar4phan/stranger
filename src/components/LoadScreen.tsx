import { useEffect, useState } from 'react'

export default function LoadScreen({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setPct((p) => {
        const next = p + 2 + Math.random() * 6
        if (next >= 100) {
          clearInterval(id)
          setTimeout(onDone, 600)
          return 100
        }
        return next
      })
    }, 60)
    return () => clearInterval(id)
  }, [onDone])

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-8 fadein">
      <h1 className="text-3xl tracking-widest text-neutral-200">STRANGER</h1>
      <div className="w-64 h-4 border-2 border-neutral-400 p-0.5">
        <div
          className="h-full bg-neutral-300 transition-all duration-100"
          style={{ width: `${Math.floor(pct)}%` }}
        />
      </div>
      <p className="text-[10px] text-neutral-500">
        LOADING {Math.floor(pct)}%
      </p>
    </div>
  )
}
