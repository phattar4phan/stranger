// Party transport: BroadcastChannel (same browser, instant) + PeerJS WebRTC
// (cross-device via free public signaling). Host's device is the server —
// the host tab runs the world, the guest mirrors it. Same API for both.
//
// The public broker is shared worldwide, so the PIN alone can collide with
// another player's peer id. Host re-registers with -1..-5 suffixes; the
// guest scans for them. Retry loops keep both sides alive through broker
// hiccups.
import Peer from 'peerjs'
import type { DataConnection } from 'peerjs'
import type { Snap, RemoteInput, GuestAct } from '../game/engine'

export type PartyMsg =
  | { kind: 'hello'; name?: string }
  | { kind: 'peer' }
  | { kind: 'input'; input: RemoteInput }
  | { kind: 'act'; act: GuestAct }
  | { kind: 'snap'; snap: Snap }

// ICE config: keep it lean — every extra server slows discovery.
//
// ── HARDCODE YOUR TURN HERE ──────────────────────────────────────────────
// Free TURN (static creds, never expire): metered.ca "TURN over Caas" free
// plan or expressturn.com. Sign up, copy 3 values, paste below, redeploy.
// ─────────────────────────────────────────────────────────────────────────
const HARDCODED_TURN: RTCIceServer[] = [
  {
    urls: 'turn:phattar4phan.metered.live:3478',
    username: '7123a723780c76a855c716fd',
    credential: 'rUFvBI95I7posmyq',
  },
  {
    urls: 'turn:phattar4phan.metered.live:443',
    username: '7123a723780c76a855c716fd',
    credential: 'rUFvBI95I7posmyq',
  },
  {
    urls: 'turns:phattar4phan.metered.live:443?transport=tcp',
    username: '7123a723780c76a855c716fd',
    credential: 'rUFvBI95I7posmyq',
  },
]

