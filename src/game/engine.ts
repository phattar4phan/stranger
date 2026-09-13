// Stranger — pixel game engine (canvas 2D, 320x180 world, 2x render scale)

export type Gatherable = 'strawberry' | 'blueberry' | 'wood' | 'stone' | 'mushroom'
export type Food = 'steak' | 'pork' | 'beef' | 'cake'
export type Item = Gatherable | Food
export type Inventory = Record<Item, number>

export const DAY_LENGTH = 90 // one in-game day = 1m30s
export const TOTAL_DAYS = 7
export const GAME_DURATION = DAY_LENGTH * TOTAL_DAYS // 630s
export const DISTRESS_TIME = 300 // story beat: mid day 4
export const DISTRESS_WINDOW = 20 // seconds player has to respond
// Spec calls for a 10% chance the help event appears; set to 0.1 for that,
// 1.0 guarantees the story beat every run.
export const DISTRESS_CHANCE = 1.0

export const HUNGER_MAX_START = 5
export const HUNGER_TICK = 30 // hunger -1 every 30s
export const HP_MAX_START = 5
export const REGEN_TIME = 12 // +1 hp per 12s while hunger > 0
export const STARVE_TIME = 10 // 0 hunger: -1 hp per 10s, 0 hp = death
export const MOSQUITO_HIT = 5 // during the swarm: -1 hp every 5s
export const SPAWN_EVERY = 4 // seconds between spawn rolls
export const NODE_CAP = 22

// coin exchange rates
export const SELL_PRICE: Partial<Record<Item, number>> = {
  strawberry: 1,
  blueberry: 1,
  wood: 3,
  stone: 5,
  // mushroom: nobody buys poison
}
// spawn weight tracks the coin rate: cheap stuff common, stone rare
const SPAWN_WEIGHT: [Gatherable, number][] = [
  ['strawberry', 26],
  ['blueberry', 26],
  ['wood', 22],
  ['stone', 10],
  ['mushroom', 16],
]
const INIT_SPAWN: [Gatherable, number][] = [
  ['strawberry', 5],
  ['blueberry', 5],
  ['wood', 5],
  ['stone', 4],
  ['mushroom', 4],
]

export const FOOD_HUNGER: Record<Food, number> = { steak: 3, pork: 1, beef: 1, cake: 5 }
export const FOOD_PRICE: Record<Food, number> = { steak: 3, pork: 1, beef: 1, cake: 5 }

// weapon ladder: buying upgrades to the next tier
export const WEAPONS = [
  { name: 'FIST', dmg: 1, icon: '✊' },
  { name: 'BAT', dmg: 2, icon: '🏏' },
  { name: 'AXE', dmg: 3, icon: '🪓' },
  { name: 'SWORD', dmg: 5, icon: '⚔️' },
] as const
export const WEAPON_PRICE: Record<number, number> = { 1: 10, 2: 25, 3: 50 } // cost to reach tier
export const HP_UP_PRICE = 15
export const HUNGER_UP_PRICE = 10

// ---------- multiplayer (same-device, two tabs via BroadcastChannel) ----------

export interface RemoteInput {
  u: boolean
  d: boolean
  l: boolean
  r: boolean
  e: boolean
  q: boolean
  x: boolean
}

export interface Snap {
  p1: { x: number; y: number; facing: number; moving: boolean; walkT: number }
  p2: { x: number; y: number; facing: number; moving: boolean; walkT: number }
  p1Inv: Inventory
  p2Inv: Inventory
  p2Coins: number
  hp2: number
  maxHp2: number
  hunger2: number
  maxHunger2: number
  p2Hp: number
  p2Alive: boolean
  p1Alive: boolean
  p1Name: string
  p2Name: string
  nodes: { x: number; y: number; type: Gatherable; amount: number }[]
  drops: { x: number; y: number; type: Gatherable }[]
  timeLeft: number
  distressActive: boolean
  mosquito: boolean
  p1Gather: number
  p1GatherNode: number // index into nodes, -1 none
  p2Gather: number
  p2GatherNode: number
  attackAnim: number
  p1Attacking: boolean
  phase: 'playing' | 'paused' | 'ended'
  winnerP1: boolean
  helped: boolean
  seq: { death: number; timeup: number; p1death: number }
  toast: string
}

export interface EngineOpts {
  multi?: boolean // host: P2 controlled by remote partner
  guest?: boolean // guest: world is a mirror of host snapshots
  onAct?: (act: GuestAct) => void // guest engine -> host actions
  myName?: string
}

// Thai item names for toasts
export const THAI: Record<Item, string> = {
  strawberry: 'สตรอเบอร์รี่',
  blueberry: 'บลูเบอร์รี่',
  wood: 'ไม้',
  stone: 'หิน',
  mushroom: 'เห็ดพิษ',
  steak: 'สเต็ก',
  pork: 'หมูย่าง',
  beef: 'เนื้อย่าง',
  cake: 'เค้ก',
}
export const THAI_WEAPON = ['กำปั้น', 'ไม้เบสบอล', 'ขวาน', 'ดาบ']

export type GuestAct =
  | { act: 'eat'; arg: Food }
  | { act: 'sell'; arg: Item }
  | { act: 'buy'; arg: 'weapon' | 'hp' | 'hunger' | Food }
  | { act: 'give' }
  | { act: 'resume' }

export interface EngineCallbacks {
  onDistress: () => void
  onDistressEnd: (helped: boolean) => void
  onDeath: (reason: 'neglect' | 'attacked' | 'mosquito' | 'starved') => void
  onP1Death: (reason: 'mosquito' | 'starved' | 'killed') => void
  onTimeUp: () => void
  onHud: (s: HudState) => void
}

export interface HudState {
  timeLeft: number
  day: number
  dayLeft: number
  coins: number
  hp: number
  maxHp: number
  hunger: number
  maxHunger: number
  weaponTier: number
  mode: 'collect' | 'fight'
  p1: Inventory
  p2Total: number
  p2Alive: boolean
  distressActive: boolean
  toast: string
  name: string
  oppName: string
}

interface Node {
  x: number
  y: number
  type: Gatherable
  amount: number
}

interface Person {
  x: number
  y: number
  facing: number // 1 right, -1 left
  walkT: number
  moving: boolean
}

const W = 320
const H = 180
const RES = 2 // render scale: canvas is W*RES x H*RES for crisper output

const emptyInv = (): Inventory => ({
  strawberry: 0,
  blueberry: 0,
  wood: 0,
  stone: 0,
  mushroom: 0,
  steak: 0,
  pork: 0,
  beef: 0,
  cake: 0,
})
const gatherTotal = (i: Inventory) => i.strawberry + i.blueberry + i.wood + i.stone
const anyTotal = (i: Inventory) => Object.values(i).reduce((a, b) => a + b, 0)

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))
const dist = (ax: number, ay: number, bx: number, by: number) =>
  Math.hypot(ax - bx, ay - by)

export class Game {
  private ctx: CanvasRenderingContext2D
  private keys = new Set<string>()
  private raf = 0
  private last = 0
  private elapsed = 0
  private phase: 'playing' | 'paused' | 'ended' = 'playing'

