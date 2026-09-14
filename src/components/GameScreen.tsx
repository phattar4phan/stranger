import { useEffect, useRef, useState } from 'react'
import {
  Game,
  type HudState,
  GAME_DURATION,
  SELL_PRICE,
  FOOD_HUNGER,
  FOOD_PRICE,
  WEAPONS,
  WEAPON_PRICE,
  HP_UP_PRICE,
  HUNGER_UP_PRICE,
  THAI,
  THAI_WEAPON,
  type Item,
  type Food,
} from '../game/engine'
import DeathSequence from './DeathSequence'
import CreditsOverlay, { type CreditLine } from './EndingOverlay'
import KillGuiltSequence from './KillGuiltSequence'
import type { DeathCause } from '../game/engine'
import { Party, type PartyMsg } from '../net/party'
import type { PartySession } from '../App'

const fmt = (s: number) => {
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

const pips = (v: number, max: number, icon: string) => (
  <span className="inline-flex gap-0.5 align-middle text-[15px] leading-none">
    {Array.from({ length: max }, (_, i) => (
      <span key={i} className={i < v ? '' : 'opacity-25 grayscale'}>
        {icon}
      </span>
    ))}
  </span>
)

type PanelState = 'closed' | 'open' | 'closing'
type DeathReason = 'neglect' | 'attacked' | 'mosquito' | 'starved' | 'killed'

const SELLABLE: Item[] = ['strawberry', 'blueberry', 'wood', 'stone', 'mushroom']

// pixel icon chips, shared by inventory slots and trade panels
const ICONS: [Item | 'coin', string][] = [
  ['strawberry', '#c0392b'],
  ['blueberry', '#3b5bdb'],
  ['wood', '#8b5a2b'],
  ['stone', '#95a5a6'],
  ['mushroom', '#8e44ad'],
  ['steak', '#b06f3d'],
  ['pork', '#e8919b'],
  ['beef', '#a05048'],
  ['cake', '#f0c8d8'],
  ['coin', '#e0b34a'],
]
const iconColor = (k: Item | 'coin') => ICONS.find(([n]) => n === k)![1]

const Icon = ({ k, size = 16 }: { k: Item | 'coin'; size?: number }) => (
  <span
    className="inline-block border-2 border-black/50 align-middle"
    style={{
      width: size,
      height: size,
      backgroundColor: iconColor(k),
      borderRadius: k === 'coin' ? '50%' : 0,
    }}
  />
)

const hud0: HudState & { name: string; oppName: string } = {
  timeLeft: GAME_DURATION,
  day: 1,
  dayLeft: 90,
  coins: 0,
  hp: 5,
  maxHp: 5,
  hunger: 5,
  maxHunger: 5,
  weaponTier: 0,
  mode: 'collect',
  p1: {
    strawberry: 0,
    blueberry: 0,
    wood: 0,
    stone: 0,
    mushroom: 0,
    steak: 0,
    pork: 0,
    beef: 0,
    cake: 0,
  },
  p2Total: 0,
  p2Alive: true,
  distressActive: false,
  toast: '',
  name: '',
  oppName: '',
}

const L = (text: string, tone: CreditLine['tone'] = 'dark'): CreditLine => ({ text, tone })

// ---- scenario credit lines ----

// the player who was killed, on their own screen
const victimLines = (cause: DeathCause, day: number): CreditLine[] => {
  if (cause === 'player')
    return [
      L('ไม่เป็นไร...'),
      L('เขาแค่ไม่เห็นใจคุณ'),
      L('เขาแค่อยากชนะคนเดียว'),
      L('เริ่มเล่นใหม่ได้นะ'),
      L('แค่พวกคุณเห็นใจกัน เอาใจช่วยกัน ก็สามารถชนะเกมนี้ได้'),
    ]
  const first =
    cause === 'mosquito' ? 'คุณถูกยุงฆ่าตาย' : cause === 'starved' ? 'คุณหิวจนตาย' : 'คุณถูกทิ้งไว้จนตาย'
  return [
    L(first),
    L(`ในวันที่ ${day}`),
    L('ไม่เป็นไร... ถ้าผู้เล่นอีกคนช่วยคุณได้ก็น่าจะดี'),
    L('แต่อาจจะไม่ใช่เพราะเขาก็ได้'),
    L('เอาใจช่วยกันดีๆ จะได้สามารถชนะเกมนี้ได้...'),
  ]
}

// the player who lived on, right after the other died
const noticeLines = (deadName: string): CreditLine[] => [
  L(`ผู้เล่น ${deadName} ตายแล้ว`),
  L('คุณไม่ช่วยเขาหล่ะ'),
  L('หรือว่าคุณอาจจะช่วยไม่ทัน หรือ ไม่ได้สังเกต'),
  L('ไม่เป็นไร...'),
  L('เอาใหม่นะ อยู่ให้รอดจนกว่าเกมจะจบ'),
]

// survivor reached day 7
const survEndLines = (cause: DeathCause | '', deadName: string): CreditLine[] =>
  cause === 'player'
    ? [
        L('ยินดีด้วย คุณอยู่รอดจนจบเกม'),
        L(`แล้วคุณแบ่งชัยชนะให้ ${deadName} ได้ไหม`),
        L('ถ้าเขาชนะไปพร้อมกับคุณก็น่าจะดีนะ'),
        L('มีความเห็นอกเห็นใจกันบ้าง'),
      ]
    : [
        L('เก่งมากที่สามารถอยู่รอดได้'),
        L(`${deadName} น่าจะดีใจนะ แต่เค้าไม่อยู่ด้วยแล้ว`),
        L('รอบหน้าให้ช่วยกันเล่น...'),
      ]

// survivor died before the end
const survDiedLines = (cause: DeathCause | '', deadName: string): CreditLine[] =>
  cause === 'player'
    ? [
        L('สุดท้าย... คุณก็อยู่ไม่รอด'),
        L('ถ้ามีเขาคุณอาจจะอยู่รอดจนจบและชนะไปพร้อมกันก็ได้นะ'),
        L('ถ้าคุณไม่คิดจะฆ่าเค้าเพื่อเอาแค่ทรัพยากร...ก็น่าจะชนะไปด้วยกันได้'),
        L('แต่สุดท้ายไม่มีเขาคุณก็แพ้'),
        L('แค่เห็นใจเค้าคุณก็พากันชนะได้'),
      ]
    : [
        L('สุดท้ายคุณก็อยู่ไม่รอด'),
        L(`ถ้ามี ${deadName} อยู่เล่นต่อด้วยก็น่าจะดี`),
        L('เล่นอีกทีรอบหน้าคอยเอาใจช่วยกันนะ'),
        L('แค่นี้ก็เก่งมากๆแล้ว'),
      ]

// both alive at day 7
const bothLines = (otherName: string): CreditLine[] => [
  L('เก่งมากๆ...'),
  L(`คุณและ ${otherName} สามารถอยู่รอดได้ถึง 7 วัน`),
  L('รู้มั้ยเพราะอะไร ทำไมถึงอยู่ได้นานขนาดนี้...'),
  L('เพราะคุณคอยช่วยเหลือกัน เห็นใจกันและกันยังไงหล่ะ'),
  L('ถึงสามารถช่วยเหลือกันและอยู่รอดจนจบเกมได้'),
  L('สุดยอด...'),
]

export default function GameScreen({
  party,
  onExit,
}: {
  party: PartySession | null
  onExit: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<Game | null>(null)
  const partyRef = useRef<Party | null>(null)
  const role = party?.role ?? 'host'
  const isGuest = role === 'guest'
  const isHost = role === 'host'
  const myName = party?.myName ?? 'ผู้เล่น 1'

  const [hud, setHud] = useState<HudState & { name: string; oppName: string }>(hud0)
  const hudRef = useRef(hud)
  hudRef.current = hud
  const [deathReason, setDeathReason] = useState<DeathReason | null>(null)
  const [deathDay, setDeathDay] = useState(1)
  const [deathDone, setDeathDone] = useState(false)
  const [p1DeathReason, setP1DeathReason] = useState<DeathReason | null>(null)
  const [p1Died, setP1Died] = useState(false)
  const [showDev, setShowDev] = useState(false)
  const [devMode, setDevMode] = useState(false)
  const [sellState, setSellState] = useState<PanelState>('closed')
  const [shopState, setShopState] = useState<PanelState>('closed')
  const [fx, setFx] = useState<{ panel: 'sell' | 'shop'; n: number } | null>(null)
  const [ending, setEnding] = useState<CreditLine[] | null>(null)
  const firstCauseRef = useRef<DeathCause | ''>('')
  const cleanupRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // note the first death's cause — decides which end credits play later
  const noteFirstCause = (r: DeathReason) => {
    if (firstCauseRef.current) return
    firstCauseRef.current =
      r === 'attacked' ? 'player' : r === 'killed' ? 'player' : (r as DeathCause)
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const g = new Game(
      canvas,
      {
        onHud: setHud,
        onDistress: () => setHud((h) => ({ ...h, distressActive: true })),
        onDistressEnd: () => setHud((h) => ({ ...h, distressActive: false })),
        onDeath: (reason) => {
          setDeathReason(reason)
          setDeathDay(hudRef.current.day)
          noteFirstCause(reason)
        },
        onP1Death: (reason) => {
          setP1DeathReason(reason)
          setP1Died(true)
          setDeathDay(hudRef.current.day)
          noteFirstCause(reason)
        },
        onGameOver: () => {
          // second death: show the survivor-died credits on their screen
          const g2 = gameRef.current
          if (!g2) return
          const s = g2.getSnap()
          const firstDeadIsP2 = isGuest ? s.firstDead === 'p1' : s.firstDead === 'p2'
          if (!firstDeadIsP2) return // the already-dead side keeps its exit screen
          const opp = isGuest ? s.p1Name : s.p2Name
          setEnding(survDiedLines(s.firstCause || firstCauseRef.current, opp))
        },
        onTimeUp: () => {
          const g2 = gameRef.current
          if (!g2) return
          const s = g2.getSnap()
          const opp = isGuest ? s.p1Name : s.p2Name
          const bothAlive = s.p1Alive && s.p2Alive
          if (bothAlive) {
            setEnding(bothLines(opp))
          } else {
            // read the cause from the synced world, not local memory
            setEnding(survEndLines(s.firstCause || firstCauseRef.current, opp))
          }
        },
      },
      { multi: isHost, guest: isGuest, myName },
    )
    gameRef.current = g

    // multiplayer wiring
    if (party) {
      const p = new Party(party.pin, party.role, myName)
      partyRef.current = p
      p.onMsg = (m: PartyMsg) => {
        if (isHost && m.kind === 'input') g.setRemoteInput(m.input)
        if (isHost && m.kind === 'act') g.guestAct(m.act)
        if (isHost && m.kind === 'hello' && m.name) g.setP2Name(m.name)
        if (isGuest && m.kind === 'snap') g.applySnap(m.snap)
      }
      if (isHost) {
        cleanupRef.current = setInterval(
          () => partyRef.current?.send({ kind: 'snap', snap: g.getSnap() }),
          66,
        )
      } else {
        cleanupRef.current = setInterval(
          () => partyRef.current?.send({ kind: 'input', input: g.readInput() }),
          50,
        )
      }
    }

    return () => {
      g.destroy()
      gameRef.current = null
      partyRef.current?.destroy()
      partyRef.current = null
      if (cleanupRef.current) clearInterval(cleanupRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tradeFx = (panel: 'sell' | 'shop') => setFx({ panel, n: Date.now() })

  const closePanel = (set: (v: PanelState) => void) => {
    set('closing')
    setTimeout(() => set('closed'), 500)
  }
  const openPanel = (
    cur: PanelState,
    set: (v: PanelState) => void,
    otherCur: PanelState,
    setOther: (v: PanelState) => void,
  ) => {
    if (cur === 'open') {
      closePanel(set)
      return
    }
    if (otherCur === 'open') closePanel(setOther)
    set('open')
  }

  const selfName = isGuest ? `คุณ (${myName})` : `คุณ (${hud.name || myName})`
  const oppName = hud.oppName || (isGuest ? 'ผู้เล่น 1' : 'ผู้เล่น 2')
  const anyOverlay = deathReason !== null || p1Died || ending !== null

  const resumeAfterDeath = () => {
    setDeathReason(null)
    setDeathDone(true)
    gameRef.current?.resumeAfterDeath()
  }
  // touch device? show on-screen controls
  const [isTouch] = useState(
    () =>
      typeof window !== 'undefined' &&
      (window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window),
  )

  const hold = (k: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      ;(e.target as HTMLElement).setPointerCapture?.(e.pointerId)
      gameRef.current?.press(k)
    },
    onPointerUp: () => gameRef.current?.release(k),
    onPointerCancel: () => gameRef.current?.release(k),
    onPointerLeave: () => gameRef.current?.release(k),
  })
  const tap = (k: string) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault()
      gameRef.current?.press(k)
    },
  })

  const touchBtn =
    'w-14 h-14 bg-black/60 border-2 border-neutral-600 text-neutral-200 text-[11px] active:bg-neutral-700/90 select-none touch-none flex items-center justify-center'

  return (
    <div className="h-full w-full flex items-center justify-center bg-black">
      <div
        className="relative border-2 border-neutral-800"
        style={{ width: 'min(100vw, 177.78vh)', height: 'min(100vh, 56.25vw)' }}
      >
        <canvas ref={canvasRef} className="w-full h-full" />

        {/* HUD top */}
        <div className="absolute top-0 left-0 right-0 flex justify-between items-start p-2 text-[9px] pointer-events-none">
          <div className="flex flex-col gap-1 items-start">
            <div className="bg-black/60 px-2 py-1.5 space-y-1 pointer-events-auto">
              <div className="text-sky-300">
                {selfName} ·{' '}
                <span className="text-amber-400">{THAI_WEAPON[hud.weaponTier]}</span>
              </div>
              <div className="text-neutral-300">HP {pips(hud.hp, hud.maxHp, '❤️')}</div>
              <div className="text-neutral-300">หิว {pips(hud.hunger, hud.maxHunger, '🍗')}</div>
            </div>
            <button
              onClick={() => openPanel(sellState, setSellState, shopState, setShopState)}
              className={`pointer-events-auto border-2 px-5 py-2.5 text-[11px] ${
                sellState === 'open'
                  ? 'border-yellow-400 bg-yellow-900/80 text-yellow-200'
                  : 'border-yellow-700 bg-black/60 text-yellow-300 hover:bg-yellow-900'
              }`}
            >
              ขายของ
            </button>
          </div>
          <div className="bg-black/60 px-5 py-2 text-center pointer-events-none">
            <div className="text-3xl text-neutral-100">วันที่ {hud.day}</div>
            <div className="text-[10px] text-neutral-400">
              {fmt(hud.dayLeft)} · จาก 7 วัน
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <div className="bg-black/60 px-2 py-1.5 text-right text-red-300 pointer-events-auto">
              {oppName}
              {isHost && !hud.p2Alive ? ' (ตายแล้ว)' : ''}
              <br />
              {isHost && !hud.p2Alive ? 'จากไปแล้ว' : `กำลังถือ ${hud.p2Total}`}
            </div>
            <button
              onClick={() => openPanel(shopState, setShopState, sellState, setSellState)}
              className={`pointer-events-auto border-2 px-5 py-2.5 text-[11px] ${
                shopState === 'open'
                  ? 'border-blue-400 bg-blue-900/80 text-blue-200'
                  : 'border-blue-700 bg-black/60 text-blue-300 hover:bg-blue-900'
              }`}
            >
              ร้านค้า
            </button>
          </div>
        </div>

        {/* coins — under the day clock */}
        <div className="absolute top-[64px] left-1/2 -translate-x-1/2 bg-black/60 px-4 py-1 text-center pointer-events-none">
          <span className="text-yellow-300 text-sm flex items-center gap-2">
            <Icon k="coin" size={14} /> {hud.coins} เหรียญ
          </span>
        </div>

        {/* both names */}
        <div className="absolute top-28 left-1/2 -translate-x-1/2 bg-black/50 px-3 py-0.5 text-[9px] text-neutral-300 pointer-events-none">
          {hud.name || 'ผู้เล่น 1'} <span className="text-red-400">✕</span>{' '}
          {hud.oppName || 'ผู้เล่น 2'}
        </div>

        {/* toast */}
        {hud.toast && !hud.distressActive && deathReason === null && !ending && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/80 px-3 py-1 text-[10px] text-yellow-300 pointer-events-none">
            {hud.toast}
          </div>
        )}

        {/* inventory tabs */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-2">
          <button
            onClick={() => gameRef.current?.setMode('collect')}
            className={`text-[9px] px-3 py-1.5 border-2 ${
              hud.mode === 'collect'
                ? 'border-green-400 bg-green-900/80 text-green-200'
                : 'border-neutral-700 bg-black/60 text-neutral-400 hover:bg-neutral-900'
            }`}
          >
            🛠 โหมดเก็บของ [F]
          </button>
          <button
            onClick={() => gameRef.current?.setMode('fight')}
            className={`text-[9px] px-3 py-1.5 border-2 ${
              hud.mode === 'fight'
                ? 'border-red-400 bg-red-900/80 text-red-200'
                : 'border-neutral-700 bg-black/60 text-neutral-400 hover:bg-neutral-900'
            }`}
          >
            ⚔ โหมดต่อสู้ [F]
          </button>
        </div>

        {/* inventory slots */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none">
          {ICONS.filter(
            (pair): pair is [Item, string] => pair[0] !== 'coin' && pair[0] !== 'mushroom',
          ).map(([res]) => (
            <div
              key={res}
              className="w-12 h-12 flex flex-col items-center justify-center gap-1 bg-black/75 border-2 border-neutral-600"
              title={THAI[res]}
            >
              <Icon k={res} size={16} />
              <span className="text-[9px] leading-none text-neutral-200">{hud.p1[res]}</span>
            </div>
          ))}
        </div>

        {/* controls hint */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center p-1 text-[8px] text-neutral-400 bg-black/50 pointer-events-none">
          WASD เดิน · F สลับโหมด · E เก็บ (โหมดเก็บของ) · X / คลิก โจมตี (โหมดต่อสู้) · G ให้ของ · Q ขโมย · 1-4 กิน · H ช่วย
        </div>

        {/* sell panel — dead center, 0.5s open/close */}
        {sellState !== 'closed' && !anyOverlay && (
          <div
            className={`absolute w-80 bg-black/90 border-2 border-yellow-700 p-4 text-[10px] z-40 ${
              sellState === 'open' ? 'panel-in' : 'panel-out'
            }`}
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            {fx?.panel === 'sell' && (
              <div key={fx.n} className="absolute inset-0 pointer-events-none trade-fx" />
            )}
            <p className="text-yellow-300 mb-2 text-center">ร้านขายของ</p>
            <div className="flex flex-col gap-1.5">
              {SELLABLE.map((it) => (
                <button
                  key={it}
                  onClick={() => {
                    if (isGuest)
                      partyRef.current?.send({ kind: 'act', act: { act: 'sell', arg: it } })
                    else gameRef.current?.sell(it)
                    tradeFx('sell')
                  }}
                  disabled={hud.p1[it] <= 0}
                  title={THAI[it]}
                  className="flex items-center justify-center gap-3 border border-neutral-700 px-3 py-1.5 hover:bg-yellow-900 disabled:opacity-30"
                >
                  <Icon k={it} size={18} />
                  <span className="text-[10px] text-neutral-300">x{hud.p1[it]}</span>
                  <span className="text-neutral-500">→</span>
                  <Icon k="coin" size={14} />
                  <span className="text-[10px] text-yellow-300">{SELL_PRICE[it] ?? 0}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* shop panel — dead center, 0.5s open/close */}
        {shopState !== 'closed' && !anyOverlay && (
          <div
            className={`absolute w-80 bg-black/90 border-2 border-blue-700 p-4 text-[10px] z-40 ${
              shopState === 'open' ? 'panel-in' : 'panel-out'
            }`}
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            {fx?.panel === 'shop' && (
              <div key={fx.n} className="absolute inset-0 pointer-events-none trade-fx" />
            )}
            <p className="text-blue-300 mb-2 flex items-center justify-center gap-2">
              <Icon k="coin" size={14} /> {hud.coins}
            </p>
            <div className="flex flex-col gap-1.5">
              {hud.weaponTier < WEAPONS.length - 1 ? (
                <button
                  onClick={() => {
                    if (isGuest)
                      partyRef.current?.send({ kind: 'act', act: { act: 'buy', arg: 'weapon' } })
                    else gameRef.current?.buy('weapon')
                    tradeFx('shop')
                  }}
                  className="flex items-center justify-center gap-3 border border-neutral-700 px-3 py-1.5 hover:bg-blue-900"
                >
                  <span className="text-[14px] leading-none">{WEAPONS[hud.weaponTier].icon}</span>
                  <span className="text-neutral-500">→</span>
                  <span className="text-[14px] leading-none">
                    {WEAPONS[hud.weaponTier + 1].icon}
                  </span>
                  <span className="text-[10px] text-neutral-300">
                    {THAI_WEAPON[hud.weaponTier + 1]} · {WEAPONS[hud.weaponTier + 1].dmg} ดาเมจ
                  </span>
                  <span className="text-neutral-500">←</span>
                  <Icon k="coin" size={14} />
                  <span className="text-[10px] text-yellow-300">
                    {WEAPON_PRICE[hud.weaponTier + 1]}
                  </span>
                </button>
              ) : (
                <div className="flex items-center justify-center gap-3 border border-neutral-800 px-3 py-1.5 opacity-50">
                  <span className="text-[14px] leading-none">⚔️</span>
                  <span className="text-[10px] text-neutral-400">ดาบ · สูงสุดแล้ว</span>
                </div>
              )}
              <button
                onClick={() => {
                  if (isGuest)
                    partyRef.current?.send({ kind: 'act', act: { act: 'buy', arg: 'hp' } })
                  else gameRef.current?.buy('hp')
                  tradeFx('shop')
                }}
                className="flex items-center justify-center gap-3 border border-neutral-700 px-3 py-1.5 hover:bg-blue-900"
              >
                <span className="text-[14px] leading-none">❤️</span>
                <span className="text-[10px] text-neutral-300">HP สูงสุด +1</span>
                <span className="text-neutral-500">←</span>
                <Icon k="coin" size={14} />
                <span className="text-[10px] text-yellow-300">{HP_UP_PRICE}</span>
              </button>
              <button
                onClick={() => {
                  if (isGuest)
                    partyRef.current?.send({ kind: 'act', act: { act: 'buy', arg: 'hunger' } })
                  else gameRef.current?.buy('hunger')
                  tradeFx('shop')
                }}
                className="flex items-center justify-center gap-3 border border-neutral-700 px-3 py-1.5 hover:bg-blue-900"
              >
                <span className="text-[14px] leading-none">🍗</span>
                <span className="text-[10px] text-neutral-300">หิวสูงสุด +1</span>
                <span className="text-neutral-500">←</span>
                <Icon k="coin" size={14} />
                <span className="text-[10px] text-yellow-300">{HUNGER_UP_PRICE}</span>
              </button>
              {(Object.keys(FOOD_HUNGER) as Food[]).map((f) => (
                <button
                  key={f}
                  onClick={() => {
                    if (isGuest)
                      partyRef.current?.send({ kind: 'act', act: { act: 'buy', arg: f } })
                    else gameRef.current?.buy(f)
                    tradeFx('shop')
                  }}
                  title={THAI[f]}
                  className="flex items-center justify-center gap-3 border border-neutral-700 px-3 py-1.5 hover:bg-blue-900"
                >
                  <Icon k={f} size={18} />
                  <span className="text-[10px] text-neutral-300">+{FOOD_HUNGER[f]} 🍗</span>
                  <span className="text-neutral-500">←</span>
                  <Icon k="coin" size={14} />
                  <span className="text-[10px] text-yellow-300">{FOOD_PRICE[f]}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* click-anywhere backdrop while a panel is animating/open */}
        {(sellState !== 'closed' || shopState !== 'closed') && !anyOverlay && (
          <div
            className="absolute inset-0 z-30"
            onClick={() => {
              if (sellState === 'open') closePanel(setSellState)
              if (shopState === 'open') closePanel(setShopState)
            }}
          />
        )}

        {/* distress prompt — host decides */}
        {hud.distressActive && deathReason === null && !isGuest && (
          <div className="absolute inset-0 flex items-end justify-center pb-16 bg-black/40 z-30">
            <div className="bg-black/90 border-2 border-red-800 p-4 text-center">
              <p className="text-[10px] text-red-300 mb-3">
                {oppName} ล้มลง เค้าหิวมาก
                <br />
                เค้าต้องการอาหาร 1 ชิ้น
              </p>
              <div className="flex gap-3 justify-center text-[9px]">
                <button
                  onClick={() => gameRef.current?.helpDistress()}
                  className="border-2 border-neutral-500 px-3 py-2 hover:bg-green-900 hover:border-green-400"
                >
                  ให้อาหาร [H]
                </button>
                <button
                  onClick={() => gameRef.current?.ignoreDistress()}
                  className="border-2 border-neutral-800 px-3 py-2 text-neutral-500 hover:bg-neutral-900"
                >
                  เมินไป
                </button>
              </div>
            </div>
          </div>
        )}

        {/* P2 died — killer's guilt sequence on the killer's screen */}
        {deathReason !== null && !ending && isHost && deathReason === 'attacked' && (
          <KillGuiltSequence
            victimName={oppName}
            onContinue={resumeAfterDeath}
          />
        )}

        {/* P2 died — survivor notice on host (mosquito/starve), reveal for neglect */}
        {deathReason !== null && !ending && isHost && deathReason !== 'attacked' && deathReason !== 'neglect' && (
          <CreditsOverlay
            lines={noticeLines(oppName)}
            onContinue={resumeAfterDeath}
            continueText="อยู่ให้รอด &gt;"
          />
        )}
        {deathReason !== null && !ending && isHost && deathReason === 'neglect' && (
          <DeathSequence p2Name={oppName} onContinue={resumeAfterDeath} />
        )}

        {/* P2 died — the victim sees their own credits, then exit */}
        {deathReason !== null && !ending && isGuest && (
          <CreditsOverlay
            lines={victimLines(reasonToCause(deathReason), deathDay)}
            onExit={onExit}
          />
        )}

        {/* note after death reveal, while game continues */}
        {deathDone && !ending && (
          <div className="absolute top-18 left-1/2 -translate-x-1/2 text-[9px] text-neutral-400 bg-black/70 px-2 py-1 pointer-events-none">
            นาฬิกายังเดินอยู่
          </div>
        )}

        {/* P1 died — victim credits on host, survivor notice on guest */}
        {p1Died && !ending && isHost && (
          <CreditsOverlay
            lines={victimLines(reasonToCause(p1DeathReason ?? 'mosquito'), deathDay)}
            onExit={onExit}
          />
        )}
        {p1Died && !ending && isGuest && (
          <CreditsOverlay
            lines={noticeLines(oppName)}
            onContinue={() => setP1Died(false)}
            continueText="เล่นต่อไป จนกว่าเกมจะจบ &gt;"
          />
        )}

        {/* touch controls — only on touch devices */}
        {isTouch && !anyOverlay && (
          <>
            {/* d-pad, bottom left */}
            <div className="absolute bottom-4 left-4 z-20 grid grid-cols-3 grid-rows-3 gap-1 touch-none">
              <span />
              <button className={touchBtn} {...hold('w')}>▲</button>
              <span />
              <button className={touchBtn} {...hold('a')}>◀</button>
              <span />
              <button className={touchBtn} {...hold('d')}>▶</button>
              <span />
              <button className={touchBtn} {...hold('s')}>▼</button>
              <span />
            </div>
            {/* actions, bottom right */}
            <div className="absolute bottom-4 right-4 z-20 grid grid-cols-3 gap-1 touch-none">
              <button className={touchBtn} {...hold('e')}>เก็บ</button>
              <button className={touchBtn} {...hold('x')}>ตี</button>
              <button className={touchBtn} {...tap('q')}>ขโมย</button>
              <button className={touchBtn} {...tap('g')}>ให้</button>
              <button className={touchBtn} {...tap('f')}>สลับ</button>
              <button className={touchBtn} {...tap('h')}>ช่วย</button>
            </div>
          </>
        )}

        {/* settings gear */}
        <button
          onClick={() => setShowDev((s) => !s)}
          className="absolute bottom-2 right-2 z-30 text-lg opacity-50 hover:opacity-100"
          title="ตั้งค่า"
        >
          ⚙
        </button>

        {/* dev panel */}
        {showDev && !isGuest && (
          <div className="absolute bottom-10 right-2 z-40 bg-black/95 border-2 border-neutral-600 p-3 text-[10px] w-64">
            <label className="flex items-center justify-between mb-3 cursor-pointer">
              <span className="text-neutral-300">โหมดนักพัฒนา</span>
              <input
                type="checkbox"
                checked={devMode}
                onChange={(e) => setDevMode(e.target.checked)}
                className="w-4 h-4 accent-green-500"
              />
            </label>
            {devMode && (
              <div className="flex flex-col gap-1.5">
                <button
                  onClick={() => gameRef.current?.devSkipToLastDay()}
                  className="border border-neutral-700 px-2 py-1.5 hover:bg-neutral-800 text-left"
                >
                  ข้ามไปวันที่ 7
                </button>
                <button
                  onClick={() => gameRef.current?.devKillP2('mosquito')}
                  disabled={!hud.p2Alive}
                  className="border border-neutral-700 px-2 py-1.5 hover:bg-neutral-800 text-left disabled:opacity-30"
                >
                  จำลอง: ผู้เล่น 2 ตายเพราะยุง
                </button>
                <button
                  onClick={() => gameRef.current?.devKillP2('player')}
                  disabled={!hud.p2Alive}
                  className="border border-neutral-700 px-2 py-1.5 hover:bg-neutral-800 text-left disabled:opacity-30"
                >
                  จำลอง: ผู้เล่น 1 ฆ่าผู้เล่น 2
                </button>
                <button
                  onClick={() => gameRef.current?.devKillP1('mosquito')}
                  className="border border-neutral-700 px-2 py-1.5 hover:bg-neutral-800 text-left"
                >
                  จำลอง: ผู้เล่น 1 ตายเพราะยุง
                </button>
                <button
                  onClick={() => gameRef.current?.devKillP1('player')}
                  className="border border-neutral-700 px-2 py-1.5 hover:bg-neutral-800 text-left"
                >
                  จำลอง: ผู้เล่น 2 ฆ่าผู้เล่น 1
                </button>
                <label className="mt-2 text-neutral-500 flex flex-col gap-1">
                  TURN server (JSON) — แก้เครือข่ายผ่าน NAT
                  <input
                    id="turn-config"
                    placeholder='[{"urls":"turn:host:3478","username":"u","credential":"p"}]'
                    className="text-[8px] bg-black/60 border border-neutral-700 px-2 py-1 text-neutral-300 outline-none"
                  />
                  <button
                    onClick={() => {
                      const v = (document.getElementById('turn-config') as HTMLInputElement)
                        ?.value
                      if (!v) return
                      try {
                        localStorage.setItem('stranger-turn', v)
                        location.reload()
                      } catch {
                        /* bad json */
                      }
                    }}
                    className="border border-neutral-700 px-2 py-1 hover:bg-neutral-800 text-left"
                  >
                    บันทึก TURN + รีสตาร์ท
                  </button>
                </label>
              </div>
            )}
          </div>
        )}

        {/* ending credits */}
        {ending && <CreditsOverlay lines={ending} onExit={onExit} />}
      </div>
    </div>
  )
}

const reasonToCause = (r: DeathReason): DeathCause =>
  r === 'attacked' || r === 'killed' ? 'player' : (r as DeathCause)




