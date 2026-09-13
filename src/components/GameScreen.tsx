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

type Ending =
  | { kind: 'win'; p1: Inventory; p2: Inventory; helped: boolean; p2Dead: boolean }
  | { kind: 'lose'; p1: Inventory; p2: Inventory; helped: boolean }

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

export default function GameScreen({
  party,
  onExit,
}: {
  party: PartySession | null
  onExit: () => void
}) {
  const role = party?.role ?? 'solo'
  const isGuest = role === 'guest'
  const isHost = role === 'host'
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<Game | null>(null)
  const [hud, setHud] = useState<HudState>({
    timeLeft: GAME_DURATION,
    day: 1,
    dayLeft: 90,
    coins: 0,
    hp: 5,
    maxHp: 5,
    hunger: 5,
    maxHunger: 5,
    weaponTier: 0,
    mode: 'collect' as 'collect' | 'fight',
    p1: {
      strawberry: 0, blueberry: 0, wood: 0, stone: 0,
      mushroom: 0, steak: 0, pork: 0, beef: 0, cake: 0,
    },
    p2Total: 0,
    p2Alive: true,
    distressActive: false,
    toast: '',
  })
  type PanelState = 'closed' | 'open' | 'closing'
  const [sellState, setSellState] = useState<PanelState>('closed')
  const [shopState, setShopState] = useState<PanelState>('closed')
  const [fx, setFx] = useState<{ panel: 'sell' | 'shop'; n: number } | null>(null)

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
  const tradeFx = (panel: 'sell' | 'shop') => setFx({ panel, n: Date.now() })
  const [showDeath, setShowDeath] = useState(false)
  const [deathDone, setDeathDone] = useState(false)
  const [p1Died, setP1Died] = useState(false)
  const [showDev, setShowDev] = useState(false)
  const [devMode, setDevMode] = useState(false)
  const [ending, setEnding] = useState<Ending | null>(null)
  const partyRef = useRef<Party | null>(null)
  const hudRef = useRef(hud)
  hudRef.current = hud
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
        onDeath: () => setShowDeath(true),
        onP1Death: () => setP1Died(true),
        onTimeUp: () => {
          const g2 = gameRef.current
          if (!g2) return
          if (isGuest) {
            // guest: world is the host's snapshot
            const s = g2.getSnap()
            setEnding({
              kind: s.winnerP1 ? 'win' : 'lose',
              p1: s.p1Inv,
              p2: s.p2Inv,
              helped: s.helped,
              p2Dead: !s.p2Alive,
            })
            return
          }
          const stats = g2.getStats()
          if (g2.p1Won()) {
            setEnding({
              kind: 'win',
              p1: stats.p1,
              p2: stats.p2,
              helped: g2.wasHelped(),
              p2Dead: !hudRef.current.p2Alive,
            })
          } else {
            setEnding({ kind: 'lose', p1: stats.p1, p2: stats.p2, helped: g2.wasHelped() })
          }
        },
      },
      {
        multi: isHost,
        guest: isGuest,
        onAct: (a) => partyRef.current?.send({ kind: 'act', act: a }),
      },
    )
    gameRef.current = g

    // multiplayer wiring
    if (party) {
      const p = new Party(party.pin, party.role)
      partyRef.current = p
      p.onMsg = (m: PartyMsg) => {
        if (isHost && m.kind === 'input') g.setRemoteInput(m.input)
        if (isHost && m.kind === 'act') g.guestAct(m.act)
        if (isGuest && m.kind === 'snap') g.applySnap(m.snap)
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

  const p2WinName = ending?.kind === 'lose' || (ending?.kind === 'win' && !ending.p2Dead)
  void p2WinName

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
                {isGuest ? 'YOU (PLAYER 2)' : 'YOU (PLAYER 1)'} ·{' '}
                <span className="text-amber-400">{WEAPONS[hud.weaponTier].name}</span>
              </div>
              <div className="text-neutral-300">
                HP {pips(hud.hp, hud.maxHp, '❤️')}
              </div>
              <div className="text-neutral-300">
                HUNGER {pips(hud.hunger, hud.maxHunger, '🍗')}
              </div>
            </div>
            <button
              onClick={() => openPanel(sellState, setSellState, shopState, setShopState)}
              className={`pointer-events-auto border-2 px-5 py-2.5 text-[11px] ${
                sellState === 'open'
                  ? 'border-yellow-400 bg-yellow-900/80 text-yellow-200'
                  : 'border-yellow-700 bg-black/60 text-yellow-300 hover:bg-yellow-900'
              }`}
            >
              SELL
            </button>
          </div>
          <div className="flex flex-col gap-1 items-end">
            <div className="bg-black/60 px-2 py-1.5 text-right text-red-300 pointer-events-auto">
              {isGuest ? 'PLAYER 1' : hud.p2Alive ? 'PLAYER 2' : 'PLAYER 2 ✝'}
              <br />
              {isGuest || hud.p2Alive ? `CARRIES ${hud.p2Total}` : 'GONE'}
            </div>
            <button
              onClick={() => openPanel(shopState, setShopState, sellState, setSellState)}
              className={`pointer-events-auto border-2 px-5 py-2.5 text-[11px] ${
                shopState === 'open'
                  ? 'border-blue-400 bg-blue-900/80 text-blue-200'
                  : 'border-blue-700 bg-black/60 text-blue-300 hover:bg-blue-900'
              }`}
            >
              SHOP
            </button>
          </div>
        </div>

        {/* toast */}
        {hud.toast && !hud.distressActive && !showDeath && !ending && (
          <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-black/80 px-3 py-1 text-[9px] text-yellow-300 pointer-events-none">
            {hud.toast}
          </div>
        )}

        {/* day clock + coins — absolute top middle */}
        <div className="absolute top-1 left-1/2 -translate-x-1/2 flex gap-2 pointer-events-none">
          <div className="bg-black/60 px-5 py-2 text-center">
            <div className="text-3xl text-neutral-100">DAY {hud.day}</div>
            <div className="text-[10px] text-neutral-400">{fmt(hud.dayLeft)} LEFT · OF 7</div>
          </div>
          <div className="bg-black/60 px-5 py-2 text-center">
            <div className="text-3xl text-yellow-300 flex items-center justify-center gap-2">
              <Icon k="coin" size={22} />
              {hud.coins}
            </div>
            <div className="text-[10px] text-neutral-400">COINS</div>
          </div>
        </div>

        {/* click-anywhere backdrop while a panel is animating/open */}
        {(sellState !== 'closed' || shopState !== 'closed') && !showDeath && !ending && (
          <div
            className="absolute inset-0 z-30"
            onClick={() => {
              if (sellState === 'open') closePanel(setSellState)
              if (shopState === 'open') closePanel(setShopState)
            }}
          />
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
            🛠 COLLECTOR [F]
          </button>
          <button
            onClick={() => gameRef.current?.setMode('fight')}
            className={`text-[9px] px-3 py-1.5 border-2 ${
              hud.mode === 'fight'
                ? 'border-red-400 bg-red-900/80 text-red-200'
                : 'border-neutral-700 bg-black/60 text-neutral-400 hover:bg-neutral-900'
            }`}
          >
            ⚔ FIGHTER [F]
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
              title={res}
            >
              <Icon k={res} size={16} />
              <span className="text-[9px] leading-none text-neutral-200">{hud.p1[res]}</span>
            </div>
          ))}
        </div>

        {/* controls hint */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-center p-1 text-[7px] text-neutral-400 bg-black/50 pointer-events-none">
          WASD MOVE · F SWITCH MODE · E GATHER (COLLECTOR) · X / CLICK ATTACK (FIGHTER) · G GIVE · Q STEAL · 1-4 EAT · H HELP
        </div>

        {/* sell panel — exact middle-middle, 0.5s open/close */}
        {sellState !== 'closed' && !showDeath && !ending && (
          <div
            className={`absolute w-80 bg-black/90 border-2 border-yellow-700 p-4 text-[9px] z-40 ${
              sellState === 'open' ? 'panel-in' : 'panel-out'
            }`}
            style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}
          >
            {fx?.panel === 'sell' && (
              <div key={fx.n} className="absolute inset-0 pointer-events-none trade-fx" />
            )}
            <p className="text-yellow-300 mb-2">SELL BOOTH</p>
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
                  title={it}
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

        {/* shop panel — exact middle-middle, 0.5s open/close */}
        {shopState !== 'closed' && !showDeath && !ending && (
          <div
            className={`absolute w-80 bg-black/90 border-2 border-blue-700 p-4 text-[9px] z-40 ${
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
                    {WEAPONS[hud.weaponTier + 1].name} · {WEAPONS[hud.weaponTier + 1].dmg} DMG
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
                  <span className="text-[10px] text-neutral-400">SWORD · MAXED</span>
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
                <span className="text-[10px] text-neutral-300">+1 MAX</span>
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
                <span className="text-[10px] text-neutral-300">+1 MAX</span>
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
                  title={f}
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

        {/* distress prompt — host (PLAYER 1) decides */}
        {hud.distressActive && !showDeath && !isGuest && (
          <div className="absolute inset-0 flex items-end justify-center pb-16 bg-black/40">
            <div className="bg-black/90 border-2 border-red-800 p-4 text-center">
              <p className="text-[9px] text-red-300 mb-3">
                PLAYER 2 COLLAPSED. THEY'RE STARVING.
                <br />
                THEY NEED 1 FOOD.
              </p>
              <div className="flex gap-3 justify-center text-[9px]">
                <button
                  onClick={() => gameRef.current?.helpDistress()}
                  className="border-2 border-neutral-500 px-3 py-2 hover:bg-green-900 hover:border-green-400"
                >
                  GIVE FOOD [H]
                </button>
                <button
                  onClick={() => gameRef.current?.ignoreDistress()}
                  className="border-2 border-neutral-800 px-3 py-2 text-neutral-500 hover:bg-neutral-900"
                >
                  TURN AWAY
                </button>
              </div>
            </div>
          </div>
        )}

        {/* death sequence */}
        {showDeath && (
          <DeathSequence
            onContinue={() => {
              setShowDeath(false)
              setDeathDone(true)
              if (isGuest) partyRef.current?.send({ kind: 'act', act: { act: 'resume' } })
              else gameRef.current?.resumeAfterDeath()
            }}
          />
        )}

        {/* note after death reveal, under the day/coin cluster */}
        {deathDone && !ending && (
          <div className="absolute top-18 left-1/2 -translate-x-1/2 text-[8px] text-neutral-400 bg-black/70 px-2 py-1 pointer-events-none">
            THE TIMER IS STILL RUNNING.
          </div>
        )}

        {/* P1 death credits */}
        {p1Died && !ending && (
          <div className="absolute inset-0 z-40 bg-black flex flex-col items-center justify-center text-center px-6">
            <p className="text-lg text-red-500 tracking-widest slowfadein">
              {isGuest ? 'PLAYER 2 DIED' : 'PLAYER 1 DIED'}
            </p>
            <p className="text-[10px] text-neutral-400 leading-7 mt-8 slowfadein max-w-md">
              WHY DON'T YOU HELP HIM?
            </p>
            <p className="text-[8px] text-neutral-600 mt-4">
              you starved, the mosquitoes got you, or a stranger's fist did.
            </p>
            <button
              onClick={onExit}
              className="mt-12 text-[9px] border-2 border-neutral-600 px-4 py-2 text-neutral-300 hover:bg-neutral-800"
            >
              BACK TO TITLE
            </button>
          </div>
        )}

        {/* settings gear */}
        <button
          onClick={() => setShowDev((s) => !s)}
          className="absolute bottom-2 right-2 z-30 text-lg opacity-50 hover:opacity-100"
          title="settings"
        >
          ⚙
        </button>

        {/* dev panel */}
        {showDev && !isGuest && (
          <div className="absolute bottom-10 right-2 z-40 bg-black/95 border-2 border-neutral-600 p-3 text-[9px] w-64">
            <label className="flex items-center justify-between mb-3 cursor-pointer">
              <span className="text-neutral-300">DEVELOPER MODE</span>
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
                  SKIP TO DAY 7
                </button>
                <button
                  onClick={() => gameRef.current?.devKillP2('mosquito')}
                  disabled={!hud.p2Alive}
                  className="border border-neutral-700 px-2 py-1.5 hover:bg-neutral-800 text-left disabled:opacity-30"
                >
                  SIM: PLAYER 2 DIED — MOSQUITO
                </button>
                <button
                  onClick={() => gameRef.current?.devKillP2('player')}
                  disabled={!hud.p2Alive}
                  className="border border-neutral-700 px-2 py-1.5 hover:bg-neutral-800 text-left disabled:opacity-30"
                >
                  SIM: PLAYER 2 DIED — KILLED BY P1
                </button>
                <button
                  onClick={() => gameRef.current?.devKillP1('mosquito')}
                  className="border border-neutral-700 px-2 py-1.5 hover:bg-neutral-800 text-left"
                >
                  SIM: PLAYER 1 DIED — MOSQUITO
                </button>
                <button
                  onClick={() => gameRef.current?.devKillP1('player')}
                  className="border border-neutral-700 px-2 py-1.5 hover:bg-neutral-800 text-left"
                >
                  SIM: PLAYER 1 DIED — KILLED BY P2
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
