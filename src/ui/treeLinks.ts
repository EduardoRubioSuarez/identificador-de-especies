import { useLayoutEffect, useRef, useState, type RefObject } from 'react'
import type { KeyApp } from '../useKeyApp'

export type LinkKind = 'chosen' | 'ghost' | 'live'
export type Link = { id: string; from: string; to: string; kind: LinkKind }
export type Orientation = 'horizontal' | 'vertical'

/* ---------- identificadores de nodo ---------- */
export const nid = {
  root: 'root',
  option: (index: number, label: string) => `f${index}-${label}`,
  enter: (index: number) => `f${index}`,
  live: (label: string) => `cur-${label}`,
  result: 'res',
}

/** Todas las conexiones del árbol actual: de cada decisión a las dos ramas del paso siguiente. */
export function buildLinks(app: KeyApp): Link[] {
  const links: Link[] = []
  const anchorAfter = (i: number) => {
    const f = app.forks[i]
    return f.kind === 'choice' ? nid.option(f.index, f.chosen) : nid.enter(f.index)
  }
  const parentOf = (i: number) => (i === 0 ? nid.root : anchorAfter(i - 1))

  app.forks.forEach((f, i) => {
    const parent = parentOf(i)
    if (f.kind === 'enter') {
      links.push({ id: `l-${f.index}`, from: parent, to: nid.enter(f.index), kind: 'chosen' })
    } else {
      for (const o of f.options) {
        links.push({
          id: `l-${f.index}-${o.label}`,
          from: parent,
          to: nid.option(f.index, o.label),
          kind: o.label === f.chosen ? 'chosen' : 'ghost',
        })
      }
    }
  })

  const last = app.forks.length === 0 ? nid.root : anchorAfter(app.forks.length - 1)
  if (app.node) {
    for (const o of app.node.options) {
      links.push({ id: `l-cur-${o.label}`, from: last, to: nid.live(o.label), kind: 'live' })
    }
  } else if (app.result) {
    links.push({ id: 'l-res', from: last, to: nid.result, kind: 'chosen' })
  }
  return links
}

/* ---------- medición y trazado de conexiones ---------- */
export type Path = { id: string; d: string; kind: LinkKind; x1: number; y1: number; x2: number; y2: number }

/**
 * Calcula cada conexión a partir de la posición real de las tarjetas (atributo data-node),
 * de modo que siempre salgan y lleguen exactamente al borde de la tarjeta.
 */
export function useLinkPaths(
  container: RefObject<HTMLElement | null>,
  links: Link[],
  orientation: Orientation,
  signature: string,
) {
  const [paths, setPaths] = useState<Path[]>([])
  const last = useRef('')

  useLayoutEffect(() => {
    const root = container.current
    if (!root) return
    let raf = 0
    let stopAt = 0

    const compute = () => {
      const box = root.getBoundingClientRect()
      const out: Path[] = []
      for (const l of links) {
        const a = root.querySelector<HTMLElement>(`[data-node="${l.from}"]`)
        const b = root.querySelector<HTMLElement>(`[data-node="${l.to}"]`)
        if (!a || !b) continue
        const ar = a.getBoundingClientRect()
        const br = b.getBoundingClientRect()
        let x1: number, y1: number, x2: number, y2: number, d: string
        if (orientation === 'horizontal') {
          x1 = ar.right - box.left
          y1 = ar.top + ar.height / 2 - box.top
          x2 = br.left - box.left
          y2 = br.top + br.height / 2 - box.top
          const k = Math.max(36, (x2 - x1) * 0.5)
          d = `M${x1} ${y1} C${x1 + k} ${y1}, ${x2 - k} ${y2}, ${x2} ${y2}`
        } else {
          x1 = ar.left + ar.width / 2 - box.left
          y1 = ar.bottom - box.top
          x2 = br.left + br.width / 2 - box.left
          y2 = br.top - box.top
          const k = Math.max(30, (y2 - y1) * 0.5)
          d = `M${x1} ${y1} C${x1} ${y1 + k}, ${x2} ${y2 - k}, ${x2} ${y2}`
        }
        out.push({ id: l.id, d, kind: l.kind, x1, y1, x2, y2 })
      }
      const key = JSON.stringify(out.map((p) => [p.id, p.d]))
      if (key !== last.current) {
        last.current = key
        setPaths(out)
      }
    }

    // Se recalcula durante un rato tras cada cambio para seguir las animaciones de las tarjetas.
    const loop = () => {
      compute()
      if (performance.now() < stopAt) raf = requestAnimationFrame(loop)
    }
    const kick = (ms = 900) => {
      stopAt = performance.now() + ms
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(loop)
    }

    kick()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(() => kick(300)) : null
    ro?.observe(root)
    const onResize = () => kick(300)
    window.addEventListener('resize', onResize)
    return () => {
      cancelAnimationFrame(raf)
      ro?.disconnect()
      window.removeEventListener('resize', onResize)
    }
    // `signature` resume el contenido; los enlaces se vuelven a leer cuando cambia.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, orientation, container])

  return paths
}

export const linksSignature = (links: Link[]) => links.map((l) => `${l.id}:${l.kind}`).join('|')

