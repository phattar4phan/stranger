import { useEffect, useState } from 'react'
import type { Inventory } from '../game/engine'

type Ending =
  | { kind: 'win'; p1: Inventory; p2: Inventory; helped: boolean; p2Dead: boolean }
  | { kind: 'lose'; p1: Inventory; p2: Inventory; helped: boolean }

const total = (i: Inventory) => Object.values(i).reduce((a, b) => a + b, 0)

export default function EndingOverlay({
  ending,
  onExit,
}: {
  ending: Ending
  onExit: () => void
}) {
  const [step, setStep] = useState(0)

  const won = ending.kind === 'win'
  const helped = ending.helped
  const p2Dead = ending.kind === 'win' && ending.p2Dead

  // credit lines, click-through like end credits
  const lines: { text: string; tone: 'neutral' | 'dark' | 'light' }[] = []

  if (!won) {
    lines.push(
      { text: '7 DAYS PASSED', tone: 'neutral' },
      { text: 'PLAYER 2 WINS', tone: 'neutral' },
      {
        text: helped
          ? 'You stopped to help a stranger. It cost you the game.'
          : 'You lost. But you never had to carry it alone.',
        tone: 'dark',
      },
      {
        text: "See everyone as important. Help them when they're in a tough part. You'll never know how important they are to you.",
        tone: 'dark',
      },
      { text: 'THE END', tone: 'neutral' },
    )
  } else if (p2Dead) {
    lines.push(
      { text: '7 DAYS PASSED', tone: 'neutral' },
      { text: 'YOU WON', tone: 'neutral' },
      { text: 'but at what cost?', tone: 'dark' },
      { text: 'You can no longer share the resources.', tone: 'dark' },
      {
        text: "You're the only one who won. But you lost your humanity. You lost kindness. You lost mercy.",
        tone: 'dark',
      },
      {
        text: "See everyone as important. Help them when they're in a tough part. You'll never know how important they are to you.",
        tone: 'dark',
      },
      { text: 'THE END', tone: 'neutral' },
    )
  } else {
    // both made it to day 7
    lines.push(
      { text: '7 DAYS PASSED', tone: 'neutral' },
      { text: 'YOU BOTH SURVIVED', tone: 'neutral' },
      { text: 'WELL DONE.', tone: 'light' },
      { text: 'YOU BOTH HELP EACH OTHER AND MANAGE TO WIN.', tone: 'light' },
      { text: 'THIS IS WHAT HUMANITY SHOULD BE.', tone: 'light' },
      {
        text: "See everyone as important. Help them when they're in a tough part. You'll never know how important they are to you.",
        tone: 'dark',
      },
      { text: 'THE END', tone: 'neutral' },
    )
  }

  const line = lines[Math.min(step, lines.length - 1)]
  const last = step >= lines.length - 1

  // auto-advance: each slide lingers 0.25s longer than the one before
  useEffect(() => {
    if (last) return
    const t = setTimeout(() => setStep((s) => s + 1), 2000 + step * 250)
    return () => clearTimeout(t)
  }, [step, last])

  return (
    <div
      className="absolute inset-0 z-40 bg-black/90 flex flex-col items-center justify-center text-center px-6 cursor-pointer"
      onClick={() => !last && setStep((s) => s + 1)}
    >
      <p
        className={
          line.tone === 'neutral'
            ? 'text-xl text-neutral-100 leading-8'
            : line.tone === 'light'
              ? 'text-[11px] text-green-300 leading-7 max-w-lg'
              : 'text-[11px] text-neutral-400 leading-7 max-w-lg'
        }
      >
        {line.text}
      </p>

      {last ? (
        <div className="mt-12">
          <p className="text-[8px] text-neutral-600 mb-6">
            FINAL COUNT — YOU: {total(ending.p1)} · PLAYER 2:{' '}
            {total(ending.p2)}
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onExit()
            }}
            className="text-[9px] border-2 border-neutral-600 px-4 py-2 text-neutral-300 hover:bg-neutral-800"
          >
            BACK TO TITLE
          </button>
        </div>
      ) : (
        <p className="absolute bottom-6 text-[8px] text-neutral-600 blink">
          CLICK &gt;
        </p>
      )}
    </div>
  )
}
