// Party transport: BroadcastChannel (same browser, instant) + PeerJS WebRTC
// (cross-device via free public signaling). Host's device is the server —
// the host tab runs the world, the guest mirrors it. Same API for both.
import Peer from 'peerjs'
import type { DataConnection } from 'peerjs'
import type { Snap, RemoteInput, GuestAct } from '../game/engine'

export type PartyMsg =
  | { kind: 'hello' }
  | { kind: 'peer' }
  | { kind: 'input'; input: RemoteInput }
  | { kind: 'act'; act: GuestAct }
  | { kind: 'snap'; snap: Snap }

const peerId = (pin: string) => `stranger-party-${pin}`

export class Party {
  private peer: Peer | null = null
  private conn: DataConnection | null = null
  private bc: BroadcastChannel | null = null
  private dead = false
  onMsg: (m: PartyMsg) => void = () => {}
  onError: (e: string) => void = () => {}

  constructor(
    readonly pin: string,
    readonly role: 'host' | 'guest',
  ) {
    // lane 1: same-browser tabs
    this.bc = new BroadcastChannel(`stranger-bc-${pin}`)
    this.bc.onmessage = (e) => this.handle(e.data as PartyMsg)
    window.addEventListener('beforeunload', this.bye)

    // lane 2: WebRTC via PeerJS public broker (cross-device)
    if (role === 'host') {
      this.peer = new Peer(peerId(pin))
      this.peer.on('error', (e) => this.onError(e.type))
      this.peer.on('connection', (conn) => {
        // one guest only
        if (this.conn && this.conn.open) {
          conn.close()
          return
        }
        this.conn = conn
        conn.on('data', (d) => this.handle(d as PartyMsg))
        conn.on('open', () => {
          // guest says hello over webrtc — answer like on the bc lane
        })
        conn.on('close', () => {
          if (this.conn === conn) this.conn = null
        })
      })
    } else {
      this.peer = new Peer()
      this.peer.on('error', (e) => this.onError(e.type))
      this.peer.on('open', () => {
        const conn = this.peer!.connect(peerId(pin))
        this.conn = conn
        conn.on('data', (d) => this.handle(d as PartyMsg))
        conn.on('open', () => this.send({ kind: 'hello' }))
        conn.on('close', () => {
          if (this.conn === conn) this.conn = null
        })
      })
    }
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
