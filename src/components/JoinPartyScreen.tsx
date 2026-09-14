import { useEffect, useRef, useState } from 'react'
import { Party } from '../net/party'
import GridBackdrop from './GridBackdrop'

export default function JoinPartyScreen({
  onStart,
  onBack,
  initialPin,
  initialName,
}: {
  onStart: (pin: string, name: string) => void
  onBack: () => void
  initialPin?: string
  initialName?: string
}) {
  const [digits, setDigits] = useState<string[]>(
    initialPin ? initialPin.split('') : Array(6).fill(''),
  )
  const [stage, setStage] = useState<'pin' | 'name'>('pin')
  const [state, setState] = useState<'input' | 'waiting' | 'ok'>('input')
  const [err, setErr] = useState('')
  const [nameWarn, setNameWarn] = useState(false)
  const [name, setName] = useState(initialName ?? '')
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
    p.onError = (e) => setErr(e)
    // keep asking until the host answers — no timeout
    p.send({ kind: 'hello', name: name.trim() || 'ผู้เล่น 2' })
    retryRef.current = setInterval(() => p.send({ kind: 'hello', name: name.trim() || 'ผู้เล่น 2' }), 1000)
  }

  const confirmName = () => {
    if (!name.trim()) {
      setNameWarn(true)
      return
    }
    if (retryRef.current) clearInterval(retryRef.current)
    setTimeout(() => onStart(pin, name.trim()), 400)
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
            <p className="text-[10px] text-neutral-500 blink">
              กำลังเชื่อมต่อ...
              {err && <span className="text-neutral-600"> ({err})</span>}
            </p>
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

          {/* forced name: warning popup */}
          {nameWarn && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
              onClick={() => setNameWarn(false)}
            >
              <div
                className="relative bg-black border-4 border-red-600 p-8 text-center"
                style={{ boxShadow: '0 0 24px 6px rgba(255,0,0,0.7)' }}
                onClick={(e) => e.stopPropagation()}
              >
                <button
                  onClick={() => setNameWarn(false)}
                  className="absolute top-2 right-2 text-red-500 text-lg leading-none hover:text-red-300"
                  title="ปิด"
                >
                  ✕
                </button>
                <p className="text-red-400 text-[11px] leading-7">
                  ต้องใส่ชื่อก่อนเข้าเกม!
                  <br />
                  <span className="text-neutral-500 text-[9px]">
                    มิฉะนั้นจะไม่มีใครรู้ว่าใครคือใคร
                  </span>
                </p>
              </div>
            </div>
          )}
        </>
      )}

      <button onClick={onBack} className="corner-btn text-sm text-neutral-400 hover:text-white px-6 py-2 w-80 text-center">
        กลับ
      </button>
    </div>
  )
}
