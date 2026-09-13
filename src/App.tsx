import { useState } from 'react'
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

export default function App() {
  const [screen, setScreen] = useState<Screen>('load')
  const [party, setParty] = useState<PartySession | null>(null)

  return (
    <div className="h-full w-full bg-black scanlines relative select-none">
      {screen === 'load' && <LoadScreen onDone={() => setScreen('home')} />}
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
          onStart={(pin, name) => {
            setParty({ pin, role: 'host', myName: name })
            setScreen('game')
          }}
          onBack={() => setScreen('mode')}
        />
      )}
      {screen === 'join' && (
        <JoinPartyScreen
          onStart={(pin, name) => {
            setParty({ pin, role: 'guest', myName: name })
            setScreen('game')
          }}
          onBack={() => setScreen('mode')}
        />
      )}
      {screen === 'game' && (
        <GameScreen
          party={party}
          onExit={() => {
            setParty(null)
            setScreen('home')
          }}
        />
      )}
    </div>
  )
}
