import keysData from '../../data/keys.json'
import taxaData from '../../data/taxa.json'
import type {
  HistoryEntry, Key, KeyNode, KeyOption, Position, Session, Taxon,
} from './types'

export const ROOT_KEY = 'familias'

export type Dataset = { keys: Key[]; taxa: Taxon[] }

export type Engine = ReturnType<typeof createEngine>

export function createEngine(
  data: Dataset = { keys: keysData as unknown as Key[], taxa: taxaData as unknown as Taxon[] },
) {
  const keyById = new Map(data.keys.map((k) => [k.id, k]))
  const nodeIndex = new Map<string, Map<number, KeyNode>>()
  for (const k of data.keys) nodeIndex.set(k.id, new Map(k.nodes.map((n) => [n.step, n])))
  const taxonByName = new Map(data.taxa.map((t) => [t.scientificName, t]))

  const getKey = (id: string): Key => {
    const k = keyById.get(id)
    if (!k) throw new Error(`Clave inexistente: ${id}`)
    return k
  }
  const getTaxon = (name: string): Taxon => {
    const t = taxonByName.get(name)
    if (!t) throw new Error(`Taxón inexistente: ${name}`)
    return t
  }
  const getNode = (keyId: string, step: number): KeyNode => {
    const n = nodeIndex.get(keyId)?.get(step)
    if (!n) throw new Error(`Paso inexistente: ${keyId}:${step}`)
    return n
  }

  const start = (keyId: string = ROOT_KEY): Session => {
    getNode(keyId, 1)
    return { position: { kind: 'step', keyId, step: 1 }, history: [] }
  }

  /** Paso actual, o null si la sesión está en un resultado. */
  const currentNode = (s: Session): KeyNode | null =>
    s.position.kind === 'step' ? getNode(s.position.keyId, s.position.step) : null

  const currentKey = (s: Session): Key | null =>
    s.position.kind === 'step' ? getKey(s.position.keyId) : null

  /** Elige una opción del paso actual (por su etiqueta, p. ej. "3a"). */
  const choose = (s: Session, label: string): Session => {
    const node = currentNode(s)
    if (!node || s.position.kind !== 'step') throw new Error('No hay un paso activo')
    const option = node.options.find((o) => o.label === label)
    if (!option) throw new Error(`Opción inexistente: ${label} en ${node.id}`)
    const from = { keyId: s.position.keyId, step: s.position.step }
    const entry: HistoryEntry = { kind: 'choice', from, option }
    const position: Position = /^\d+$/.test(option.target)
      ? { kind: 'step', keyId: from.keyId, step: Number(option.target) }
      : { kind: 'result', taxon: getTaxon(option.target).scientificName }
    return { position, history: [...s.history, entry] }
  }

  /** Desde un resultado que tiene clave propia, continúa en esa clave. */
  const enterKey = (s: Session): Session => {
    if (s.position.kind !== 'result') throw new Error('No hay un resultado activo')
    const taxon = getTaxon(s.position.taxon)
    if (!taxon.keyId) throw new Error(`${taxon.scientificName} no tiene clave propia`)
    getNode(taxon.keyId, 1)
    const entry: HistoryEntry = {
      kind: 'enter-key',
      from: { kind: 'result', taxon: taxon.scientificName },
      keyId: taxon.keyId,
    }
    return { position: { kind: 'step', keyId: taxon.keyId, step: 1 }, history: [...s.history, entry] }
  }

  const positionBefore = (e: HistoryEntry): Position =>
    e.kind === 'choice' ? { kind: 'step', ...e.from } : e.from

  /** Deshace la última decisión. Sin historial, devuelve la misma sesión. */
  const back = (s: Session): Session => {
    const last = s.history.at(-1)
    if (!last) return s
    return { position: positionBefore(last), history: s.history.slice(0, -1) }
  }

  /** Vuelve al punto en que se tomó la decisión número `index` (0 = la primera) y la descarta. */
  const goTo = (s: Session, index: number): Session => {
    if (index < 0 || index >= s.history.length) throw new Error(`Índice fuera de rango: ${index}`)
    return { position: positionBefore(s.history[index]), history: s.history.slice(0, index) }
  }

  const reset = (): Session => start()

  /** Resultado actual con su contexto: taxón, ruta de familia a especie, hijos y si se puede seguir. */
  const result = (s: Session) => {
    if (s.position.kind !== 'result') return null
    const taxon = getTaxon(s.position.taxon)
    const lineage: Taxon[] = []
    for (
      let t: Taxon | undefined = taxon;
      t;
      t = t.parent ? taxonByName.get(t.parent) : undefined
    ) lineage.unshift(t)
    return {
      taxon,
      lineage,
      children: taxon.children.map(getTaxon),
      canContinue: Boolean(taxon.keyId),
    }
  }

  /** Decisiones tomadas, para el panel de historial. */
  const path = (s: Session) =>
    s.history.map((e, index) =>
      e.kind === 'choice'
        ? { index, label: e.option.label, text: e.option.text, keyId: e.from.keyId }
        : { index, label: '→', text: `Clave de ${e.from.taxon}`, keyId: e.keyId },
    )

  const options = (s: Session): KeyOption[] => currentNode(s)?.options ?? []

  return {
    start, currentNode, currentKey, options, choose, enterKey, back, goTo, reset, result, path,
    getKey, getTaxon, keys: data.keys, taxa: data.taxa,
  }
}
