import { useEffect, useState } from 'react'
import type { Inventory } from '../game/engine'

type Ending = {
  kind: 'win' | 'lose'
  p1: Inventory
  p2: Inventory
  helped: boolean
  p2Dead: boolean
  p1Dead: boolean
  p1Name: string
  p2Name: string
  role: 'host' | 'guest'
}

export default function EndingOverlay({
  ending,
  onExit,
}: {
  ending: Ending
  onExit: () => void
}) {
  const [step, setStep] = useState(0)

  const { p2Dead, p1Name, p2Name, role } = ending
  const deadName = p2Dead ? p2Name : p1Name
  const otherName = role === 'host' ? p2Name : p1Name

  // credit lines, click-through like end credits
  const lines: { text: string; tone: 'neutral' | 'dark' | 'light' }[] = []

  if (p2Dead || ending.p1Dead) {
    // reached day 7 but someone is lying on the grass
    lines.push(
      { text: 'ครบ 7 วันแล้ว', tone: 'neutral' },
      { text: 'คุณชนะแล้ว', tone: 'neutral' },
      { text: `แต่ ${deadName} ตาย`, tone: 'dark' },
      { text: 'แล้วทรัพยากรที่คุณได้มาจะมีประโยชน์อะไร', tone: 'dark' },
      { text: 'ถ้าคุณแบ่งมันกับใครไม่ได้', tone: 'dark' },
      {
        text: 'ถ้าคุณเห็นอกเห็นใจเค้า เอาใจช่วยกันเล่นให้รอดจนถึงวันที่ 7 คุณทั้งคู่ก็จะชนะ',
        tone: 'dark',
      },
      { text: 'THE END', tone: 'neutral' },
    )
  } else {
    // both made it to day 7
    lines.push(
      { text: 'ครบ 7 วันแล้ว', tone: 'neutral' },
      { text: `คุณและ ${otherName} ชนะแล้ว`, tone: 'neutral' },
      { text: 'ทำได้ดีมาก', tone: 'light' },
      { text: 'คุณช่วยกัน เห็นอกเห็นใจกัน', tone: 'light' },
      { text: '...นี่คือสิ่งที่มนุษย์ทุกคนต้องมี', tone: 'light' },
      { text: 'ถ้าคุณไม่เห็นใจกัน มันอาจจะจบในรูปแบบอื่นก็ได้...', tone: 'dark' },
      { text: 'เก่งมาก...', tone: 'light' },
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
            ? 'text-xl text-neutral-100 leading-9'
            : line.tone === 'light'
              ? 'text-[13px] text-green-300 leading-8 max-w-lg'
              : 'text-[13px] text-neutral-400 leading-8 max-w-lg'
        }
      >
        {line.text}
      </p>

      {last ? (
        <div className="mt-12">
          <p className="text-[8px] text-neutral-600 mb-6">
            คุณ: {total(ending.p1)} · ผู้เล่น 2: {total(ending.p2)}
          </p>
          <button
            onClick={() => onExit()}
            className="text-[9px] border-2 border-neutral-600 px-4 py-2 text-neutral-300 hover:bg-neutral-800"
          >
            กลับไปที่เมนูหลัก
          </button>
        </div>
      ) : (
        <p className="absolute bottom-6 text-[8px] text-neutral-600 blink">
          กดเพื่อไปต่อ &gt;
        </p>
      )}
    </div>
  )
}

const total = (i: Inventory) => Object.values(i).reduce((a, b) => a + b, 0)
