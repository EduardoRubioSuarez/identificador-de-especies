export type KeyOption = {
  label: string
  text: string
  /** Número de paso en la misma clave, o nombre científico de un taxón */
  target: string
  inferred: boolean
}

export type KeyNode = {
  id: string
  step: number
  options: KeyOption[]
}

export type Key = {
  id: string
  title: string
  ownerTaxon: string | null
  pages: string
  nodes: KeyNode[]
}

export type Sheet = {
  otherNames: string | null
  vernacular: string | null
  distinctive: string | null
  size: string | null
  habitat: string | null
  fisheries: string | null
}

export type Rank = 'family' | 'subfamily' | 'genus' | 'species'

export type Taxon = {
  id: string
  rank: Rank
  scientificName: string
  author?: string | null
  faoCode?: string | null
  note?: string | null
  parent: string | null
  children: string[]
  keyId?: string
  speciesInArea?: number | null
  sheet?: Sheet
  subgenus?: string
}

/** Dónde está el usuario dentro del árbol. */
export type Position =
  | { kind: 'step'; keyId: string; step: number }
  | { kind: 'result'; taxon: string }

/** Una decisión tomada; guarda la posición desde la que se tomó para poder volver. */
export type HistoryEntry =
  | { kind: 'choice'; from: { keyId: string; step: number }; option: KeyOption }
  | { kind: 'enter-key'; from: { kind: 'result'; taxon: string }; keyId: string }

export type Session = {
  position: Position
  history: HistoryEntry[]
}
