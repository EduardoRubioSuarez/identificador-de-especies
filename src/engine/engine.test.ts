import { describe, expect, it } from 'vitest'
import { createEngine } from './engine'
import type { Session } from './types'

const e = createEngine()

const run = (s: Session, labels: string[]) => labels.reduce((acc, l) => e.choose(acc, l), s)

describe('datos', () => {
  it('todas las opciones apuntan a un paso o taxón existente y el árbol no retrocede', () => {
    for (const k of e.keys) {
      const steps = new Set(k.nodes.map((n) => n.step))
      for (const n of k.nodes) {
        expect(n.options.length).toBeGreaterThanOrEqual(2)
        for (const o of n.options) {
          if (/^\d+$/.test(o.target)) {
            expect(steps.has(Number(o.target)), `${n.id}:${o.label}`).toBe(true)
            expect(Number(o.target), `${n.id}:${o.label} retrocede`).toBeGreaterThan(n.step)
          } else {
            expect(() => e.getTaxon(o.target), `${n.id}:${o.label}`).not.toThrow()
          }
        }
      }
    }
  })

  it('toda clave propia de un taxón existe', () => {
    for (const t of e.taxa) if (t.keyId) expect(() => e.getKey(t.keyId!)).not.toThrow()
  })
})

describe('recorrido', () => {
  it('empieza en el paso 1 de la clave de familias', () => {
    const s = e.start()
    expect(s.position).toEqual({ kind: 'step', keyId: 'familias', step: 1 })
    expect(e.options(s).map((o) => o.label)).toEqual(['1a', '1b'])
  })

  it('llega a una familia siguiendo la clave: Calappidae', () => {
    const s = run(e.start(), ['1b', '2a', '3b', '5b'])
    expect(e.result(s)?.taxon.scientificName).toBe('Calappidae')
  })

  it('de familia pasa a su clave de géneros y llega a una especie con ficha', () => {
    let s = run(e.start(), ['1b', '2a', '3b', '5b'])
    expect(e.result(s)?.canContinue).toBe(true)
    s = e.enterKey(s)
    expect(s.position).toEqual({ kind: 'step', keyId: 'calappidae-generos', step: 1 })
    s = run(s, ['1b', '2b', '3b', '5a', '6b'])
    const r = e.result(s)!
    expect(r.taxon.scientificName).toBe('Hepatus lineatus')
    expect(r.taxon.sheet?.distinctive).toBeTruthy()
    expect(r.lineage.map((t) => t.scientificName)).toEqual(['Calappidae', 'Hepatus', 'Hepatus lineatus'])
  })

  it('familia sin clave propia: el resultado lista especies y no se puede continuar', () => {
    const s = run(e.start(), ['1b', '2b', '6b', '9b', '19a'])
    const r = e.result(s)!
    expect(r.taxon.scientificName).toBe('Majidae')
    expect(r.canContinue).toBe(false)
    expect(r.children.length).toBeGreaterThan(0)
  })

  it('Portunidae: ruta larga hasta Callinectes toxotes', () => {
    let s = e.enterKey(run(e.start(), ['1b', '2b', '6b', '9a', '10b', '11a', '12a']))
    s = run(s, ['1b', '3b', '4b', '5b', '6b', '7b', '8b'])
    expect(e.result(s)?.taxon.scientificName).toBe('Callinectes toxotes')
  })

  it('la clave de familias solo termina en familias, y llega a las 20 familias del documento', () => {
    const reached = new Set<string>()
    const seen = new Set<number>()
    const walk = (step: number) => {
      if (seen.has(step)) return
      seen.add(step)
      for (const o of e.getKey('familias').nodes.find((n) => n.step === step)!.options) {
        if (/^\d+$/.test(o.target)) walk(Number(o.target))
        else reached.add(o.target)
      }
    }
    walk(1)
    for (const name of reached) expect(e.getTaxon(name).rank).toBe('family')
    expect([...reached].sort()).toEqual(e.taxa.filter((t) => t.rank === 'family').map((t) => t.scientificName).sort())
  })
})

describe('retroceso e historial', () => {
  it('back deshace la última decisión y desde el inicio devuelve lo mismo', () => {
    const s0 = e.start()
    expect(e.back(s0)).toBe(s0)
    expect(e.back(e.choose(s0, '1b'))).toEqual(s0)
  })

  it('back desde la primera pantalla de una clave interna vuelve al resultado de la familia', () => {
    const r = run(e.start(), ['1b', '2a', '3b', '5b'])
    expect(e.back(e.enterKey(r))).toEqual(r)
  })

  it('goTo vuelve a un paso anterior, descarta lo posterior y permite otro camino', () => {
    const s = run(e.start(), ['1b', '2a', '3b'])
    const back = e.goTo(s, 1)
    expect(back.position).toEqual({ kind: 'step', keyId: 'familias', step: 2 })
    expect(back.history).toHaveLength(1)
    expect(e.currentNode(e.choose(back, '2b'))?.step).toBe(6)
  })

  it('path describe las decisiones para el panel', () => {
    expect(e.path(run(e.start(), ['1b', '2a'])).map((p) => p.label)).toEqual(['1b', '2a'])
  })

  it('opción inexistente o sin paso activo lanzan error', () => {
    expect(() => e.choose(e.start(), '9z')).toThrow()
    const r = run(e.start(), ['1a'])
    expect(() => e.choose(r, '1a')).toThrow()
    expect(() => e.enterKey(e.start())).toThrow()
  })
})