  private p1: Person = { x: 160, y: 90, facing: 1, walkT: 0, moving: false }
  private p2: Person = { x: 240, y: 90, facing: -1, walkT: 0, moving: false }
  private p1Inv = emptyInv()
  private p2Inv = emptyInv()
  private coins = 0
  private hp = HP_MAX_START
  private maxHp = HP_MAX_START
  private hunger = HUNGER_MAX_START
  private maxHunger = HUNGER_MAX_START
  private weaponTier = 0
  private mode: 'collect' | 'fight' = 'collect'
  private multi: boolean
  private guest: boolean
  private remote: RemoteInput = { u: false, d: false, l: false, r: false, e: false, q: false, x: false }
  private p2Coins = 0
  private hp2 = 5
  private maxHp2 = 5
  private hunger2 = 5
  private maxHunger2 = 5
  private hunger2T = 0
  private regen2T = 0
  private starve2T = 0
  private mosqT = 0
  private giveCd = 0
  private seq = { death: 0, timeup: 0, p1death: 0 }
  private guestPhase: 'playing' | 'paused' | 'ended' = 'playing'
  private lastMosquitoDay = 0
  private mosquitoPulse = false
  private onAct?: (a: GuestAct) => void
  p1Name = 'PLAYER 1'
  p2Name = 'PLAYER 2'
  private p1Alive = true
  private p2GatherNode: Node | null = null
  private hungerT = 0
  private regenT = 0
  private starveT = 0
  private spawnT = 0

  private nodes: Node[] = []
  private p2Hp = 5
  private p2Alive = true
  private p2Mode: 'gather' | 'hunt' = 'gather'
  private p2ModeT = 0
  private p2GatherT = 0
  private p2Gather = 0 // remote gather progress 0..1
  private p2StealCd = 0
  private p2HitCd = 0
  private seenSeq = { death: 0, timeup: 0, p1death: 0 }
  private p1Gather = 0
  private p1GatherNode: Node | null = null
  private attackAnim = 0
  private p1StealCd = 0
  private p1HitCd = 0
  private distressPlanned: boolean
  private distressAt = DISTRESS_TIME
  private distressActive = false
  private distressT = 0
  private helpedOnce = false
  private toast = ''
  private toastT = 0
  private timeUpFired = false
  private hudT = 0
  private drops: { x: number; y: number; type: Gatherable }[] = []
  private flash = 0
  private flashColor = '255,0,0'

  private ac: AudioContext | null = null

  constructor(
    private canvasEl: HTMLCanvasElement,
    private cb: EngineCallbacks,
    opts?: EngineOpts,
  ) {
    this.multi = opts?.multi ?? false
    this.guest = opts?.guest ?? false
    this.onAct = opts?.onAct
    if (opts?.myName) {
      if (this.guest) this.p2Name = opts.myName
      else this.p1Name = opts.myName
    }
    canvasEl.width = W * RES
    canvasEl.height = H * RES
    this.ctx = canvasEl.getContext('2d')!
    this.distressPlanned = Math.random() < DISTRESS_CHANCE
    this.spawnInitial()
    window.addEventListener('keydown', this.onKeyDown)
    window.addEventListener('keyup', this.onKeyUp)
    canvasEl.addEventListener('mousedown', this.onMouseDown)
    this.last = performance.now()
    this.raf = requestAnimationFrame(this.frame)
  }

  destroy() {
    cancelAnimationFrame(this.raf)
    window.removeEventListener('keydown', this.onKeyDown)
    window.removeEventListener('keyup', this.onKeyUp)
    this.canvasEl?.removeEventListener('mousedown', this.onMouseDown)
  }

  // ---------- public actions (React buttons) ----------

  sell(item: Item) {
    const price = SELL_PRICE[item] ?? 0
    if (price <= 0) {
      this.say('ไม่มีใครซื้อของพิษ', 2)
      return
    }
    if (this.p1Inv[item] <= 0) return
    this.p1Inv[item]--
    this.coins += price
    this.beep(760, 0.06)
    this.say(`+${price} เหรียญ`, 1.2)
  }

  buy(what: 'weapon' | 'hp' | 'hunger' | Food) {
    let price = 0
    if (what === 'weapon') price = this.weaponTier < WEAPONS.length - 1 ? WEAPON_PRICE[this.weaponTier + 1] : 0
    else if (what === 'hp') price = HP_UP_PRICE
    else if (what === 'hunger') price = HUNGER_UP_PRICE
    else price = FOOD_PRICE[what]
    if (what === 'weapon' && this.weaponTier >= WEAPONS.length - 1) {
      this.say('ดาบดีที่สุดแล้ว', 2)
      return
    }
    if (this.coins < price) {
      this.say('เหรียญไม่พอ', 1.5)
      return
    }
    this.coins -= price
    if (what === 'weapon') {
      this.weaponTier++
      this.say(
        `${THAI_WEAPON[this.weaponTier]} พร้อมต่อสู้ · ดาเมจ ${WEAPONS[this.weaponTier].dmg}`,
        2,
      )
    } else if (what === 'hp') {
      this.maxHp++
      this.hp++
      this.say('HP สูงสุด +1', 2)
    } else if (what === 'hunger') {
      this.maxHunger++
      this.hunger++
      this.say('ความหิวสูงสุด +1', 2)
    } else {
      // food is eaten the moment it's bought
      this.hunger = Math.min(this.maxHunger, this.hunger + FOOD_HUNGER[what])
      this.beep(520, 0.08, 'triangle')
      this.say(`กิน ${THAI[what]} +${FOOD_HUNGER[what]} หิว`, 1.5)
    }
    this.beep(880, 0.08)
  }

  eat(food: Food) {
    if (this.p1Inv[food] <= 0) return
    this.p1Inv[food]--
    this.hunger = Math.min(this.maxHunger, this.hunger + FOOD_HUNGER[food])
    this.beep(520, 0.08, 'triangle')
    this.say(`+${FOOD_HUNGER[food]} หิว`, 1.2)
  }

  helpDistress() {
    if (!this.distressActive) return
    if (gatherTotal(this.p1Inv) <= 0 && this.coins === 0) {
      this.say('คุณไม่มีอะไรจะให้', 2)
      return
    }
    // give a strawberry if you have one, else any gatherable
    const give: Item | null =
      this.p1Inv.strawberry > 0
        ? 'strawberry'
        : (['blueberry', 'wood', 'stone'].find((r) => this.p1Inv[r as Gatherable] > 0) as
            | Gatherable
            | undefined) ?? null
    if (give) this.p1Inv[give]--
    else this.coins--
    this.distressActive = false
    this.helpedOnce = true
    this.p2Hp = 5
    this.phase = 'playing'
    this.beep(660, 0.08)
    this.beep(880, 0.12)
    this.say(`${this.p2Name} ปลอดภัยแล้ว`, 2.5)
    this.cb.onDistressEnd(true)
  }

  ignoreDistress() {
    if (!this.distressActive) return
    this.say('...', 1.5)
  }

  resumeAfterDeath() {
    if (this.phase === 'paused') this.phase = 'playing'
  }

  setMode(m: 'collect' | 'fight') {
    if (this.mode === m) return
    this.mode = m
    this.p1Gather = 0
    this.say(m === 'fight' ? 'โหมดต่อสู้' : 'โหมดเก็บของ', 1.5)
    this.beep(m === 'fight' ? 300 : 600, 0.08)
  }

