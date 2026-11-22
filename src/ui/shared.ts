import { useState } from 'react'
import type { Engine } from '../engine/engine'
import type { Taxon } from '../engine/types'
import type { KeyApp } from '../useKeyApp'

export type Mode = 'light' | 'dark'
export type ThemeProps = { app: KeyApp; mode: Mode; onModeChange: (mode: Mode) => void }

/** Textos comunes a todos los diseños (los tests y la accesibilidad dependen de ellos). */
export const COPY = {
  appName: 'Identificador de Especies',
  identify: 'Identificar cangrejos',
  tagline: 'Cangrejos del Pacífico centro-oriental. Guía FAO, volumen I.',
  startTitle: 'Identifica tu cangrejo',
  startLead:
    'Sigue la clave de la guía FAO paso a paso. En cada pantalla hay dos descripciones: elige la que se parece más a lo que ves.',
  howTo: [
    'Lee las dos opciones del paso.',
    'Elige la que corresponde a tu cangrejo. Puedes volver y corregir.',
    'Al llegar al resultado, lee la ficha de la guía.',
  ],
  start: 'Empezar la clave',
  question: '¿Cuál describe a tu cangrejo?',
  back: 'Volver al paso anterior',
  restart: 'Empezar de nuevo',
  continueKey: 'Continuar con la clave',
  continueText: 'La guía tiene una clave para llegar al género o la especie dentro de',
  trail: 'Camino recorrido',
  lineage: 'Clasificación',
  noKey: 'La guía no trae una clave para llegar a una especie concreta dentro de este grupo.',
  noSheet: 'El documento no incluye una ficha descriptiva de esta especie.',
}

export const SECTIONS: [keyof NonNullable<Taxon['sheet']>, string][] = [
  ['otherNames', 'Otros nombres científicos aún utilizados'],
  ['vernacular', 'Nombres vernáculos'],
  ['distinctive', 'Caracteres distintivos'],
  ['size', 'Talla'],
  ['habitat', 'Hábitat y biología'],
  ['fisheries', 'Pesca y utilización'],
]

export const RANK_LABEL: Record<Taxon['rank'], string> = {
  family: 'Familia',
  subfamily: 'Subfamilia',
  genus: 'Género',
  species: 'Especie',
}

/** Todas las especies que cuelgan de un taxón (recorriendo géneros). */
export function speciesOf(engine: Engine, t: Taxon): Taxon[] {
  if (t.rank === 'species') return [t]
  return t.children.flatMap((c) => speciesOf(engine, engine.getTaxon(c)))
}

export function prefersReducedMotion() {
  // Sin matchMedia (p. ej. en las pruebas) se evitan los retardos de animación.
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/** Especie de la lista que el usuario abrió dentro de un resultado (null = el resultado en sí). */
export function useViewing(resetKey: string) {
  const [state, setState] = useState<{ key: string; taxon: Taxon | null }>({ key: resetKey, taxon: null })
  const viewing = state.key === resetKey ? state.taxon : null
  return [viewing, (taxon: Taxon | null) => setState({ key: resetKey, taxon })] as const
}
