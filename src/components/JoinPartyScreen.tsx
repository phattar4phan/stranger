import { useEffect, useRef, useState } from 'react'
import { Party } from '../net/party'
import GridBackdrop from './GridBackdrop'

export default function JoinPartyScreen({
  onStart,
  onBack,
}: {
  onStart: (pin: string, name: string) => void
  onBack: () => void
}) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [stage, setStage] = useState<'pin' | 'name'>('pin')
  const [state, setState] = useState<'input' | 'waiting' | 'ok'>('input')
  const [name, setName] = useState('')
  const partyRef = useRef<Party | null>(null)
  const retryRef = useRef<ReturnType<typeof setInterval> | null>(null)
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
        if (retryRef.current) clearInterval(retryRef.current)
        setState('ok')
        setTimeout(() => setStage('name'), 700)
      }
    }
    // keep asking until the host answers — no timeout
    p.send({ kind: 'hello' })
    retryRef.current = setInterval(() => p.send({ kind: 'hello' }), 1000)
  }

  const confirmName = () => {
    if (retryRef.current) clearInterval(retryRef.current)
    setTimeout(() => onStart(pin, name.trim() || 'ผู้เล่น 2'), 400)
  }

  useEffect(() => {
    document.getElementById('pin-0')?.focus()
    return () => {
      if (retryRef.current) clearInterval(retryRef.current)
      partyRef.current?.destroy()
    }
  }, [])

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center gap-6 fadein">
      <GridBackdrop />
      <h2 className="text-lg text-neutral-200 border-b-2 border-neutral-600 pb-3 px-8">
        เข้าร่วมปาร์ตี้
      </h2>

      {stage === 'pin' && (
        <>
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
            <p className="text-[10px] text-neutral-500 blink">กำลังเชื่อมต่อ...</p>
          )}
          {state === 'ok' && (
            <p className="text-[10px] text-green-400 blink">เชื่อมต่อสำเร็จ</p>
          )}
          <button
            onClick={join}
            disabled={pin.length !== 6}
            className="corner-btn text-sm text-neutral-300 hover:text-white px-6 py-2 w-80 text-center disabled:opacity-30"
          >
            ต่อไป
          </button>
        </>
      )}

      {stage === 'name' && (
        <>
          <p className="text-[9px] text-neutral-400">คุณคือ ผู้เล่น 2 — ใส่ชื่อของคุณ</p>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 12))}
            placeholder="ใส่ชื่อ"
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && confirmName()}
            className="w-56 h-10 text-center text-sm bg-black/60 border-2 border-neutral-600 text-neutral-100 focus:border-yellow-400 outline-none"
          />
          <button
            onClick={confirmName}
            className="corner-btn text-sm text-neutral-300 hover:text-white px-6 py-2 w-80 text-center"
          >
            เข้าเกม
          </button>
        </>
      )}

      <button onClick={onBack} className="corner-btn text-sm text-neutral-400 hover:text-white px-6 py-2 w-80 text-center">
        กลับ
      </button>
    </div>
  )
}
