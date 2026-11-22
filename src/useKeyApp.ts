import { useMemo, useState } from 'react'
import { createEngine } from './engine/engine'
import type { Session } from './engine/types'

export const engine = createEngine()

/** Una decisión ya tomada, con las dos ramas que existían en ese paso. */
export type Fork =
  | {
      kind: 'choice'
      index: number
      keyId: string
      step: number
      chosen: string
      options: { label: string; text: string }[]
    }
  | { kind: 'enter'; index: number; keyId: string; taxon: string }

/** Estado de la aplicación, independiente del diseño. Lo comparten todos los temas. */
export function useKeyApp() {
  const [home, setHome] = useState(true)
  const [started, setStarted] = useState(false)
  const [session, setSession] = useState<Session>(() => engine.start())

  const node = engine.currentNode(session)
  const keyInfo = engine.currentKey(session)
  const result = engine.result(session)
  const path = useMemo(() => engine.path(session), [session])

  const forks = useMemo<Fork[]>(
    () =>
      session.history.map((e, index) => {
        if (e.kind === 'enter-key') return { kind: 'enter', index, keyId: e.keyId, taxon: e.from.taxon }
        const stepNode = engine.getKey(e.from.keyId).nodes.find((n) => n.step === e.from.step)!
        return {
          kind: 'choice',
          index,
          keyId: e.from.keyId,
          step: e.from.step,
          chosen: e.option.label,
          options: stepNode.options.map((o) => ({ label: o.label, text: o.text })),
        }
      }),
    [session],
  )

  return {
    engine,
    home,
    openKey: () => setHome(false),
    goHome: () => setHome(true),
    started,
    begin: () => setStarted(true),
    restart: () => {
      setSession(engine.reset())
      setStarted(false)
    },
    session,
    node,
    keyInfo,
    result,
    path,
    forks,
    historyLength: session.history.length,
    canGoBack: session.history.length > 0,
    choose: (label: string) => setSession((s) => engine.choose(s, label)),
    back: () => setSession((s) => engine.back(s)),
    goTo: (index: number) => setSession((s) => engine.goTo(s, index)),
    /** Vuelve a un paso anterior y toma la otra rama. */
    switchBranch: (index: number, label: string) =>
      setSession((s) => engine.choose(engine.goTo(s, index), label)),
    enterKey: () => setSession((s) => engine.enterKey(s)),
  }
}

export type KeyApp = ReturnType<typeof useKeyApp>
