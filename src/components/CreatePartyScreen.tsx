import { useEffect, useRef, useState } from 'react'
import { Party, makePin } from '../net/party'
import GridBackdrop from './GridBackdrop'

export default function CreatePartyScreen({
  onStart,
  onBack,
}: {
  onStart: (pin: string, name: string) => void
  onBack: () => void
}) {
  const [pin] = useState(makePin)
  const [name, setName] = useState('')
  const [connected, setConnected] = useState(false)
  const partyRef = useRef<Party | null>(null)
  const nameRef = useRef('')
  nameRef.current = name

  useEffect(() => {
    const p = new Party(pin, 'host')
    partyRef.current = p
    p.onMsg = (m) => {
      if (m.kind === 'hello') {
        setConnected(true)
        setTimeout(() => onStart(pin, nameRef.current.trim() || 'ผู้เล่น 1'), 900)
      }
    }
    return () => {
      p.destroy()
      partyRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center gap-5 fadein">
      <GridBackdrop />
      <h2 className="text-lg text-neutral-200 border-b-2 border-neutral-600 pb-3 px-8">
        สร้างปาร์ตี้
      </h2>
      <p className="text-[9px] text-neutral-400">PIN ของคุณ</p>
      <div className="text-4xl text-yellow-300 tracking-[0.3em] bg-black/60 border-2 border-yellow-700 px-8 py-4">
        {pin}
      </div>
      <label className="text-[9px] text-neutral-400 flex flex-col items-center gap-2">
        ชื่อของคุณ (ผู้เล่น 1)
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 12))}
          placeholder="ใส่ชื่อ"
          className="w-56 h-10 text-center text-sm bg-black/60 border-2 border-neutral-600 text-neutral-100 focus:border-yellow-400 outline-none"
        />
      </label>
      {connected ? (
        <p className="text-[10px] text-green-400 blink">เพื่อนมาแล้ว — กำลังเข้าเกม...</p>
      ) : (
        <p className="text-[10px] text-neutral-500 blink">กำลังรอเพื่อน...</p>
      )}
      <button onClick={onBack} className="corner-btn text-sm text-neutral-400 hover:text-white px-6 py-2 w-80 text-center">
        กลับ
      </button>
    </div>
  )
}
