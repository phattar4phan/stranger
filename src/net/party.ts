// Same-device multiplayer over BroadcastChannel: host runs the world,
// guest mirrors it and streams inputs. Works across tabs of one browser.
import type { Snap, RemoteInput, GuestAct } from '../game/engine'

export type PartyMsg =
  | { kind: 'hello' }
  | { kind: 'peer' }
  | { kind: 'input'; input: RemoteInput }
  | { kind: 'act'; act: GuestAct }
  | { kind: 'snap'; snap: Snap }

const chanName = (pin: string) => `stranger-party-${pin}`

export class Party {
  private ch: BroadcastChannel
  onMsg: (m: PartyMsg) => void = () => {}
  onClose: () => void = () => {}

  constructor(
    readonly pin: string,
    readonly role: 'host' | 'guest',
  ) {
    this.ch = new BroadcastChannel(chanName(pin))
    this.ch.onmessage = (e) => this.onMsg(e.data as PartyMsg)
    window.addEventListener('beforeunload', this.bye)
  }

  private bye = () => this.ch.close()

  send(m: PartyMsg) {
    this.ch.postMessage(m)
  }

  destroy() {
    window.removeEventListener('beforeunload', this.bye)
    this.ch.close()
  }
}

export const makePin = () =>
  Math.floor(100000 + Math.random() * 900000).toString()
