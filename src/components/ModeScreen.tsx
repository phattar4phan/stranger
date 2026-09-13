import GridBackdrop from './GridBackdrop'

export default function ModeScreen({
  onMulti,
  onJoin,
  onBack,
}: {
  onMulti: () => void
  onJoin: () => void
  onBack: () => void
}) {
  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center gap-2 fadein">
      <GridBackdrop />
      <h2 className="text-lg text-neutral-200 mb-8 border-b-2 border-neutral-600 pb-3 px-8">
        CHOOSE MODE
      </h2>
      <button
        onClick={onMulti}
        className="corner-btn text-sm text-neutral-300 hover:text-white px-6 py-2 w-80 text-center"
      >
        MULTIPLAYER — CREATE PARTY
      </button>
      <p className="text-[7px] text-neutral-600 mb-4">
        get a PIN, share it with a friend on this device — you are the host
      </p>
      <button
        onClick={onJoin}
        className="corner-btn text-sm text-neutral-300 hover:text-white px-6 py-2 w-80 text-center"
      >
        MULTIPLAYER — ENTER PARTY
      </button>
      <p className="text-[7px] text-neutral-600 mb-6">
        enter a 6-digit PIN from the party host
      </p>
      <button
        onClick={onBack}
        className="corner-btn text-sm text-neutral-400 hover:text-white px-6 py-2 w-80 text-center"
      >
        BACK
      </button>
    </div>
  )
}
