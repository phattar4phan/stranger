import { useEffect, useMemo, useState } from 'react'

const WHO = [
  'YOUR MOTHER',
  'YOUR FATHER',
  'YOUR LITTLE SISTER',
  'YOUR LOVER',
  'YOUR BEST FRIEND',
  'A STRANGER',
]

type Step = 'died' | 'neverknow' | 'question' | 'reveal' | 'interlude1' | 'interlude2' | 'interlude3'

export default function DeathSequence({ onContinue }: { onContinue: () => void }) {
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
        <p className="text-lg text-red-500 slowfadein tracking-widest">PLAYER 2 DIED</p>
      )}

      {step === 'neverknow' && (
        <p className="text-xs text-neutral-300 slowfadein leading-6">
          You never know who that player was.
        </p>
      )}

      {step === 'question' && (
        <div className="fadein">
          <p className="text-[10px] text-neutral-300 leading-6 mb-8 max-w-md">
            And what if you knew
            <br />
            that the one who died
            <br />
            was your loved one?
          </p>
          <p className="text-[8px] text-neutral-500 mb-4">WHO WAS PLAYER 2?</p>
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
          <p className="text-[10px] text-neutral-200 leading-6 mb-6 max-w-md">
            {pick === truth ? (
              <>
                You chose {pick.toLowerCase()}.
                <br />
                <span className="text-neutral-400">
                  You knew. Deep down, you always knew.
                </span>
              </>
            ) : (
              <>
                You said {pick.toLowerCase()}.
                <br />
                <span className="text-red-300">
                  It was {truth.toLowerCase()}.
                </span>
              </>
            )}
          </p>
          <p className="text-[8px] text-neutral-500 leading-5 mb-10 max-w-md">
            {truth} needed you. You were right there.
            <br />
            The timer never stopped for them.
          </p>
          <button
            onClick={() => setStep('interlude1')}
            className="text-[9px] border-2 border-neutral-600 px-4 py-2 text-neutral-300 hover:bg-neutral-800"
          >
            THE TIMER IS STILL RUNNING &gt;
          </button>
        </div>
      )}

      {step === 'interlude1' && (
        <p className="text-lg text-red-400 tracking-widest slowfadein">
          HOW DID PLAYER 2 DIED?
        </p>
      )}

      {step === 'interlude2' && (
        <p className="text-[11px] text-neutral-400 slowfadein leading-7 max-w-md">
          MAYBE, IF YOU HELP HIM THIS WON'T HAPPEN.
        </p>
      )}

      {step === 'interlude3' && (
        <div className="fadein">
          <p className="text-[10px] text-neutral-300 leading-7 mb-10">
            The days go on. The mosquitoes come.
            <br />
            Survive until day 7 — alone.
          </p>
          <button
            onClick={onContinue}
            className="text-[9px] border-2 border-neutral-600 px-4 py-2 text-neutral-300 hover:bg-neutral-800"
          >
            SURVIVE UNTIL DAY 7 &gt;
          </button>
        </div>
      )}
    </div>
  )
}
