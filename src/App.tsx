import { useState } from 'react'
import { MotionConfig } from 'motion/react'
import { useKeyApp } from './useKeyApp'
import { AppView } from './ui/AppView'
import type { Mode } from './ui/shared'

const KEY_MODE = 'identificador:modo'

/** Modo guardado; si no hay, el del sistema. */
function initialMode(): Mode {
  const saved = localStorage.getItem(KEY_MODE)
  if (saved === 'light' || saved === 'dark') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export default function App() {
  const app = useKeyApp()
  const [mode, setMode] = useState<Mode>(initialMode)

  const changeMode = (next: Mode) => {
    setMode(next)
    localStorage.setItem(KEY_MODE, next)
  }

  return (
    <MotionConfig reducedMotion="user">
      <AppView app={app} mode={mode} onModeChange={changeMode} />
    </MotionConfig>
  )
}
