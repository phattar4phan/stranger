import { useEffect, useState } from 'react'

export type CreditLine = { text: string; tone: 'neutral' | 'dark' | 'light' }

// stacked scenario credits: lines appear one after another.
// ends with continue (resume play) or exit (back to menu).
export default function CreditsOverlay({
  lines,
  onExit,
  onContinue,
  continueText = 'เล่นต่อ &gt;',
  exitText = 'กลับไปที่เมนูหลัก',
}: {
  lines: CreditLine[]
  onExit?: () => void
  onContinue?: () => void
  continueText?: string
  exitText?: string
}) {
  const [step, setStep] = useState(0)
  const last = step >= lines.length - 1

  // auto-advance: each slide lingers 0.25s longer than the one before
  useEffect(() => {
    if (last) return
    const t = setTimeout(() => setStep((s) => s + 1), 2000 + step * 250)
    return () => clearTimeout(t)
  }, [step, last])

  return (
    <div
      className="absolute inset-0 z-40 bg-black/95 flex flex-col items-center justify-center text-center px-6 gap-4 cursor-pointer"
      onClick={() => !last && setStep((s) => s + 1)}
    >
      {lines.slice(0, step + 1).map((l, i) => (
        <p
          key={i}
          className={
            l.tone === 'neutral'
              ? 'text-lg text-neutral-100 leading-9 fadein'
              : l.tone === 'light'
                ? 'text-[13px] text-green-300 leading-8 max-w-lg fadein'
                : 'text-[13px] text-neutral-400 leading-8 max-w-lg fadein'
          }
        >
          {l.text}
        </p>
      ))}

      {last && onContinue && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onContinue()
          }}
          className="mt-10 text-[9px] border-2 border-neutral-600 px-4 py-2 text-neutral-300 hover:bg-neutral-800"
          // eslint-disable-next-line react/no-danger-with-children
        >
          {continueText.replace('&gt;', '>')}
        </button>
      )}
      {last && !onContinue && onExit && (
        <button
          onClick={() => onExit()}
          className="mt-10 text-[9px] border-2 border-neutral-600 px-4 py-2 text-neutral-300 hover:bg-neutral-800"
        >
          {exitText}
        </button>
      )}
      {!last && (
        <p className="absolute bottom-6 text-[8px] text-neutral-600 blink">
          กดเพื่อไปต่อ &gt;
        </p>
      )}
    </div>
  )
}
