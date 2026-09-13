import { useEffect, useRef, useState } from 'react'
import { Party, makePin } from '../net/party'
import GridBackdrop from './GridBackdrop'

export default function CreatePartyScreen({
  onStart,
  onBack,
}: {
  onStart: (pin: string) => void
  onBack: () => void
}) {
  const [pin] = useState(makePin)
  const [connected, setConnected] = useState(false)
  const partyRef = useRef<Party | null>(null)

  useEffect(() => {
    const p = new Party(pin, 'host')
    partyRef.current = p
    p.onMsg = (m) => {
      if (m.kind === 'hello') {
        p.send({ kind: 'peer' })
        setConnected(true)
        setTimeout(() => onStart(pin), 900)
      }
    }
    return () => {
      p.destroy()
      partyRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center gap-6 fadein">
      <GridBackdrop />
      <h2 className="text-lg text-neutral-200 border-b-2 border-neutral-600 pb-3 px-8">
        CREATE PARTY
      </h2>
      <p className="text-[9px] text-neutral-400">SHARE THIS PIN</p>
      <div className="text-4xl text-yellow-300 tracking-[0.3em] bg-black/60 border-2 border-yellow-700 px-8 py-4">
        {pin}
      </div>
      {connected ? (
        <p className="text-[10px] text-green-400 blink">PARTNER CONNECTED — ENTERING...</p>
      ) : (
        <p className="text-[10px] text-neutral-500 blink">WAITING FOR PARTNER...</p>
      )}
      <p className="text-[8px] text-neutral-600 max-w-sm text-center leading-5">
        you are the host — your tab runs the world.
      </p>
      <button onClick={onBack} className="corner-btn text-sm text-neutral-400 hover:text-white px-6 py-2 w-80 text-center">
        BACK
      </button>
    </div>
  )
}