  /** host: learn the partner's name */
  setP2Name(n: string) {
    if (n) this.p2Name = n
  }

  // ---------- input ----------

  private setRemoteKey(k: string, val: boolean) {
    if (k === 'w' || k === 'arrowup') this.remote.u = val
    if (k === 's' || k === 'arrowdown') this.remote.d = val
    if (k === 'a' || k === 'arrowleft') this.remote.l = val
    if (k === 'd' || k === 'arrowright') this.remote.r = val
    if (k === 'e') this.remote.e = val
    if (k === 'q') this.remote.q = val
    if (k === 'x') this.remote.x = val
  }

  /** virtual key press — keyboard and touch controls both land here */
  press(k: string) {
    this.initAudio()
    const k2 = k.toLowerCase()
    if (this.guest) {
      this.setRemoteKey(k2, true)
      if (k2 === 'g') this.onAct?.({ act: 'give' })
      if (this.phase === 'playing') {
        if (k2 === '1') this.onAct?.({ act: 'eat', arg: 'steak' })
        else if (k2 === '2') this.onAct?.({ act: 'eat', arg: 'pork' })
        else if (k2 === '3') this.onAct?.({ act: 'eat', arg: 'beef' })
        else if (k2 === '4') this.onAct?.({ act: 'eat', arg: 'cake' })
      }
      return
    }
    this.keys.add(k2)
    if (k2 === 'f' && this.phase === 'playing') {
      this.setMode(this.mode === 'collect' ? 'fight' : 'collect')
    }
    if (this.phase === 'playing') {
      if (k2 === '1') this.eat('steak')
      else if (k2 === '2') this.eat('pork')
      else if (k2 === '3') this.eat('beef')
      else if (k2 === '4') this.eat('cake')
    }
  }

