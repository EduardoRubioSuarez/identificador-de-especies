import { Moon, Sun } from '@phosphor-icons/react'
import type { Mode } from './shared'

type Props = { mode: Mode; onChange: (mode: Mode) => void }

/** Interruptor de tema "Amanecer": cielo ámbar con sol (claro) o noche con luna y estrellas (oscuro). */
export function ThemeSwitch({ mode, onChange }: Props) {
  const dark = mode === 'dark'
  return (
    <button
      className="ts ts-sky"
      role="switch"
      aria-checked={dark}
      aria-label="Tema oscuro"
      onClick={() => onChange(dark ? 'light' : 'dark')}
    >
      <span className="ts-thumb">{dark ? <Moon size={20} weight="fill" /> : <Sun size={20} weight="fill" />}</span>
    </button>
  )
}
