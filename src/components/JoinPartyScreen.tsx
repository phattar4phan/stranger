import { useEffect, useRef, useState } from 'react'
import { Party } from '../net/party'
import GridBackdrop from './GridBackdrop'

export default function JoinPartyScreen({
  onStart,
  onBack,
}: {
  onStart: (pin: string) => void
  onBack: () => void
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [state, setState] = useState<'input' | 'waiting' | 'ok'>('input')
  const partyRef = useRef<Party | null>(null)
  const pin = digits.join('')

  const setDigit = (i: number, v: string) => {
    const d = v.replace(/\D/g, '').slice(-1)
    setDigits((arr) => {
      const next = [...arr]
      next[i] = d
      return next
    })
    if (d && i < 5) {
      document.getElementById(`pin-${i + 1}`)?.focus()
    }
    if (d && i === 5) {
      document.getElementById(`pin-${i}`)?.blur()
    }
  }

  const join = () => {
    if (pin.length !== 6) return
    setState('waiting')
    const p = new Party(pin, 'guest')
    partyRef.current = p
    p.onMsg = (m) => {
      if (m.kind === 'peer') {
        setState('ok')
        setTimeout(() => onStart(pin), 900)
      }
    }
    p.send({ kind: 'hello' })
    // re-ask in case host tab opened after
    const retry = setInterval(() => p.send({ kind: 'hello' }), 1500)
    setTimeout(() => clearInterval(retry), 12000)
  }

  useEffect(() => {
    document.getElementById('pin-0')?.focus()
    return () => partyRef.current?.destroy()
  }, [])

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center gap-6 fadein">
      <GridBackdrop />
      <h2 className="text-lg text-neutral-200 border-b-2 border-neutral-600 pb-3 px-8">
        ENTER PARTY PIN
      </h2>
      <div className="flex gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            id={`pin-${i}`}
            value={d}
            onChange={(e) => setDigit(i, e.target.value)}
            inputMode="numeric"
            maxLength={2}
            className="w-12 h-14 text-center text-2xl bg-black/60 border-2 border-neutral-600 text-neutral-100 focus:border-yellow-400 outline-none"
          />
        ))}
      </div>
      {state === 'waiting' && (
        <p className="text-[10px] text-neutral-500 blink">CONNECTING...</p>
      )}
      {state === 'ok' && (
        <p className="text-[10px] text-green-400 blink">CONNECTED — ENTERING...</p>
      )}
      <button
        onClick={join}
        disabled={pin.length !== 6}
        className="corner-btn text-sm text-neutral-300 hover:text-white px-6 py-2 w-80 text-center disabled:opacity-30"
      >
        JOIN
      </button>
      <p className="text-[8px] text-neutral-600 max-w-sm text-center leading-5">
        multiplayer runs between tabs of this browser. open this game in a
        second tab, create a party there, type its PIN here.
      </p>
      <button onClick={onBack} className="corner-btn text-sm text-neutral-400 hover:text-white px-6 py-2 w-80 text-center">
        BACK
      </button>
    </div>
  )
}
