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
import EndingOverlay from './EndingOverlay'
import type { Inventory } from '../game/engine'
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

type Ending = {
  kind: 'win' | 'lose'
  p1: Inventory
  p2: Inventory
  helped: boolean
  p2Dead: boolean
  p1Dead: boolean
  p1Name: string
  p2Name: string
  role: 'host' | 'guest'
}

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

type DeathReason = 'neglect' | 'attacked' | 'mosquito' | 'starved' | 'killed'

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
  const hudRef = useRef(hud0)
  const role = party?.role ?? 'host'
  const isGuest = role === 'guest'
  const isHost = role === 'host'
  const myName = party?.myName ?? 'ผู้เล่น 1'

  const [hud, setHud] = useState<HudState>(hud0)
  hudRef.current = hud
  const [deathReason, setDeathReason] = useState<DeathReason | null>(null)
  const [deathDone, setDeathDone] = useState(false)
  const [p1DeathReason, setP1DeathReason] = useState<DeathReason | null>(null)
  const [p1Died, setP1Died] = useState(false)
  const [showDev, setShowDev] = useState(false)
  const [devMode, setDevMode] = useState(false)
  const [ending, setEnding] = useState<Ending | null>(null)
  let cleanupPump: ReturnType<typeof setInterval> | null = null

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const g = new Game(
      canvas,
      {
        onHud: setHud,
        onDistress: () => setHud((h) => ({ ...h, distressActive: true })),
        onDistressEnd: () => setHud((h) => ({ ...h, distressActive: false })),
        onDeath: (reason) => setDeathReason(reason),
        onP1Death: (reason) => {
          setP1DeathReason(reason)
          setP1Died(true)
        },
        onTimeUp: () => {
          const g2 = gameRef.current
          if (!g2) return
          let e: Ending
          if (isGuest) {
            // guest: world is the host's snapshot
            const s = g2.getSnap()
            e = {
              kind: s.winnerP1 ? 'win' : 'lose',
              p1: s.p1Inv,
              p2: s.p2Inv,
              helped: s.helped,
              p2Dead: !s.p2Alive,
              p1Dead: !s.p1Alive,
              p1Name: s.p1Name,
              p2Name: s.p2Name,
              role: 'guest',
            }
          } else {
            const stats = g2.getStats()
            e = {
              kind: g2.p1Won() ? 'win' : 'lose',
              p1: stats.p1,
              p2: stats.p2,
              helped: g2.wasHelped(),
              p2Dead: !hudRef.current.p2Alive,
              p1Dead: false,
              p1Name: g2.p1Name,
              p2Name: g2.p2Name,
              role: 'host',
            }
          }
          setEnding(e)
        },
      },
      { multi: isHost, guest: isGuest, myName },
    )
    gameRef.current = g

    // multiplayer wiring
    if (party) {
      const p = new Party(party.pin, party.role)
      partyRef.current = p
      p.onMsg = (m: PartyMsg) => {
        if (isHost && m.kind === 'input') g.setRemoteInput(m.input)
        if (isHost && m.kind === 'act') g.guestAct(m.act)
        if (isHost && m.kind === 'hello') g.setP2Name(m.name ?? 'ผู้เล่น 2')
        if (isGuest && m.kind === 'snap') g.applySnap(m.snap)
      }
      if (isGuest) {
        // tell the host who we are (again, once the game channel is alive)
        setTimeout(() => p.send({ kind: 'hello', name: myName }), 300)
      }
      if (isHost) {
        const pump = setInterval(
          () => partyRef.current?.send({ kind: 'snap', snap: g.getSnap() }),
          66,
        )
        cleanupPump = pump
      } else {
        const pump = setInterval(
          () => partyRef.current?.send({ kind: 'input', input: g.readInput() }),
          50,
        )
        cleanupPump = pump
      }
    }

    return () => {
      g.destroy()
      gameRef.current = null
      partyRef.current?.destroy()
      partyRef.current = null
      if (cleanupPump) clearInterval(cleanupPump)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const tradeFx = (panel: 'sell' | 'shop') => setFx({ panel, n: Date.now() })
  const [sellState, setSellState] = useState<'closed' | 'open' | 'closing'>('closed')
  const [shopState, setShopState] = useState<'closed' | 'open' | 'closing'>('closed')
  const [fx, setFx] = useState<{ panel: 'sell' | 'shop'; n: number } | null>(null)

  const closePanel = (set: (v: 'closed' | 'open' | 'closing') => void) => {
    set('closing')
    setTimeout(() => set('closed'), 500)
  }
  const openPanel = (
    cur: 'closed' | 'open' | 'closing',
    set: (v: 'closed' | 'open' | 'closing') => void,
    otherCur: 'closed' | 'open' | 'closing',
    setOther: (v: 'closed' | 'open' | 'closing') => void,
  ) => {
    if (cur === 'open') {
      closePanel(set)
      return
    }
    if (otherCur === 'open') closePanel(setOther)
    set('open')
  }

  const selfName = isGuest ? `คุณ (${myName})` : `คุณ (${hud.name || myName})`
  const oppName = isGuest ? hud.oppName || 'ผู้เล่น 1' : hud.oppName || 'ผู้เล่น 2'
  const anyOverlay = deathReason !== null || p1Died || ending !== null

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

        {/* toast */}
        {hud.toast && !hud.distressActive && deathReason === null && !ending && (
          <div className="absolute top-24 left-1/2 -translate-x-1/2 bg-black/80 px-3 py-1 text-[10px] text-yellow-300 pointer-events-none">
            {hud.toast}
          </div>
        )}

        {/* inventory tabs — collector / fighter */}
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

        {/* inventory slots — perfectly square tiles */}
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
                    if (isGuest) partyRef.current?.send({ kind: 'act', act: { act: 'sell', arg: it } })
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
                    if (isGuest) partyRef.current?.send({ kind: 'act', act: { act: 'buy', arg: 'weapon' } })
                    else gameRef.current?.buy('weapon')
                    tradeFx('shop')
                  }}
                  className="flex items-center justify-center gap-3 border border-neutral-700 px-3 py-1.5 hover:bg-blue-900"
                >
                  <span className="text-[14px] leading-none">{WEAPONS[hud.weaponTier].icon}</span>
                  <span className="text-neutral-500">→</span>
                  <span className="text-[14px] leading-none">{WEAPONS[hud.weaponTier + 1].icon}</span>
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
                  if (isGuest) partyRef.current?.send({ kind: 'act', act: { act: 'buy', arg: 'hp' } })
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
                  if (isGuest) partyRef.current?.send({ kind: 'act', act: { act: 'buy', arg: 'hunger' } })
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
                    if (isGuest) partyRef.current?.send({ kind: 'act', act: { act: 'buy', arg: f } })
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

        {/* distress prompt — host (PLAYER 1) decides */}
        {hud.distressActive && deathReason === null && !isGuest && (
          <div className="absolute inset-0 flex items-end justify-center pb-16 bg-black/40 z-30">
            <div className="bg-black/90 border-2 border-red-800 p-4 text-center">
              <p className="text-[10px] text-red-300 mb-3">
                {hud.oppName || 'ผู้เล่น 2'} ล้มลง เค้าหิวมาก
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

        {/* P2 died — killed by P1: host gets the guilt credits */}
        {deathReason === 'attacked' && isHost && (
          <GuiltOverlay
            onContinue={() => {
              setDeathReason(null)
              setDeathDone(true)
              gameRef.current?.resumeAfterDeath()
            }}
          />
        )}

        {/* P2 died — killed by P1: guest sees their own end */}
        {deathReason === 'attacked' && isGuest && (
          <P2KilledScreen p1Name={hud.oppName || 'ผู้เล่น 1'} onExit={onExit} />
        )}

        {/* P2 died by neglect/mosquito/starve: full reveal sequence for host */}
        {deathReason !== null && deathReason !== 'attacked' && isHost && (
          <DeathSequence
            p2Name={hud.oppName || 'ผู้เล่น 2'}
            onContinue={() => {
              setDeathReason(null)
              setDeathDone(true)
              gameRef.current?.resumeAfterDeath()
            }}
          />
        )}

        {/* same for the dead guest — they watch their own story */}
        {deathReason !== null && deathReason !== 'attacked' && isGuest && (
          <DeathSequence
            p2Name={myName}
            onContinue={() => {
              setDeathReason(null)
              setDeathDone(true)
              gameRef.current?.resumeAfterDeath()
            }}
          />
        )}

        {/* note after death reveal, while game continues */}
        {deathDone && !ending && (
          <div className="absolute top-[72px] left-1/2 -translate-x-1/2 text-[9px] text-neutral-400 bg-black/70 px-2 py-1 pointer-events-none">
            นาฬิกายังเดินอยู่
          </div>
        )}

        {/* P1 died — host sees their own ending, exit only */}
        {p1Died && isHost && !ending && (
          <P1DeathHostScreen reason={p1DeathReason} p2Name={hud.oppName || 'ผู้เล่น 2'} onExit={onExit} />
        )}

        {/* P1 died — guest keeps playing */}
        {p1Died && isGuest && !ending && (
          <P1DeathGuestScreen
            p1Name={hud.oppName || 'ผู้เล่น 1'}
            onContinue={() => setP1Died(false)}
          />
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
              </div>
            )}
          </div>
        )}

        {/* ending credits */}
        {ending && <EndingOverlay ending={ending} onExit={onExit} />}
      </div>
    </div>
  )
}

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
    strawberry: 0, blueberry: 0, wood: 0, stone: 0,
    mushroom: 0, steak: 0, pork: 0, beef: 0, cake: 0,
  },
  p2Total: 0,
  p2Alive: true,
  distressActive: false,
  toast: '',
  name: '',
  oppName: '',
}

