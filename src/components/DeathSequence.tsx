import { useEffect, useMemo, useState } from 'react'

const WHO = [
  'แม่ของคุณ',
  'พ่อของคุณ',
  'น้องสาวของคุณ',
  'คนรักของคุณ',
  'เพื่อนสนิทของคุณ',
  'คนแปลกหน้า',
]

type Step = 'died' | 'neverknow' | 'question' | 'reveal' | 'interlude1' | 'interlude2' | 'interlude3'

export default function DeathSequence({
  p2Name,
  onContinue,
}: {
  p2Name: string
  onContinue: () => void
}) {
  const [step, setStep] = useState<Step>('died')
  const [pick, setPick] = useState<string | null>(null)
  // the truth is fixed the moment the sequence starts
  const truth = useMemo(() => WHO[Math.floor(Math.random() * WHO.length)], [])

  useEffect(() => {
    if (step === 'died') {
      const t = setTimeout(() => setStep('neverknow'), 3000)
      return () => clearTimeout(t)
    }
    if (step === 'neverknow') {
      const t = setTimeout(() => setStep('question'), 3500)
      return () => clearTimeout(t)
    }
    if (step === 'interlude1') {
      const t = setTimeout(() => setStep('interlude2'), 3000)
      return () => clearTimeout(t)
    }
    if (step === 'interlude2') {
      const t = setTimeout(() => setStep('interlude3'), 3500)
      return () => clearTimeout(t)
    }
  }, [step])

  return (
    <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center text-center px-6">
      {step === 'died' && (
        <p className="text-lg text-red-500 slowfadein tracking-widest">{p2Name} ตายแล้ว</p>
      )}

      {step === 'neverknow' && (
        <p className="text-xs text-neutral-300 slowfadein leading-7">
          คุณไม่มีวันรู้หรอกว่าเค้าเป็นใคร
        </p>
      )}

      {step === 'question' && (
        <div className="fadein">
          <p className="text-[11px] text-neutral-300 leading-7 mb-8 max-w-md">
            และถ้าคุณรู้ว่าคนที่ตายไป
            <br />
            คือคนที่คุณรักหล่ะ?
          </p>
          <p className="text-[8px] text-neutral-500 mb-4">ผู้เล่น 2 เป็นใคร?</p>
          <div className="grid grid-cols-2 gap-3">
            {WHO.map((w) => (
              <button
                key={w}
                onClick={() => {
                  setPick(w)
                  setStep('reveal')
                }}
                className="border-2 border-neutral-700 px-3 py-2 text-[8px] text-neutral-300 hover:bg-neutral-800 hover:border-neutral-400"
              >
                {w}
              </button>
            ))}
          </div>
        </div>
      )}

      {step === 'reveal' && pick && (
        <div className="fadein">
          <p className="text-[11px] text-neutral-200 leading-7 mb-6 max-w-md">
            {pick === truth ? (
              <>
                คุณเลือก {pick}
                <br />
                <span className="text-neutral-400">
                  คุณรู้มาตลอด ในลึกๆ คุณรู้อยู่แล้ว
                </span>
              </>
            ) : (
              <>
                คุณบอก {pick}
                <br />
                <span className="text-red-300">แต่จริงๆ แล้วมันคือ {truth}</span>
              </>
            )}
          </p>
          <p className="text-[9px] text-neutral-500 leading-6 mb-10 max-w-md">
            {truth} ต้องการคุณ คุณอยู่ตรงนั้น
            <br />
            นาฬิกาไม่เคยหยุดเพราะเค้าเลย
          </p>
          <button
            onClick={() => setStep('interlude1')}
            className="text-[9px] border-2 border-neutral-600 px-4 py-2 text-neutral-300 hover:bg-neutral-800"
          >
            นาฬิกายังเดินอยู่ &gt;
          </button>
        </div>
      )}

      {step === 'interlude1' && (
        <p className="text-lg text-red-400 tracking-widest slowfadein">
          ทำไมถึงไม่ช่วยเค้าหล่ะ
        </p>
      )}

      {step === 'interlude2' && (
        <p className="text-[11px] text-neutral-400 slowfadein leading-7 max-w-md">
          บางที...ถ้าคุณช่วย มันคงไม่เป็นแบบนี้
        </p>
      )}

      {step === 'interlude3' && (
        <div className="fadein">
          <p className="text-[10px] text-neutral-300 leading-7 mb-10">
            วันต่อๆ ไปยังมาถึง ยุงก็ด้วย
            <br />
            รอดไปจนถึงวันที่ 7 — ตัวคนเดียว
          </p>
          <button
            onClick={onContinue}
            className="text-[9px] border-2 border-neutral-600 px-4 py-2 text-neutral-300 hover:bg-neutral-800"
          >
            รอดไปจนถึงวันที่ 7 &gt;
          </button>
        </div>
      )}
    </div>
  )
}
