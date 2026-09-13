import GridBackdrop from './GridBackdrop'

export default function AboutScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center gap-6 px-8 fadein">
      <GridBackdrop />
      <h2 className="text-xl text-neutral-200 border-b-2 border-neutral-600 pb-3 px-8">
        ABOUT
      </h2>
      <div className="max-w-xl text-[10px] leading-6 text-neutral-400 space-y-4 text-center">
        <p>
          7 DAYS. TWO PLAYERS. ONE GOAL: GATHER AS MUCH AS YOU CAN.
        </p>
        <p>
          YOU CAN HELP. YOU CAN STEAL. YOU CAN HURT. THE OTHER ONE IS JUST
          "PLAYER 2" — A NAME, A COLOR, A NUMBER ON A SCREEN.
        </p>
        <p>
          YOU'LL GET ONE MOMENT THAT ASKS WHO YOU REALLY ARE. WHAT YOU DO WITH
          IT IS UP TO YOU.
        </p>
        <p className="text-neutral-500">
          YOU NEVER KNOW WHO THAT PLAYER WAS.
        </p>
      </div>
      <button onClick={onBack} className="corner-btn text-sm text-neutral-300 hover:text-white px-6 py-2 w-80 text-center">
        BACK
      </button>
    </div>
  )
}