function GuiltOverlay({ onContinue }: { onContinue: () => void }) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (step >= 3) return
    const t = setTimeout(() => setStep((s) => s + 1), step === 2 ? 3200 : 2600)
    return () => clearTimeout(t)
  }, [step])
  const lines = [
    'คุณฆ่าเค้าทำไม',
    'เค้าทำอะไรผิด',
    'คุณไม่มีความเป็นมนุษย์แล้วหรอ',
  ]
  const done = step >= 3
  return (
    <div
      className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center text-center px-6 gap-6 cursor-pointer"
      onClick={() => !done && setStep((s) => s + 1)}
    >
      {lines.slice(0, Math.min(step + 1, 3)).map((l, i) => (
        <p key={i} className="text-lg text-red-400 fadein leading-10">
          {l}
        </p>
      ))}
      {done && (
        <div className="fadein">
          <p className="text-[11px] text-neutral-300 leading-7 mb-10">
            เล่นต่อไป จนกว่าเกมจะจบ
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

function P2KilledScreen({ p1Name, onExit }: { p1Name: string; onExit: () => void }) {
  return (
    <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center text-center px-6">
      <p className="text-lg text-red-500 slowfadein">คุณถูก {p1Name} ฆ่า</p>
      <p className="text-[11px] text-neutral-400 leading-8 mt-8 slowfadein">
        เค้าไม่เห็นใจคุณเลย
        <br />
        ไม่เป็นไร
      </p>
      <button
        onClick={onExit}
        className="mt-12 text-[9px] border-2 border-neutral-600 px-4 py-2 text-neutral-300 hover:bg-neutral-800"
      >
        ออกไปที่เมนูหลัก
      </button>
    </div>
  )
}

function P1DeathHostScreen({
  reason,
  p2Name,
  onExit,
}: {
  reason: DeathReason | null
  p2Name: string
  onExit: () => void
}) {
  const first =
    reason === 'mosquito'
      ? 'คุณถูกฆ่าโดยยุง'
      : reason === 'starved'
        ? 'คุณหิวจนตาย'
        : `คุณถูก ${p2Name} ฆ่า`
  return (
    <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center text-center px-6">
      <p className="text-lg text-red-500 slowfadein">{first}</p>
      <p className="text-[11px] text-neutral-400 leading-8 mt-8 slowfadein max-w-md">
        บางที {p2Name} อาจจะช่วยคุณได้ก็ได้นะ
        <br />
        แต่ทำไมเค้าถึงไม่ช่วยหล่ะ
        <br />
        เค้าเห็นใจคุณรึเปล่า?
      </p>
      <button
        onClick={onExit}
        className="mt-12 text-[9px] border-2 border-neutral-600 px-4 py-2 text-neutral-300 hover:bg-neutral-800"
      >
        ออกไปที่เมนูหลัก
      </button>
    </div>
  )
}

function P1DeathGuestScreen({
  p1Name,
  onContinue,
}: {
  p1Name: string
  onContinue: () => void
}) {
  return (
    <div className="absolute inset-0 z-40 bg-black/95 flex flex-col items-center justify-center text-center px-6">
      <p className="text-lg text-red-400 slowfadein">{p1Name} ตายแล้ว</p>
      <p className="text-[11px] text-neutral-400 leading-8 mt-8 slowfadein max-w-md">
        ทำไมคุณถึงไม่ช่วยเค้าหล่ะ
        <br />
        คุณอาจจะพยายามช่วยแล้วก็ได้
        <br />
        รึถ้าหากไม่ คุณก็ต้องเห็นใจเค้าบ้าง
      </p>
      <button
        onClick={onContinue}
        className="mt-12 text-[9px] border-2 border-neutral-600 px-4 py-2 text-neutral-300 hover:bg-neutral-800"
      >
        เล่นต่อไป จนกว่าเกมจะจบ &gt;
      </button>
    </div>
  )
}
