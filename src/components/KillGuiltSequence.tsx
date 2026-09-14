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

// killer's screen after they eliminate the other player — one line at a time
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

  const line = [
    `คุณฆ่า ${victimName} ทำไม`,
    'คุณฆ่าเขาาเพียงเพราะอยากได้ทรัพยากรหรือเปล่า?',
    'สมมติว่าเขาเป็นคนคนหนึ่งในชีวิตคุณ คุณคิดว่าเขาจะเป็นใคร',
    '',
    'ถ้าสมมติว่าสิ่งนี้เกิดขึ้นในชีวิตจริง คุณจะรู้สึกยังไง...',
    'คุณไม่มีความเห็นอกเห็นใจเขาบ้างเลยหรอ',
    'ในเมื่อเหลือขึ้นคนเดียวแล้ว... เล่นต่อไปจนกว่าเกมจะจบ',
  ]

  return (
    <div
      className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center text-center px-6 cursor-pointer"
      onClick={() => {
        if (step < 2 || step === 4 || step === 5) setStep((s) => (s + 1) as Step)
      }}
    >
      {step !== 2 && step !== 3 && (
        <p key={step} className="text-[26px] text-red-400 credit-in leading-12">
          {line[step]}
        </p>
      )}

      {step === 2 && (
        <>
          <p className="text-[18px] text-neutral-300 credit-in leading-9 max-w-2xl mb-6">
            {line[2]}
          </p>
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
        </>
      )}

      {step === 3 && pick && (
        <p key={pick} className="text-[18px] text-neutral-200 credit-in leading-9 max-w-xl">
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

      {step === 6 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onContinue()
          }}
          className="text-[9px] border-2 border-neutral-600 px-4 py-2 text-neutral-300 hover:bg-neutral-800"
        >
          เล่นต่อ &gt;
        </button>
      )}
    </div>
  )
}
