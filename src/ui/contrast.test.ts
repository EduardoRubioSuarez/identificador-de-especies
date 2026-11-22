import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** Lee las variables de color de un bloque de ui.css. */
function tokens(selector: string): Record<string, string> {
  const css = readFileSync('src/ui/ui.css', 'utf-8')
  const start = css.indexOf(selector)
  const body = css.slice(css.indexOf('{', start) + 1, css.indexOf('}', start))
  return Object.fromEntries([...body.matchAll(/--([\w-]+):\s*(#[0-9a-fA-F]{6})/g)].map((m) => [m[1], m[2]]))
}

const lum = (hex: string) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
  const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const ratio = (a: string, b: string) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const light = tokens('.fa {')
const dark = { ...light, ...tokens(".fa[data-mode='dark']") }

describe.each([
  ['claro', light],
  ['oscuro', dark],
])('contraste WCAG AA, modo %s', (_name, t) => {
  it('el texto principal se lee sobre el fondo y sobre las tarjetas (mínimo 7:1)', () => {
    expect(ratio(t.ink, t.bg)).toBeGreaterThanOrEqual(7)
    expect(ratio(t.ink, t.card)).toBeGreaterThanOrEqual(7)
  })
  it('no queda un color "apagado" distinto del texto principal', () => {
    expect(t.muted.toLowerCase()).toBe(t.ink.toLowerCase())
  })
  it('los encabezados de color se leen sobre las tarjetas (mínimo 4.5:1)', () => {
    expect(ratio(t['accent-strong'], t.card)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(t['accent-strong'], t.bg)).toBeGreaterThanOrEqual(4.5)
  })
  it('el texto sobre botones y etiquetas de color se lee (mínimo 4.5:1)', () => {
    expect(ratio(t['on-accent'], t.accent)).toBeGreaterThanOrEqual(4.5)
    expect(ratio(t['on-sun'], t.sun)).toBeGreaterThanOrEqual(4.5)
  })
  it('los bordes de las tarjetas se distinguen del fondo (mínimo 1.5:1)', () => {
    expect(ratio(t.line, t.card)).toBeGreaterThanOrEqual(1.5)
  })
})
