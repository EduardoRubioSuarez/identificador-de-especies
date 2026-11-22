import { describe, expect, it } from 'vitest'
import { createEngine } from './engine'
import type { Taxon } from './types'

const e = createEngine()

const speciesUnder = (name: string): Taxon[] => {
  const t = e.getTaxon(name)
  return t.rank === 'species' ? [t] : t.children.flatMap(speciesUnder)
}

/** Cifras que el propio documento declara (listas de especies por familia, pp. 575 y siguientes). */
describe('los datos coinciden con las cifras del documento', () => {
  it.each([
    ['Calappidae', 14],
    ['Cancridae', 3],
    ['Dorippidae', 8],
    ['Gecarcinidae', 4],
  ])('%s tiene %i especies, como declara la lista de familias', (family, n) => {
    expect(speciesUnder(family)).toHaveLength(n)
  })

  it.each([
    ['Aratus', 1],
    ['Armases', 3],
    ['Sesarma', 4],
    ['Ocypode', 3],
    ['Ethusa', 4],
    ['Ethusina', 4],
  ])('el género %s tiene %i especies (claves y textos del documento)', (genus, n) => {
    expect(speciesUnder(genus)).toHaveLength(n)
  })

  it('las subfamilias de Grapsidae llevan a sus géneros, como nombra la clave', () => {
    expect(e.getTaxon('Plagusiinae').children.sort()).toEqual(['Percnon', 'Plagusia'])
    expect(e.getTaxon('Sesarminae').children.sort()).toEqual(['Aratus', 'Armases', 'Sesarma'])
    expect(e.getTaxon('Varuninae').children).toEqual(['Tetragrapsus'])
    expect(e.getTaxon('Grapsinae').children.sort()).toEqual(['Goniopsis', 'Grapsus'])
    for (const s of ['Plagusiinae', 'Sesarminae', 'Grapsinae', 'Varuninae']) {
      expect(speciesUnder(s).length, s).toBeGreaterThan(0)
      expect(e.getTaxon(s).note, s).toBeTruthy()
    }
  })

  it('cada especie con ficha tiene código FAO y las secciones principales', () => {
    const withSheet = e.taxa.filter((t) => t.sheet)
    expect(withSheet).toHaveLength(27)
    for (const t of withSheet) {
      expect(t.sheet!.distinctive, `${t.scientificName}: caracteres distintivos`).toBeTruthy()
      expect(t.sheet!.size, `${t.scientificName}: talla`).toBeTruthy()
      expect(t.sheet!.vernacular, `${t.scientificName}: nombres vernáculos`).toMatch(/^FAO: Es - .+; Fr - .+; In - .+\.$/)
    }
  })

  it('las fichas no conservan restos de OCR conocidos', () => {
    const bad = /¡|\ufffd|\b(?:iagunares|ciaras|circuios|lateraias|iargas)\b/
    for (const t of e.taxa) for (const [f, v] of Object.entries(t.sheet ?? {})) expect(v ?? '', `${t.scientificName}/${f}`).not.toMatch(bad)
  })
})

/** Correcciones encontradas al comparar cada ficha con la imagen de su página del PDF. */
describe('las fichas coinciden con las páginas del PDF', () => {
  const sheet = (name: string, field: keyof NonNullable<Taxon['sheet']>) => e.getTaxon(name).sheet![field] ?? ''

  it('el género se escribe Cancer, como imprime el documento', () => {
    expect(e.taxa.filter((t) => /C[áa]ncer/.test(t.scientificName) && t.rank === 'genus').map((t) => t.scientificName)).toEqual(['Cancer'])
    expect(e.taxa.some((t) => t.scientificName.includes('Cáncer'))).toBe(false)
    for (const t of e.taxa) for (const v of Object.values(t.sheet ?? {})) expect(v ?? '').not.toContain('Cáncer')
  })

  it('sin letras sueltas separadas de palabras cortas', () => {
    const loose = /(?:^|\s)(?:s u|e s|e n|d e)(?=\s)|\b(?:sti|ios)\b|\bei\b|\bde!/
    for (const t of e.taxa) for (const [f, v] of Object.entries(t.sheet ?? {})) expect(v ?? '', `${t.scientificName}/${f}`).not.toMatch(loose)
  })

  it('frases verificadas una por una en la imagen', () => {
    expect(sheet('Calappa convexa', 'distinctive')).toContain('casi hemisférico, su anchura generalmente')
    expect(sheet('Calappa saussurei', 'distinctive')).toContain('Color: caparazón blanco-crema')
    expect(sheet('Hepatus kossmanni', 'distinctive')).toContain('moderadamente alto')
    expect(sheet('Hepatus lineatus', 'distinctive')).toContain('pequeños círculos (o manchas)')
    expect(sheet('Cardisoma crassum', 'distinctive')).toContain('distancia órbito-frontal')
    expect(sheet('Cardisoma crassum', 'fisheries')).toContain('se comercializa fresco')
    expect(sheet('Cardisoma crassum', 'size')).toBe('Máxima: 13,2 cm de anchura del caparazón (talla máxima conocida).')
    expect(sheet('Cancer antennarius', 'habitat')).toContain('hasta profundidades de unos 40 m')
    expect(sheet('Cancer antennarius', 'fisheries')).toMatch(/comercialmente\.$/)
    expect(sheet('Callinectes arcuatus', 'habitat')).toContain('entre 1 y 65 ‰')
    expect(sheet('Callinectes bellicosus', 'habitat')).toContain('unos 20 m de profundidad')
    expect(sheet('Euphylax robustus', 'distinctive')).toContain('divididos en 4 o 5 dientes')
    expect(sheet('Euphylax robustus', 'distinctive')).toContain('Color: caparazón y parte dorsal')
    expect(sheet('Grapsus grapsus', 'habitat')).toMatch(/^Vive entre las rocas/)
    expect(sheet('Sesarma sulcatum', 'vernacular')).toContain('Anglette poilue')
    expect(sheet('Maiopsis panamensis', 'fisheries')).toContain('langostas (Panulirus)')
    expect(sheet('Stenocionops ovata', 'distinctive')).toContain('igual a 1/7 a 1/12')
    expect(e.getTaxon('Stenocionops ovata').faoCode).toBe('MAJI Steno 1')
    expect(sheet('Ucides occidentalis', 'otherNames')).toContain('Ucides cordatus occidentalis')
    expect(sheet('Ucides occidentalis', 'distinctive')).toContain('Quelípedos del macho')
  })

  it('la ficha de Gecarcinus quadratus termina donde termina en el PDF', () => {
    expect(sheet('Gecarcinus quadratus', 'fisheries')).toMatch(/nivel de subsistencia\.$/)
    expect(sheet('Gecarcinus quadratus', 'vernacular')).toContain('Tombourou à taches blanches')
  })
})

describe('tildes', () => {
  it('las palabras que sin duda llevan tilde la llevan, aunque el documento las imprima sin ella', () => {
    const bad = /\b(?:America|Angulo|circulos|comunmente|lineas|Orbitas|orbitas|raices|tipico)\b/
    for (const t of e.taxa) for (const [f, v] of Object.entries(t.sheet ?? {})) expect(v ?? '', `${t.scientificName}/${f}`).not.toMatch(bad)
    for (const k of e.keys) for (const n of k.nodes) for (const o of n.options) expect(o.text, `${k.id}:${o.label}`).not.toMatch(bad)
  })
})
