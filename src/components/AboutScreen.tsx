import GridBackdrop from './GridBackdrop'

export default function AboutScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="relative h-full w-full flex flex-col items-center justify-center gap-6 px-8 fadein">
      <GridBackdrop />
      <h2 className="text-xl text-neutral-200 border-b-2 border-neutral-600 pb-3 px-8">
        เกี่ยวกับ
      </h2>
      <div className="max-w-xl text-[11px] leading-7 text-neutral-400 space-y-4 text-center">
        <p>7 วัน ผู้เล่น 2 คน เป้าหมายเดียว: เก็บทรัพยากรให้ได้มากที่สุด</p>
        <p>
          คุณช่วยได้ ขโมยได้ ทำร้ายได้ อีกฝ่ายเป็นแค่ "ผู้เล่น 2" — ชื่อ สี
          ตัวเลขบนจอ
        </p>
        <p>
          จะมีอยู่ช่วงหนึ่งที่เกมถามว่าคุณเป็นมนุษย์แค่ไหน ทำอะไรกับมันขึ้นกับคุณ
        </p>
        <p className="text-neutral-500">คุณไม่มีวันรู้หรอกว่าเค้าเป็นใคร</p>
      </div>
      <button onClick={onBack} className="corner-btn text-sm text-neutral-300 hover:text-white px-6 py-2 w-80 text-center">
        กลับ
      </button>
    </div>
  )
}
