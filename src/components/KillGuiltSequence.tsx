import { useEffect, useMemo, useState } from 'react'

const WHO = [
  'แม่ของคุณ',
  'พ่อของคุณ',
  'น้องสาวของคุณ',
  'คนรักของคุณ',
  'เพื่อนสนิทของคุณ',
  'คนแปลกหน้า',
]

type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6

// killer's screen after they eliminate the other player
export default function KillGuiltSequence({
  victimName,
  onContinue,
}: {
  victimName: string
  onContinue: () => void
}) {
  const [step, setStep] = useState<Step>(0)
  const [pick, setPick] = useState<string | null>(null)
  const truth = useMemo(() => WHO[Math.floor(Math.random() * WHO.length)], [])

  useEffect(() => {
    if (step === 0 || step === 1 || step === 4 || step === 5) {
      const t = setTimeout(() => setStep((s) => (s + 1) as Step), 2800)
      return () => clearTimeout(t)
    }
  }, [step])

  const top = [
    `คุณฆ่า ${victimName} ทำไม`,
    'คุณฆ่าเขาาเพียงเพราะอยากได้ทรัพยากรหรือเปล่า?',
  ]

  return (
    <div
      className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center text-center px-6 gap-5 cursor-pointer"
      onClick={() => {
        if (step < 2 || step === 4 || step === 5) setStep((s) => (s + 1) as Step)
      }}
    >
      {step >= 0 && top[0] && (
        <p className="text-lg text-red-400 fadein leading-9">{top[0]}</p>
      )}
      {step >= 1 && (
        <p className="text-[13px] text-neutral-300 fadein leading-8 max-w-lg">
          {top[1]}
        </p>
      )}

      {step >= 2 && step <= 3 && (
        <>
          <p className="text-[12px] text-neutral-300 fadein leading-8 max-w-lg">
            สมมติว่าเขาเป็นคนคนหนึ่งในชีวิตคุณ คุณคิดว่าเขาจะเป็นใคร
          </p>
          {step === 2 && (
            <div className="grid grid-cols-2 gap-3 fadein">
              {WHO.map((w) => (
                <button
                  key={w}
                  onClick={(e) => {
                    e.stopPropagation()
                    setPick(w)
                    setStep(3)
                  }}
                  className="border-2 border-neutral-700 px-3 py-2 text-[9px] text-neutral-300 hover:bg-neutral-800 hover:border-neutral-400"
                >
                  {w}
                </button>
              ))}
            </div>
          )}
          {step === 3 && pick && (
            <p className="text-[11px] text-neutral-200 fadein leading-8 max-w-md">
              {pick === truth ? (
                <>
                  คุณเลือก {pick}
                  <br />
                  <span className="text-neutral-400">คุณรู้มาตลอด ในลึกๆ คุณรู้อยู่แล้ว</span>
                </>
              ) : (
                <>
                  คุณบอก {pick}
                  <br />
                  <span className="text-red-300">แต่จริงๆ แล้วมันคือ {truth}</span>
                </>
              )}
            </p>
          )}
        </>
      )}

      {step >= 4 && (
        <p className="text-[13px] text-neutral-300 fadein leading-8 max-w-lg">
          ถ้าสมมติว่าสิ่งนี้เกิดขึ้นในชีวิตจริง คุณจะรู้สึกยังไง...
        </p>
      )}
      {step >= 5 && (
        <p className="text-[13px] text-neutral-300 fadein leading-8 max-w-lg">
          คุณไม่มีความเห็นอกเห็นใจเขาบ้างเลยหรอ
        </p>
      )}
      {step >= 6 && (
        <div className="fadein">
          <p className="text-[13px] text-neutral-300 leading-8 max-w-lg mb-8">
            ในเมื่อเหลือขึ้นคนเดียวแล้ว... เล่นต่อไปจนกว่าเกมจะจบ
          </p>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onContinue()
            }}
            className="text-[9px] border-2 border-neutral-600 px-4 py-2 text-neutral-300 hover:bg-neutral-800"
          >
            เล่นต่อ &gt;
          </button>
        </div>
      )}
    </div>
  )
}