  /** virtual key release */
  release(k: string) {
    const k2 = k.toLowerCase()
    if (this.guest) {
      this.setRemoteKey(k2, false)
      return
    }
    this.keys.delete(k2)
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    if (
      ['w', 'a', 's', 'd', 'e', 'q', 'x', 'h', 'g', 'f', '1', '2', '3', '4',
        'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)
    ) {
      e.preventDefault()
    }
    this.press(k)
  }

  private onKeyUp = (e: KeyboardEvent) => {
    const k = e.key.toLowerCase()
    this.release(k)
  }

  // click to attack: click on PLAYER 2 to swing at them
  private onMouseDown = (e: MouseEvent) => {
    this.initAudio()
    if (this.guest) {
      // guest clicks map to an attack pulse toward P1
      this.remote.x = true
      setTimeout(() => (this.remote.x = false), 120)
      return
    }
    if (this.phase !== 'playing') return
    const rect = this.canvasEl.getBoundingClientRect()
    const wx = ((e.clientX - rect.left) / rect.width) * W
    const wy = ((e.clientY - rect.top) / rect.height) * H
    if (this.p2Alive && dist(wx, wy, this.p2.x, this.p2.y) < 18) {
      this.tryAttack()
    }
  }

  // ---------- audio ----------

  private initAudio() {
    if (!this.ac) {
      try {
        this.ac = new AudioContext()
      } catch {
        /* no audio, fine */
      }
    }
    if (this.ac?.state === 'suspended') void this.ac.resume()
  }

  private beep(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.04) {
    if (!this.ac) return
    const o = this.ac.createOscillator()
    const g = this.ac.createGain()
    o.type = type
    o.frequency.value = freq
    g.gain.value = vol
    g.gain.exponentialRampToValueAtTime(0.0001, this.ac.currentTime + dur)
    o.connect(g).connect(this.ac.destination)
    o.start()
    o.stop(this.ac.currentTime + dur)
  }

  // ---------- world / spawning ----------

  private spot(): [number, number] {
    for (;;) {
      const x = 20 + Math.random() * (W - 40)
      const y = 24 + Math.random() * (H - 60) // keep booth strip clearer
      if (dist(x, y, W / 2, H / 2) > 45) return [Math.floor(x), Math.floor(y)]
    }
  }

  private spawnOne(type: Gatherable) {
    const [x, y] = this.spot()
    // nodes don't stack: one collect takes the node, then it's gone
    this.nodes.push({ x, y, type, amount: 1 })
  }

  private spawnInitial() {
    for (const [t, n] of INIT_SPAWN) for (let i = 0; i < n; i++) this.spawnOne(t)
  }

  private rollSpawn() {
    if (this.nodes.length >= NODE_CAP) return
    const totalW = SPAWN_WEIGHT.reduce((a, [, w]) => a + w, 0)
    let r = Math.random() * totalW
    for (const [t, w] of SPAWN_WEIGHT) {
      r -= w
      if (r <= 0) {
        this.spawnOne(t)
        return
      }
    }
  }

  private say(msg: string, secs: number) {
    this.toast = msg
    this.toastT = secs
  }

  // ---------- loop ----------

  private frame = (t: number) => {
    const dt = Math.min((t - this.last) / 1000, 0.05)
    this.last = t
    if (this.guest) this.guestTick(dt)
    else if (this.phase === 'playing') this.update(dt)
    else if (this.phase === 'ended' && this.toastT > 0) this.toastT -= dt
    this.draw()
    this.hudT += dt
    if (this.hudT > 0.15) {
      this.hudT = 0
      this.cb.onHud(this.hudObj())
    }
    this.raf = requestAnimationFrame(this.frame)
  }

  private hudObj(): HudState {
    const self = this.guest
    return {
      timeLeft: Math.max(0, GAME_DURATION - this.elapsed),
      day: Math.min(TOTAL_DAYS, Math.floor(this.elapsed / DAY_LENGTH) + 1),
      dayLeft: DAY_LENGTH - (this.elapsed % DAY_LENGTH),
      coins: self ? this.p2Coins : this.coins,
      hp: self ? this.hp2 : this.hp,
      maxHp: self ? this.maxHp2 : this.maxHp,
      hunger: self ? this.hunger2 : this.hunger,
      maxHunger: self ? this.maxHunger2 : this.maxHunger,
      weaponTier: self ? 0 : this.weaponTier,
      mode: this.mode,
      p1: self ? { ...this.p2Inv } : { ...this.p1Inv },
      p2Total: self ? anyTotal(this.p1Inv) : anyTotal(this.p2Inv),
      p2Alive: self ? true : this.p2Alive,
      distressActive: this.distressActive,
      toast: this.toastT > 0 ? this.toast : '',
      name: self ? this.p2Name : this.p1Name,
      oppName: self ? this.p1Name : this.p2Name,
    }
  }

  // guest: predict own avatar's movement locally; snapshots correct drift
  private guestTick(dt: number) {
    if (this.guestPhase !== 'playing' || !this.p2Alive) return
    const a = this.p2
    const dx = (this.remote.r ? 1 : 0) - (this.remote.l ? 1 : 0)
    const dy = (this.remote.d ? 1 : 0) - (this.remote.u ? 1 : 0)
    a.moving = dx !== 0 || dy !== 0
    if (a.moving) {
      const l = Math.hypot(dx, dy)
      a.x = clamp(a.x + (dx / l) * 60 * dt, 8, W - 8)
      a.y = clamp(a.y + (dy / l) * 60 * dt, 14, H - 6)
      if (dx !== 0) a.facing = dx > 0 ? 1 : -1
      a.walkT += dt * 8
    }
  }

  private update(dt: number) {
    this.elapsed += dt
    if (this.toastT > 0) this.toastT -= dt
    if (this.flash > 0) this.flash -= dt
    if (this.attackAnim > 0) this.attackAnim = Math.max(0, this.attackAnim - dt)

    // random respawning at random coordinates
    this.spawnT += dt
    if (this.spawnT >= SPAWN_EVERY) {
      this.spawnT = 0
      this.rollSpawn()
    }

    // hunger ticks down (alive players only)
    if (this.p1Alive) this.hungerT += dt
    if (this.p1Alive && this.hungerT >= HUNGER_TICK) {
      this.hungerT = 0
      if (this.hunger > 0) {
        this.hunger--
        if (this.hunger === 0) this.say('หิวแล้ว! กินอาหาร [1-4]', 2.5)
      }
    }
    // hunger regenerates health
    if (this.p1Alive && this.hunger > 0 && this.hp < this.maxHp) {
      this.regenT += dt
      if (this.regenT >= REGEN_TIME) {
        this.regenT = 0
        this.hp++
        this.beep(600, 0.05, 'triangle')
      }
    } else if (this.p1Alive && this.hunger === 0) {
      this.regenT = 0
      this.starveT += dt
      if (this.starveT >= STARVE_TIME) {
        this.starveT = 0
        this.hp--
        this.flash = 0.3
        this.flashColor = '200,0,0'
        this.beep(100, 0.2, 'sawtooth', 0.06)
        this.say('หิวจนตาย HP กำลังลด', 2)
        if (this.hp <= 0) {
          this.p1Death('starved')
          return
        }
      }
    } else {
      this.regenT = 0
    }

    // mosquito warning: last 30s of every day from day 2 on
    {
      const day = Math.floor(this.elapsed / DAY_LENGTH) + 1
      const dayLeft = DAY_LENGTH - (this.elapsed % DAY_LENGTH)
      if (day >= 2 && dayLeft <= 30 && this.lastMosquitoDay < day) {
        this.lastMosquitoDay = day
        this.say('ยุงกำลังมา...', 3)
        this.beep(300, 0.25, 'triangle', 0.05)
        this.beep(260, 0.3, 'triangle', 0.04)
      }
      // subtle red edge flash while they're around
      this.mosquitoPulse = day >= 2 && dayLeft <= 30 && !this.timeUpFired
    }

    // the swarm bites: alive players lose 1 hp every 5s while it lasts
    if (this.mosquitoPulse) {
      this.mosqT += dt
      if (this.mosqT >= MOSQUITO_HIT) {
        this.mosqT = 0
        if (this.p1Alive) {
          this.hp = Math.max(0, this.hp - 1)
          this.flash = 0.25
          this.flashColor = '200,0,0'
          this.beep(90, 0.15, 'sawtooth', 0.05)
          if (this.hp <= 0) {
            this.p1Death('mosquito')
            return
          }
        }
        if (this.multi && this.p2Alive) {
          this.hp2 = Math.max(0, this.hp2 - 1)
          if (this.hp2 <= 0) {
            this.killP2('mosquito')
            return
          }
        }
      }
    }

    if (this.elapsed >= GAME_DURATION && !this.timeUpFired) {
      this.timeUpFired = true
      this.phase = 'ended'
      this.seq.timeup++
      this.cb.onTimeUp()
      return
    }

    // story beat
    if (
      this.distressPlanned &&
      !this.distressActive &&
      this.p2Alive &&
      !this.helpedOnce &&
      this.elapsed >= this.distressAt
    ) {
      this.distressActive = true
      this.distressT = DISTRESS_WINDOW
      this.phase = 'paused'
      this.beep(440, 0.3, 'triangle', 0.06)
      this.cb.onDistress()
    }
    if (this.distressActive) {
      this.distressT -= dt
      if (this.distressT <= 0) {
        this.distressActive = false
        this.phase = 'playing'
        this.cb.onDistressEnd(false)
        this.killP2('neglect')
        return
      }
    }

    this.updateP1(dt)
    if (this.p2Alive) {
      if (this.multi) {
        this.tickHunger2(dt)
        this.updateP2Remote(dt)
      } else {
        this.updateP2(dt)
      }
    }

    // P1 picks up drops
    this.drops = this.drops.filter((d) => {
      if (dist(this.p1.x, this.p1.y, d.x, d.y) < 10) {
        this.p1Inv[d.type]++
        this.beep(520, 0.06)
        return false
      }
      return true
    })
  }

  // ---------- P1 ----------

  private updateP1(dt: number) {
    if (!this.p1Alive) return // dead men gather no berries
    const p = this.p1
    let dx = 0
    let dy = 0
    if (this.keys.has('a') || this.keys.has('arrowleft')) dx -= 1
    if (this.keys.has('d') || this.keys.has('arrowright')) dx += 1
    if (this.keys.has('w') || this.keys.has('arrowup')) dy -= 1
    if (this.keys.has('s') || this.keys.has('arrowdown')) dy += 1
    p.moving = dx !== 0 || dy !== 0
    if (p.moving) {
      const l = Math.hypot(dx, dy)
      p.x = clamp(p.x + (dx / l) * 60 * dt, 8, W - 8)
      p.y = clamp(p.y + (dy / l) * 60 * dt, 14, H - 6)
      if (dx !== 0) p.facing = dx > 0 ? 1 : -1
      p.walkT += dt * 8
      this.p1Gather = 0
    } else if (this.keys.has('e') && this.mode === 'collect') {
      const n = this.nearestNode(p.x, p.y)
      if (n) {
        if (this.p1GatherNode !== n) this.p1Gather = 0
        this.p1GatherNode = n
        this.p1Gather += dt / 0.9
        if (this.p1Gather >= 1) {
          this.p1Gather = 0
          n.amount--
          this.p1Inv[n.type]++
          this.beep(660, 0.06)
          if (n.type === 'mushroom') {
            // poison: health crashes to 1 bar
            this.hp = 1
            this.flash = 0.6
            this.flashColor = '150,0,200'
            this.beep(80, 0.5, 'sawtooth', 0.08)
            this.say('พิษ! HP เหลือ 1', 3)
          }
          if (n.amount <= 0) {
            this.nodes = this.nodes.filter((m) => m !== n)
            this.p1GatherNode = null
            // 1:1 respawn: a new random resource (rarity-weighted) appears elsewhere
            this.rollSpawn()
            this.say('+1 ' + THAI[n.type], 1)
          }
        }
      } else {
        this.p1Gather = 0
      }
    } else {
      this.p1Gather = 0
    }

    if (this.p1StealCd > 0) this.p1StealCd -= dt
    if (this.p1HitCd > 0) this.p1HitCd -= dt

    // steal
    if (this.keys.has('q') && this.p1StealCd <= 0 && this.p2Alive && !this.distressActive) {
      if (dist(p.x, p.y, this.p2.x, this.p2.y) < 16) {
        const pool: Item[] = []
        ;(Object.keys(this.p2Inv) as Item[]).forEach((r) => {
          for (let i = 0; i < this.p2Inv[r]; i++) pool.push(r)
        })
        if (pool.length > 0) {
          const r = pool[Math.floor(Math.random() * pool.length)]
          this.p2Inv[r]--
          this.p1Inv[r]++
          this.p1StealCd = 5
          this.flash = 0.25
          this.flashColor = '255,0,0'
          this.beep(180, 0.15, 'sawtooth', 0.05)
          this.say(`ขโมย 1 ${THAI[r]} มา!`, 1.5)
        } else {
          this.p1StealCd = 2
          this.say('เค้าไม่มีอะไรจะขโมย', 1.5)
        }
      }
    }

    // attack / eliminate (X key or click on PLAYER 2)
    if (this.keys.has('x')) this.tryAttack()

    // help key
    if (this.keys.has('h') && this.distressActive) this.helpDistress()

    // give a resource to the other player
    if (this.giveCd > 0) this.giveCd -= dt
    if (this.keys.has('g') && this.giveCd <= 0) {
      if (dist(p.x, p.y, this.p2.x, this.p2.y) < 20 && (this.p2Alive || this.multi)) {
        const give = (['strawberry', 'blueberry', 'wood', 'stone'] as Gatherable[]).find(
          (r) => this.p1Inv[r] > 0,
        )
        if (give) {
          this.p1Inv[give]--
          this.p2Inv[give]++
          this.giveCd = 1
          this.beep(700, 0.08, 'triangle')
          this.say(`ให้ ${this.p2Name} 1 ${THAI[give]}`, 1.5)
        } else {
          this.giveCd = 1
          this.say('ไม่มีอะไรจะให้', 1.2)
        }
      }
    }
  }

  private tryAttack() {
    if (this.mode !== 'fight') return
    if (this.p1HitCd > 0 || !this.p2Alive || this.distressActive) return
    if (dist(this.p1.x, this.p1.y, this.p2.x, this.p2.y) >= 18) return
    this.p1HitCd = 0.8
    this.attackAnim = 0.3
    this.p2Hp -= WEAPONS[this.weaponTier].dmg
    this.beep(120, 0.2, 'sawtooth', 0.07)
    const ang = Math.atan2(this.p2.y - this.p1.y, this.p2.x - this.p1.x)
    this.p2.x = clamp(this.p2.x + Math.cos(ang) * 20, 8, W - 8)
    this.p2.y = clamp(this.p2.y + Math.sin(ang) * 20, 14, H - 6)
    const owned = (Object.keys(this.p2Inv) as Item[]).filter((r) => this.p2Inv[r] > 0)
    if (owned.length > 0) {
      const r = owned[Math.floor(Math.random() * owned.length)]
      this.p2Inv[r]--
      if (['strawberry', 'blueberry', 'wood', 'stone'].includes(r)) {
        this.drops.push({ x: this.p2.x, y: this.p2.y, type: r as Gatherable })
      }
    }
    this.flash = 0.3
    this.flashColor = '255,0,0'
    if (this.p2Hp <= 0) this.killP2('attacked')
    else this.say(`${this.p2Name} บาดเจ็บ`, 1.2)
  }

  private nearestNode(x: number, y: number): Node | null {
    let best: Node | null = null
    let bd = 18
    for (const n of this.nodes) {
      const d = dist(x, y, n.x, n.y)
      if (d < bd) {
        bd = d
        best = n
      }
    }
    return best
  }

  // hunger/health sim for the remote PLAYER 2 (host-authoritative)
  private tickHunger2(dt: number) {
    this.hunger2T += dt
    if (this.hunger2T >= HUNGER_TICK) {
      this.hunger2T = 0
      if (this.hunger2 > 0) {
        this.hunger2--
        if (this.hunger2 === 0) this.say(`${this.p2Name} กำลังหิว`, 2.5)
      }
    }
    if (this.hunger2 > 0 && this.hp2 < this.maxHp2) {
      this.regen2T += dt
      if (this.regen2T >= REGEN_TIME) {
        this.regen2T = 0
        this.hp2++
      }
    } else if (this.hunger2 === 0) {
      this.regen2T = 0
      this.starve2T += dt
      if (this.starve2T >= STARVE_TIME) {
        this.starve2T = 0
        this.hp2 = Math.max(0, this.hp2 - 1)
        if (this.hp2 <= 0) this.killP2('starved')
      }
    } else {
      this.regen2T = 0
    }
  }

  // ---------- P2 remote (multi): partner drives this avatar ----------
  private updateP2Remote(dt: number) {
    const a = this.p2
    const ri = this.remote
    let dx = (ri.r ? 1 : 0) - (ri.l ? 1 : 0)
    let dy = (ri.d ? 1 : 0) - (ri.u ? 1 : 0)
    a.moving = dx !== 0 || dy !== 0
    if (a.moving) {
      const l = Math.hypot(dx, dy)
      a.x = clamp(a.x + (dx / l) * 60 * dt, 8, W - 8)
      a.y = clamp(a.y + (dy / l) * 60 * dt, 14, H - 6)
      if (dx !== 0) a.facing = dx > 0 ? 1 : -1
      a.walkT += dt * 8
      this.p2Gather = 0
    } else if (ri.e) {
      const n = this.nearestNode(a.x, a.y)
      if (n) {
        if (this.p2GatherNode !== n) this.p2Gather = 0
        this.p2GatherNode = n
        this.p2Gather += dt / 0.9
        if (this.p2Gather >= 1) {
          this.p2Gather = 0
          n.amount--
          this.p2Inv[n.type]++
          if (n.type === 'mushroom') this.hp2 = 1
          if (n.amount <= 0) {
            this.nodes = this.nodes.filter((m) => m !== n)
            this.p2GatherNode = null
            this.rollSpawn()
          }
        }
      } else {
        this.p2Gather = 0
        this.p2GatherNode = null
      }
    } else {
      this.p2Gather = 0
      this.p2GatherNode = null
    }

    if (this.p2StealCd > 0) this.p2StealCd -= dt
    if (this.p2HitCd > 0) this.p2HitCd -= dt

    // steal from P1
    if (ri.q && this.p2StealCd <= 0) {
      if (dist(a.x, a.y, this.p1.x, this.p1.y) < 16) {
        const pool: Item[] = []
        ;(Object.keys(this.p1Inv) as Item[]).forEach((r) => {
          for (let i = 0; i < this.p1Inv[r]; i++) pool.push(r)
        })
        if (pool.length > 0) {
          const r = pool[Math.floor(Math.random() * pool.length)]
          this.p1Inv[r]--
          this.p2Inv[r]++
          this.p2StealCd = 5
          this.flash = 0.25
          this.flashColor = '255,0,0'
          this.say(`${this.p2Name} ขโมยของคุณ!`, 1.5)
        }
      }
    }

    // attack P1 — can kill now
    if (ri.x && this.p2HitCd <= 0) {
      if (dist(a.x, a.y, this.p1.x, this.p1.y) < 18) {
        this.p2HitCd = 0.8
        this.hp = Math.max(0, this.hp - 1)
        this.flash = 0.3
        this.flashColor = '255,0,0'
        this.beep(120, 0.2, 'sawtooth', 0.07)
        const ang = Math.atan2(this.p1.y - a.y, this.p1.x - a.x)
        this.p1.x = clamp(this.p1.x + Math.cos(ang) * 20, 8, W - 8)
        this.p1.y = clamp(this.p1.y + Math.sin(ang) * 20, 14, H - 6)
        this.say(`${this.p2Name} ตบคุณ!`, 1.2)
        if (this.hp <= 0) this.p1Death('killed')
      }
    }
  }

  // ---------- P2 (AI) ----------

  private updateP2(dt: number) {
    const a = this.p2
    a.moving = false

    this.p2ModeT -= dt
    if (this.p2ModeT <= 0) {
      this.p2ModeT = 6 + Math.random() * 6
      this.p2Mode = Math.random() < 0.3 && gatherTotal(this.p1Inv) > 0 ? 'hunt' : 'gather'
    }

    let tx = a.x
    let ty = a.y

    if (this.p2Mode === 'hunt' && gatherTotal(this.p1Inv) > 0) {
      tx = this.p1.x
      ty = this.p1.y
      if (dist(a.x, a.y, this.p1.x, this.p1.y) < 14 && this.p2StealCd <= 0) {
        const pool: Item[] = []
        ;(Object.keys(this.p1Inv) as Item[]).forEach((r) => {
          for (let i = 0; i < this.p1Inv[r]; i++) pool.push(r)
        })
        if (pool.length > 0) {
          const r = pool[Math.floor(Math.random() * pool.length)]
          this.p1Inv[r]--
          this.p2Inv[r]++
          this.p2StealCd = 15
          this.flash = 0.3
          this.flashColor = '255,0,0'
          this.beep(150, 0.2, 'sawtooth', 0.06)
          this.say(`${this.p2Name} ขโมยของคุณ!`, 2)
        }
      }
    } else {
      // nearest available node — AI refuses to touch poison mushrooms
      let best: Node | null = null
      let bd = Infinity
      for (const n of this.nodes) {
        if (n.type === 'mushroom') continue
        const d = dist(a.x, a.y, n.x, n.y)
        if (d < bd) {
          bd = d
          best = n
        }
      }
      if (best) {
        tx = best.x
        ty = best.y
        if (bd < 12) {
          this.p2GatherT += dt
          if (this.p2GatherT > 2.2) {
            this.p2GatherT = 0
            best.amount--
            this.p2Inv[best.type]++
            if (best.amount <= 0) {
              this.nodes = this.nodes.filter((m) => m !== best)
              this.rollSpawn()
            }
          }
          tx = a.x
          ty = a.y
        }
      } else {
        tx = W / 2
        ty = H / 2
      }
    }

    if (this.p2StealCd > 0) this.p2StealCd -= dt

    const d = dist(a.x, a.y, tx, ty)
    if (d > 4) {
      const sp = 32
      const vx = ((tx - a.x) / d) * sp * dt
      const vy = ((ty - a.y) / d) * sp * dt
      a.x = clamp(a.x + vx, 8, W - 8)
      a.y = clamp(a.y + vy, 14, H - 6)
      a.moving = true
      if (Math.abs(vx) > 0.01) a.facing = vx > 0 ? 1 : -1
      a.walkT += dt * 8
    }
  }

  private killP2(reason: 'neglect' | 'attacked' | 'mosquito' | 'starved') {
    this.p2Alive = false
    this.distressActive = false
    this.phase = 'paused'
    this.seq.death++
    this.beep(90, 0.8, 'sawtooth', 0.08)
    this.cb.onDeath(reason)
  }

  private p1Death(reason: 'mosquito' | 'starved' | 'killed') {
    if (!this.p1Alive || this.timeUpFired) return
    this.p1Alive = false
    // world keeps running — the other player must survive to day 7
    this.seq.p1death++
    this.beep(70, 1, 'sawtooth', 0.09)
    this.cb.onP1Death(reason)
  }

  // ---------- stats ----------

  /** host: current world state for the guest mirror */
  getSnap(): Snap {
    return {
      p1: { x: this.p1.x, y: this.p1.y, facing: this.p1.facing, moving: this.p1.moving, walkT: this.p1.walkT },
      p2: { x: this.p2.x, y: this.p2.y, facing: this.p2.facing, moving: this.p2.moving, walkT: this.p2.walkT },
      p1Inv: { ...this.p1Inv },
      p2Inv: { ...this.p2Inv },
      p2Coins: this.p2Coins,
      hp2: this.hp2,
      maxHp2: this.maxHp2,
      hunger2: this.hunger2,
      maxHunger2: this.maxHunger2,
      p2Hp: this.p2Hp,
      p2Alive: this.p2Alive,
      p1Alive: this.p1Alive,
      p1Name: this.p1Name,
      p2Name: this.p2Name,
      nodes: this.nodes.map((n) => ({ ...n })),
      drops: this.drops.map((d) => ({ ...d })),
      timeLeft: Math.max(0, GAME_DURATION - this.elapsed),
      distressActive: this.distressActive,
      mosquito: this.mosquitoPulse,
      p1Gather: this.p1Gather,
      p1GatherNode: this.p1GatherNode ? this.nodes.indexOf(this.p1GatherNode) : -1,
      p2Gather: this.p2Gather,
      p2GatherNode: this.p2GatherNode ? this.nodes.indexOf(this.p2GatherNode) : -1,
      attackAnim: this.attackAnim,
      p1Attacking: this.attackAnim > 0,
      phase: this.phase,
      winnerP1: this.p1Won(),
      helped: this.helpedOnce,
      seq: { ...this.seq },
      toast: this.toastT > 0 ? this.toast : '',
    }
  }

  /** guest: overwrite local mirror with host state */
  applySnap(s: Snap) {
    this.p1.x = s.p1.x
    this.p1.y = s.p1.y
    this.p1.facing = s.p1.facing
    this.p1.moving = s.p1.moving
    this.p1.walkT = s.p1.walkT
    this.p2.x = s.p2.x
    this.p2.y = s.p2.y
    this.p2.facing = s.p2.facing
    this.p2.moving = s.p2.moving
    this.p2.walkT = s.p2.walkT
    this.p1Inv = { ...s.p1Inv }
    this.p2Inv = { ...s.p2Inv }
    this.p2Coins = s.p2Coins
    this.hp2 = s.hp2
    this.maxHp2 = s.maxHp2
    this.hunger2 = s.hunger2
    this.maxHunger2 = s.maxHunger2
    this.p2Hp = s.p2Hp
    this.p2Alive = s.p2Alive
    this.p1Alive = s.p1Alive
    if (s.p1Name) this.p1Name = s.p1Name
    if (s.p2Name) this.p2Name = s.p2Name
    this.nodes = s.nodes.map((n) => ({ ...n }))
    this.drops = s.drops.map((d) => ({ ...d }))
    this.elapsed = GAME_DURATION - s.timeLeft
    this.distressActive = s.distressActive
    this.mosquitoPulse = s.mosquito
    this.p1Gather = s.p1Gather
    this.p1GatherNode = s.p1GatherNode >= 0 ? this.nodes[s.p1GatherNode] : null
    this.p2Gather = s.p2Gather
    this.p2GatherNode = s.p2GatherNode >= 0 ? this.nodes[s.p2GatherNode] : null
    this.attackAnim = s.attackAnim
    this.toast = s.toast
    this.toastT = s.toast ? 0.4 : 0
    this.guestPhase = s.phase
    if (s.seq.death > this.seenSeq.death) {
      this.seenSeq.death = s.seq.death
      this.cb.onDeath('neglect')
    }
    if (s.seq.p1death > this.seenSeq.p1death) {
      this.seenSeq.p1death = s.seq.p1death
      this.cb.onP1Death('mosquito')
    }
    if (s.seq.timeup > this.seenSeq.timeup) {
      this.seenSeq.timeup = s.seq.timeup
      this.cb.onTimeUp()
    }
  }

  /** guest: current input vector to send to host */
  readInput(): RemoteInput {
    return { ...this.remote }
  }

  /** host: apply partner's input vector */
  setRemoteInput(i: RemoteInput) {
    this.remote = { ...i }
  }

  // ---------- dev mode ----------

  devSkipToLastDay() {
    this.elapsed = GAME_DURATION - DAY_LENGTH
    this.lastMosquitoDay = TOTAL_DAYS - 1
    this.say('DEV: วันที่ 7', 2)
  }

  devKillP2(by: 'mosquito' | 'player') {
    if (!this.p2Alive) return
    this.killP2(by === 'mosquito' ? 'mosquito' : 'attacked')
  }

  devKillP1(by: 'mosquito' | 'player') {
    this.p1Death(by === 'mosquito' ? 'mosquito' : 'killed')
  }

  /** host: apply a discrete action from the guest */
  guestAct(a: GuestAct) {
    if (a.act === 'resume') {
      this.resumeAfterDeath()
      return
    }
    if (a.act === 'give') {
      // partner hands a resource to PLAYER 1
      const give = (['strawberry', 'blueberry', 'wood', 'stone'] as Gatherable[]).find(
        (r) => this.p2Inv[r] > 0,
      )
      if (give) {
        this.p2Inv[give]--
        this.p1Inv[give]++
        this.say(`${this.p2Name} ให้คุณ 1 ${THAI[give]}`, 1.5)
      }
      return
    }
    if (a.act === 'eat') {
      if (this.p2Inv[a.arg] > 0) {
        this.p2Inv[a.arg]--
        this.hunger2 = Math.min(this.maxHunger2, this.hunger2 + FOOD_HUNGER[a.arg])
        this.say(`${this.p2Name} กิน ${THAI[a.arg]}`, 1.2)
      }
      return
    }
    if (a.act === 'sell') {
      const price = SELL_PRICE[a.arg] ?? 0
      if (price <= 0 || this.p2Inv[a.arg] <= 0) return
      this.p2Inv[a.arg]--
      this.p2Coins += price
      this.say(`${this.p2Name} ขาย ${THAI[a.arg]}`, 1.2)
      return
    }
    // buy
    let price = 0
    if (a.arg === 'weapon') price = -1 // P2 fights bare-fisted
    else if (a.arg === 'hp') price = HP_UP_PRICE
    else if (a.arg === 'hunger') price = HUNGER_UP_PRICE
    else price = FOOD_PRICE[a.arg]
    if (price < 0 || this.p2Coins < price) return
    this.p2Coins -= price
    if (a.arg === 'hp') {
      this.maxHp2++
      this.hp2++
    } else if (a.arg === 'hunger') {
      this.maxHunger2++
      this.hunger2++
    } else {
      const f = a.arg as Food
      this.hunger2 = Math.min(this.maxHunger2, this.hunger2 + FOOD_HUNGER[f])
    }
  }

  getStats() {
    return { p1: { ...this.p1Inv }, p2: { ...this.p2Inv } }
  }

  p1Won() {
    return anyTotal(this.p1Inv) + this.coins >= anyTotal(this.p2Inv)
  }

  wasHelped() {
    return this.helpedOnce
  }

  // ---------- drawing ----------

  private draw() {
    const c = this.ctx
    c.setTransform(RES, 0, 0, RES, 0, 0)

    // grass
    for (let ty = 0; ty < H / 16; ty++) {
      for (let tx = 0; tx < W / 16; tx++) {
        c.fillStyle = (tx + ty) % 2 === 0 ? '#3a7d2c' : '#356f28'
        c.fillRect(tx * 16, ty * 16, 16, 16)
      }
    }
    c.fillStyle = '#2c5e21'
    for (let i = 0; i < 40; i++) {
      const x = (i * 61) % W
      const y = (i * 97) % H
      c.fillRect(x, y, 2, 3)
    }

    // nodes
    for (const n of this.nodes) {
      // highlight the node being gathered (by either player)
      if ((n === this.p1GatherNode && this.p1Gather > 0) || (n === this.p2GatherNode && this.p2Gather > 0)) {
        c.globalAlpha = 0.6 + 0.4 * Math.sin(performance.now() / 160)
        c.strokeStyle = '#ffffff'
        c.lineWidth = 1
        c.strokeRect(n.x - 9.5, n.y - 20.5, 19, 23)
        c.globalAlpha = 1
      }
      if (n.type === 'wood') this.drawTree(n.x, n.y)
      else if (n.type === 'strawberry') this.drawBush(n.x, n.y, '#c0392b', n.amount)
      else if (n.type === 'blueberry') this.drawBush(n.x, n.y, '#3b5bdb', n.amount)
      else if (n.type === 'mushroom') this.drawMushroom(n.x, n.y)
      else this.drawRock(n.x, n.y)
    }

    // drops
    for (const d of this.drops) {
      c.fillStyle =
        d.type === 'strawberry'
          ? '#c0392b'
          : d.type === 'blueberry'
            ? '#3b5bdb'
            : d.type === 'wood'
              ? '#8b5a2b'
              : '#7f8c8d'
      c.fillRect(d.x - 2, d.y - 2, 4, 4)
    }

    // gather progress
    if (this.p1Gather > 0 && this.p1GatherNode) {
      const n = this.p1GatherNode
      c.fillStyle = '#000'
      c.fillRect(n.x - 8, n.y - 14, 16, 3)
      c.fillStyle = '#f1c40f'
      c.fillRect(n.x - 7, n.y - 13, Math.floor(14 * this.p1Gather), 1)
    }
    if (this.p2Gather > 0 && this.p2GatherNode) {
      const n = this.p2GatherNode
      c.fillStyle = '#000'
      c.fillRect(n.x - 8, n.y - 14, 16, 3)
      c.fillStyle = '#ff8c66'
      c.fillRect(n.x - 7, n.y - 13, Math.floor(14 * this.p2Gather), 1)
    }

    // characters
    if (this.p2Alive) this.drawPerson(this.p2.x, this.p2.y, '#c0392b', this.p2, false)
    else this.drawBody(this.p2.x, this.p2.y, '#c0392b')
    const sitting = (this.guest ? this.guestPhase : this.phase) === 'ended' && this.p1Alive
    if (this.p1Alive) this.drawPerson(this.p1.x, this.p1.y, '#1f6f8b', this.p1, sitting)
    else this.drawBody(this.p1.x, this.p1.y, '#1f6f8b')

    // nameplates
    this.plate(this.p1Name, this.p1.x, this.p1.y - 22, '#7fdfff')
    if (this.p2Alive) {
      this.plate(this.p2Name, this.p2.x, this.p2.y - 22, '#ffb0a0')
    } else {
      this.plate('R.I.P', this.p2.x, this.p2.y - 18, '#888')
    }

    // distress marker
    if (this.distressActive) {
      const bob = Math.sin(performance.now() / 150) * 2
      c.fillStyle = '#ff4a4a'
      c.fillRect(this.p2.x - 1, this.p2.y - 34 + bob, 3, 3)
      c.fillRect(this.p2.x - 1, this.p2.y - 30 + bob, 3, 1)
      c.fillRect(this.p2.x, this.p2.y - 28 + bob, 1, 2)
    }

    // hp pips over P2 when hurt
    if (this.p2Alive && this.p2Hp < 5) {
      for (let i = 0; i < 5; i++) {
        c.fillStyle = i < this.p2Hp ? '#e74c3c' : '#400000'
        c.fillRect(this.p2.x - 11 + i * 5, this.p2.y - 16, 4, 2)
      }
    }

    // weapon in hand (animated)
    this.drawWeapon()

    // hurt/poison/starve flash
    if (this.flash > 0) {
      c.fillStyle = `rgba(${this.flashColor},${this.flash})`
      c.fillRect(0, 0, W, H)
    }

    // mosquito warning: minimal red pulse on screen edges
    if (this.mosquitoPulse) {
      const a = 0.16 + 0.12 * Math.sin(performance.now() / 250)
      c.fillStyle = `rgba(220,0,0,${a})`
      c.fillRect(0, 0, W, 8)
      c.fillRect(0, H - 8, W, 8)
      c.fillRect(0, 0, 8, H)
      c.fillRect(W - 8, 0, 8, H)
    }
  }

  private plate(text: string, x: number, y: number, color: string) {
    const c = this.ctx
    c.font = '5px monospace'
    c.textAlign = 'center'
    c.fillStyle = 'rgba(0,0,0,0.6)'
    const w = c.measureText(text).width
    c.fillRect(x - w / 2 - 2, y - 5, w + 4, 7)
    c.fillStyle = color
    c.fillText(text, x, y)
  }

  // collector mode: pickaxe in hand (not buyable), swings while gathering
  // fight mode: equipped weapon, swings when attacking
  private drawWeapon() {
    const c = this.ctx
    const p = this.p1

    let angle = 0
    let tier = this.weaponTier
    if (this.mode === 'collect') {
      tier = -1 // pickaxe
      if (this.p1Gather > 0) angle = -0.8 + Math.sin(this.p1Gather * Math.PI * 2) * 0.7
    } else {
      if (tier === 0 && this.attackAnim <= 0) return // bare fist, idle
      if (this.attackAnim > 0) {
        // one chop: wind up, then snap forward
        const t = 1 - this.attackAnim / 0.3
        angle = -1.3 + t * 1.7
      }
    }

    const hx = p.x + 4 * p.facing
    const hy = p.y - 10
    c.save()
    c.translate(hx, hy)
    c.scale(p.facing, 1)
    c.rotate(angle)
    if (tier === -1) {
      // pickaxe
      c.fillStyle = '#8b5a2b'
      c.fillRect(-1, -10, 2, 10)
      c.fillStyle = '#b0b7bc'
      c.fillRect(-5, -12, 10, 3)
      c.fillStyle = '#7f8c8d'
      c.fillRect(-5, -10, 10, 1)
    } else if (tier === 1) {
      // bat
      c.fillStyle = '#c9a227'
      c.fillRect(-1, -8, 3, 8)
    } else if (tier === 2) {
      // axe
      c.fillStyle = '#8b5a2b'
      c.fillRect(-1, -9, 2, 9)
      c.fillStyle = '#b0b7bc'
      c.fillRect(-1, -12, 5, 4)
    } else if (tier === 3) {
      // sword
      c.fillStyle = '#d7dde0'
      c.fillRect(-1, -12, 2, 12)
      c.fillStyle = '#c9a227'
      c.fillRect(-3, 0, 6, 2)
    }
    c.restore()
  }

  private drawTree(x: number, y: number) {
    const c = this.ctx
    c.fillStyle = '#6b4423'
    c.fillRect(x - 2, y - 8, 4, 9)
    c.fillStyle = '#1e5c1e'
    c.fillRect(x - 7, y - 18, 14, 11)
    c.fillStyle = '#2d7a2d'
    c.fillRect(x - 5, y - 16, 10, 7)
  }

  private drawBush(x: number, y: number, berry: string, amount: number) {
    const c = this.ctx
    c.fillStyle = '#1e5c1e'
    c.fillRect(x - 6, y - 6, 12, 7)
    c.fillStyle = berry
    const dots = Math.min(amount, 4)
    for (let i = 0; i < dots; i++) {
      c.fillRect(x - 5 + i * 3, y - 5 + (i % 2) * 3, 2, 2)
    }
  }

  private drawMushroom(x: number, y: number) {
    const c = this.ctx
    c.fillStyle = '#e8e0d0'
    c.fillRect(x - 1, y - 5, 2, 5)
    c.fillStyle = '#8e44ad'
    c.fillRect(x - 4, y - 8, 8, 3)
    c.fillStyle = '#c39bd3'
    c.fillRect(x - 2, y - 8, 1, 1)
  }

  private drawRock(x: number, y: number) {
    const c = this.ctx
    c.fillStyle = '#636e72'
    c.fillRect(x - 6, y - 5, 12, 6)
    c.fillStyle = '#95a5a6'
    c.fillRect(x - 4, y - 4, 6, 3)
  }

  private drawPerson(x: number, y: number, shirt: string, p: Person, sitting: boolean) {
    const c = this.ctx
    const step = p.moving && Math.floor(p.walkT) % 2 === 0 ? 1 : 0
    const skin = '#e0a878'
    if (sitting) {
      c.fillStyle = '#3d2b1f'
      c.fillRect(x - 3, y - 2, 7, 3)
      c.fillStyle = shirt
      c.fillRect(x - 3, y - 9, 6, 5)
    } else {
      c.fillStyle = '#3d2b1f'
      c.fillRect(x - 3, y - 3 + step, 2, 4 - step)
      c.fillRect(x + 1, y - 3 - step + 1, 2, 4 + step - 1)
      c.fillStyle = shirt
      c.fillRect(x - 3, y - 9, 6, 6)
    }
    c.fillStyle = skin
    c.fillRect(x - 3, y - 15, 6, 6)
    c.fillStyle = '#2c2c2c'
    c.fillRect(x - 3, y - 16, 6, 2)
    c.fillStyle = '#111'
    c.fillRect(x + (p.facing > 0 ? 1 : -2), y - 12, 1, 1)
  }

  private drawBody(x: number, y: number, shirt = '#c0392b') {
    const c = this.ctx
    c.fillStyle = shirt
    c.fillRect(x - 6, y - 3, 12, 4)
    c.fillStyle = '#e0a878'
    c.fillRect(x + 6, y - 3, 5, 4)
    c.fillStyle = '#2c2c2c'
    c.fillRect(x + 9, y - 4, 4, 2)
  }
}
