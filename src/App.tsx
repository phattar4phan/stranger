import { useEffect, useState } from 'react'
import LoadScreen from './components/LoadScreen'
import HomeScreen from './components/HomeScreen'
import AboutScreen from './components/AboutScreen'
import GameScreen from './components/GameScreen'
import ModeScreen from './components/ModeScreen'
import CreatePartyScreen from './components/CreatePartyScreen'
import JoinPartyScreen from './components/JoinPartyScreen'

type Screen = 'load' | 'home' | 'about' | 'mode' | 'create' | 'join' | 'game'

export interface PartySession {
  pin: string
  role: 'host' | 'guest'
  myName: string
}

// shareable link format: /pin=<pin>?player=<1|2>&names=<name>
export const shareUrl = (pin: string, player: 1 | 2, name: string) =>
  `/pin=${pin}?player=${player}&names=${encodeURIComponent(name)}`

const parseLink = (): { pin: string; player: 1 | 2; name: string } | null => {
  const m = window.location.pathname.match(/pin=(\d+)/)
  const q = new URLSearchParams(window.location.search)
  const pin = m?.[1] ?? q.get('pin') ?? ''
  const player = q.get('player') === '2' ? 2 : 1
  const name = decodeURIComponent(q.get('names') ?? '')
  if (!/^\d{6}$/.test(pin)) return null
  return { pin, player, name }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('load')
  const [party, setParty] = useState<PartySession | null>(null)
  const [link] = useState(parseLink)

  const goHome = () => {
    setParty(null)
    window.history.replaceState(null, '', '/')
    setScreen('home')
  }

  // deep link: skip straight into create/join with the PIN prefilled
  useEffect(() => {
    if (link && screen === 'load') {
      setScreen(link.player === 2 ? 'join' : 'create')
    }
  }, [link, screen])

  return (
    <div className="h-full w-full bg-black scanlines relative select-none">
      {screen === 'load' && <LoadScreen onDone={() => setScreen(link ? (link.player === 2 ? 'join' : 'create') : 'home')} />}
      {screen === 'home' && (
        <HomeScreen
          onPlay={() => setScreen('mode')}
          onAbout={() => setScreen('about')}
        />
      )}
      {screen === 'about' && <AboutScreen onBack={() => setScreen('home')} />}
      {screen === 'mode' && (
        <ModeScreen
          onMulti={() => setScreen('create')}
          onJoin={() => setScreen('join')}
          onBack={() => setScreen('home')}
        />
      )}
      {screen === 'create' && (
        <CreatePartyScreen
          initialPin={link?.pin}
          initialName={link?.player === 1 ? link.name : ''}
          onStart={(pin, name) => {
            setParty({ pin, role: 'host', myName: name })
            window.history.replaceState(null, '', shareUrl(pin, 1, name))
            setScreen('game')
          }}
          onBack={goHome}
        />
      )}
      {screen === 'join' && (
        <JoinPartyScreen
          initialPin={link?.player === 2 ? link.pin : ''}
          initialName={link?.player === 2 ? link.name : ''}
          onStart={(pin, name) => {
            setParty({ pin, role: 'guest', myName: name })
            window.history.replaceState(null, '', shareUrl(pin, 2, name))
            setScreen('game')
          }}
          onBack={goHome}
        />
      )}
      {screen === 'game' && <GameScreen party={party} onExit={goHome} />}
    </div>
  )
}
