import { describe, expect, it } from 'vitest'
import { createEngine } from './engine'
import type { Session } from './types'

const e = createEngine()

/** Recorre todas las rutas posibles de todas las claves y devuelve cada resultado con el camino que lo alcanza. */
function explore() {
  const results = new Map<string, string[]>()
  const walk = (s: Session, trail: string[]) => {
    if (s.position.kind === 'result') {
      const name = s.position.taxon
      if (!results.has(name)) results.set(name, trail)
      if (e.result(s)!.canContinue) walk(e.enterKey(s), [...trail, '→'])
      return
    }
    for (const o of e.options(s)) walk(e.choose(s, o.label), [...trail, o.label])
  }
  walk(e.start(), [])
  return results
}

describe('alcance del árbol', () => {
  const results = explore()

  it('todas las familias del documento tienen una ruta desde la raíz', () => {
    const families = e.taxa.filter((t) => t.rank === 'family').map((t) => t.scientificName)
    for (const f of families) expect(results.has(f), `familia ${f}`).toBe(true)
  })

  it('cada taxón del dataset se alcanza por la clave o aparece en la lista de un resultado alcanzado', () => {
    const covered = new Set<string>()
    const cover = (name: string) => {
      covered.add(name)
      for (const c of e.getTaxon(name).children) cover(c)
    }
    for (const name of results.keys()) cover(name)
    const missing = e.taxa.filter((t) => !covered.has(t.scientificName)).map((t) => t.scientificName)
    expect(missing).toEqual([])
  })

  it('toda especie con ficha que aparece en una clave se alcanza como resultado directo', () => {
    const inKeys = new Set<string>()
    for (const k of e.keys) for (const n of k.nodes) for (const o of n.options) if (!/^\d+$/.test(o.target)) inKeys.add(o.target)
    const withSheet = [...inKeys].filter((n) => e.getTaxon(n).rank === 'species' && e.getTaxon(n).sheet)
    expect(withSheet.length).toBeGreaterThanOrEqual(15)
    for (const n of withSheet) expect(results.has(n), n).toBe(true)
  })

  it('las rutas de especies conocidas coinciden con lo que dice la clave impresa', () => {
    // Rutas comprobadas a mano contra el documento (pp. 567-621)
    const known: Record<string, string[]> = {
      'Hepatus lineatus': ['1b', '2a', '3b', '5b', '→', '1b', '2b', '3b', '5a', '6b'],
      'Callinectes toxotes': ['1b', '2b', '6b', '9a', '10b', '11a', '12a', '→', '1b', '3b', '4b', '5b', '6b', '7b', '8b'],
      'Gecarcinus planatus': ['1b', '2b', '6b', '9a', '10b', '11b', '16b', '17a', '18b', '→', '1b', '2b', '3a'],
      'Cancer antennarius': ['1b', '2b', '6b', '9a', '10b', '11a', '12b', '13a', '14b', '→', '1b', '2b'],
      'Calappa saussurei': ['1b', '2a', '3b', '5b', '→', '1b', '2b', '3a', '4b'],
    }
    for (const [name, path] of Object.entries(known)) expect(results.get(name), name).toEqual(path)
  })
})
