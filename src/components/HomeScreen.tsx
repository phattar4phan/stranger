import { useState } from 'react'
import GridBackdrop from './GridBackdrop'

export default function HomeScreen({
  onPlay,
  onAbout,
}: {
  onPlay: () => void
  onAbout: () => void
}) {
  const [exitMsg, setExitMsg] = useState(false)

  const exit = () => {
    window.close()
    // if the browser blocks window.close, tell the player
    setTimeout(() => setExitMsg(true), 300)
  }

  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center gap-2 fadein">
      <GridBackdrop />
      <h1 className="text-4xl tracking-widest text-neutral-200 mb-10 border-b-2 border-neutral-600 pb-4 px-8">
        STRANGER
      </h1>

      <button onClick={onPlay} className="corner-btn text-sm text-neutral-300 hover:text-white px-6 py-2 w-80 text-center">
        PLAY
      </button>
      <button onClick={onAbout} className="corner-btn text-sm text-neutral-300 hover:text-white px-6 py-2 w-80 text-center">
        ABOUT
      </button>
      <button onClick={exit} className="corner-btn text-sm text-neutral-300 hover:text-white px-6 py-2 w-80 text-center">
        EXIT
      </button>

      {exitMsg && (
        <p className="text-[10px] text-neutral-500 mt-6">
          your browser blocked exit. close the tab to leave.
        </p>
      )}

      <p className="absolute bottom-4 text-[8px] text-neutral-600">
        EVERYONE OUT THERE IS A STRANGER. UNTIL THEY AREN'T.
      </p>
    </div>
  )
}