// runtime override (dev panel) wins over the hardcode
const DEFAULT_ICE: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  {
    urls: 'turn:openrelay.metered.ca:80',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
  {
    urls: 'turn:openrelay.metered.ca:443?transport=tcp',
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

const iceConfig = () => {
  let servers = HARDCODED_TURN.length > 0 ? HARDCODED_TURN : DEFAULT_ICE
  try {
    const raw = localStorage.getItem('stranger-turn')
    if (raw) servers = JSON.parse(raw)
  } catch {
    /* keep defaults */
  }
  return { config: { iceServers: servers }, debug: 0 as const }
}
const ICE = iceConfig()

const peerId = (pin: string, suffix: number) =>
  suffix === 0 ? `stranger-party-${pin}` : `stranger-party-${pin}-${suffix}`
const MAX_SUFFIX = 9

export class Party {
  private peer: Peer | null = null
  private conn: DataConnection | null = null
  private bc: BroadcastChannel | null = null
  private dead = false
  private suffix = 0
  private guestTarget = 0
  private helloTimer: ReturnType<typeof setInterval> | null = null
  onMsg: (m: PartyMsg) => void = () => {}
  onError: (e: string) => void = () => {}
  onStatus: (s: 'connecting' | 'waiting' | 'ok' | 'error') => void = () => {}

  constructor(
    readonly pin: string,
    readonly role: 'host' | 'guest',
  ) {
    // lane 1: same-browser tabs
    try {
      this.bc = new BroadcastChannel(`stranger-bc-${pin}`)
      this.bc.onmessage = (e) => this.handle(e.data as PartyMsg)
    } catch {
      this.bc = null
    }
    window.addEventListener('beforeunload', this.bye)

    // lane 2: WebRTC via PeerJS public broker (cross-device)
    this.openPeer()
  }

  private openPeer() {
    if (this.dead) return
    this.onStatus('connecting')
    try {
      this.peer = this.role === 'host' ? new Peer(peerId(this.pin, this.suffix), ICE) : new Peer(ICE)
    } catch (e) {
      this.onError('peer-init-failed')
      return
    }
    this.peer.on('error', (e) => this.onPeerError(e.type))
    if (this.role === 'host') {
      this.onStatus('waiting')
      this.peer.on('connection', (conn) => {
        if (this.conn && this.conn.open) {
          conn.close()
          return
        }
        this.conn = conn
        conn.on('data', (d) => this.handle(d as PartyMsg))
        this.watchIce(conn)
        conn.on('close', () => {
          if (this.conn === conn) this.conn = null
        })
      })
    } else {
      this.peer.on('open', () => this.dial())
    }
  }

  private dial() {
    if (this.dead || !this.peer) return
    this.onStatus('connecting')
    const conn = this.peer.connect(peerId(this.pin, this.guestTarget))
    this.conn = conn
    conn.on('data', (d) => this.handle(d as PartyMsg))
    this.watchIce(conn)
    conn.on('open', () => {
      this.onStatus('ok')
      this.send({ kind: 'hello' })
      // heartbeat hello: if the lane dies, reconnect
      if (this.helloTimer) clearInterval(this.helloTimer)
      this.helloTimer = setInterval(() => {
        if (!this.conn || !this.conn.open) {
          if (this.helloTimer) clearInterval(this.helloTimer)
          if (!this.dead) this.dial()
        }
      }, 3000)
    })
  }

  private onPeerError(type: string) {
    if (this.dead) return
    if (type === 'unavailable-id') {
      // someone worldwide already holds this pin's peer id — shift suffix
      if (this.role === 'host' && this.suffix < MAX_SUFFIX) {
        this.suffix++
        try {
          this.peer?.destroy()
        } catch {
          /* */
        }
        this.openPeer()
        return
      }
      this.onError(type)
      return
    }
    if (type === 'peer-unavailable') {
      // guest: PIN exists but this target isn't there (or wrong suffix) — scan on
      if (this.role === 'guest') {
        this.guestTarget = (this.guestTarget + 1) % (MAX_SUFFIX + 1)
        this.onError('peer-unavailable')
        setTimeout(() => {
          if (!this.dead && (!this.conn || !this.conn.open)) this.dial()
        }, 1500)
        return
      }
    }
    // network / broker errors: rebuild after a pause
    this.onError(type)
    setTimeout(() => {
      if (!this.dead && (!this.conn || !this.conn.open)) {
        try {
          this.peer?.destroy()
        } catch {
          /* */
        }
        this.openPeer()
      }
    }, 2500)
  }

  /** watch ICE: if the link dies (e.g. 'failed'), tear down and redial */
  private watchIce(conn: DataConnection) {
    const tick = () => {
      if (this.dead) return
      const pc = conn.peerConnection
      if (pc) {
        const st = pc.iceConnectionState
        if (st === 'failed' || st === 'disconnected' || st === 'closed') {
          try {
            conn.close()
          } catch {
            /* */
          }
          if (this.conn === conn) this.conn = null
          if (this.role === 'guest') {
            setTimeout(() => {
              if (!this.dead && (!this.conn || !this.conn.open)) this.dial()
            }, 1000)
          }
          return // stop watching this connection
        }
      }
      setTimeout(tick, 2000)
    }
    setTimeout(tick, 2000)
  }

  private handle(m: PartyMsg) {
    if (this.dead) return
    // host: answer hello on whichever lane it arrived
    if (this.role === 'host' && m.kind === 'hello') {
      this.send({ kind: 'peer' })
    }
    this.onMsg(m)
  }

  send(m: PartyMsg) {
    if (this.dead) return
    try {
      this.bc?.postMessage(m)
    } catch {
      /* closed */
    }
    try {
      if (this.conn && this.conn.open) this.conn.send(m)
    } catch {
      /* closed */
    }
  }

  private bye = () => this.destroy()

  destroy() {
    if (this.dead) return
    this.dead = true
    if (this.helloTimer) clearInterval(this.helloTimer)
    window.removeEventListener('beforeunload', this.bye)
    try {
      this.conn?.close()
    } catch {
      /* */
    }
    try {
      this.peer?.destroy()
    } catch {
      /* */
    }
    try {
      this.bc?.close()
    } catch {
      /* */
    }
  }
}

export const makePin = () =>
  Math.floor(100000 + Math.random() * 900000).toString()
