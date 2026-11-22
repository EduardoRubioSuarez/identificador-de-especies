import { useEffect, useRef } from 'react'
import '@fontsource-variable/figtree/wght.css'
import './ui.css'
import { COPY, type ThemeProps } from './shared'
import { ThemeSwitch } from './ThemeSwitch'
import { ResultPanel, StartPanel } from './parts'
import { OptionMedia, TreeSvg } from './tree'
import { buildLinks, linksSignature, nid, useLinkPaths } from './treeLinks'

/** Foco y mapa: la decisión actual se ve grande a la izquierda; el árbol completo queda como mapa a la derecha. */
export function AppView({ app, mode, onModeChange }: ThemeProps) {
  const map = useRef<HTMLDivElement>(null)
  const question = useRef<HTMLHeadingElement>(null)
  const links = buildLinks(app)
  const sig = linksSignature(links)
  const paths = useLinkPaths(map, links, 'vertical', sig)

  // Accesibilidad: tras elegir, el foco pasa a la nueva pregunta para que quien usa teclado o lector no lo pierda.
  const stepId = app.node?.id
  useEffect(() => {
    if (stepId && app.started && !app.home) question.current?.focus()
  }, [stepId, app.started, app.home])

  return (
    <div className="fa" data-mode={mode}>
      {app.home ? (
        <>
          <header className="fa-bar fa-bar-end">
            <ThemeSwitch mode={mode} onChange={onModeChange} />
          </header>
          <main className="fa-home">
            <h1>{COPY.appName}</h1>
            <button className="btn btn-main big" onClick={app.openKey}>
              {COPY.identify}
            </button>
          </main>
        </>
      ) : (
        <>
      <header className="fa-bar">
        <h1>
          <button className="fa-title" onClick={app.goHome} title="Volver a la pantalla inicial">
            {COPY.appName}
          </button>
        </h1>
        <div className="fa-bar-actions">
          <ThemeSwitch mode={mode} onChange={onModeChange} />
          {app.started && (
            <button className="btn" onClick={app.restart}>
              {COPY.restart}
            </button>
          )}
        </div>
      </header>

      {!app.started && (
        <main className="fa-start">
          <StartPanel app={app} />
        </main>
      )}

      {app.started && (
        <div className="fa-layout">
          <main className="fa-main">
            {app.node && app.keyInfo && (
              <section aria-labelledby="fa-q">
                <p className="fa-key">{app.keyInfo.title}</p>
                <h2 id="fa-q" ref={question} tabIndex={-1}>
                  <span className="fa-step">Paso {app.node.step}</span> {COPY.question}
                </h2>
                <div className="fa-options">
                  {app.node.options.map((o) => (
                    <button
                      key={o.label}
                      data-option={o.label}
                      className="fa-option"
                      onClick={() => app.choose(o.label)}
                    >
                      <OptionMedia imageKey={`${app.keyInfo!.id}:${o.label}`} label={o.label} className="fa-media" />
                      <span className="fa-option-body">
                        <span className="fa-chip">{o.label}</span>
                        <span className="fa-option-text">{o.text}</span>
                      </span>
                    </button>
                  ))}
                </div>
                {app.canGoBack && (
                  <button className="btn" onClick={app.back}>
                    {COPY.back}
                  </button>
                )}
              </section>
            )}
            {app.result && <ResultPanel app={app} />}
          </main>

          <aside className="fa-aside" aria-label={COPY.trail}>
            <h2>Tu árbol</h2>
            <div className="fa-map" ref={map}>
              <TreeSvg paths={paths} />
              <div className="fa-mrow">
                <span className="fa-mroot" data-node={nid.root}>
                  Inicio
                </span>
              </div>
              {app.forks.map((f) =>
                f.kind === 'choice' ? (
                  <div className="fa-mrow" key={f.index}>
                    {f.options.map((o) => {
                      const chosen = o.label === f.chosen
                      return (
                        <button
                          key={o.label}
                          data-past=""
                          data-node={nid.option(f.index, o.label)}
                          className={`fa-mnode ${chosen ? 'is-chosen' : 'is-ghost'}`}
                          title={o.text}
                          aria-label={`${chosen ? 'Volver al paso' : 'Cambiar a la rama'} ${o.label}`}
                          onClick={() => (chosen ? app.goTo(f.index) : app.switchBranch(f.index, o.label))}
                        >
                          <b>{o.label}</b>
                          <span>{o.text}</span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="fa-mrow" key={f.index}>
                    <button
                      data-past=""
                      data-node={nid.enter(f.index)}
                      className="fa-menter"
                      onClick={() => app.goTo(f.index)}
                      aria-label={`Volver a la clave de ${f.taxon}`}
                    >
                      Clave de <i>{f.taxon}</i>
                    </button>
                  </div>
                ),
              )}
              {app.node && (
                <div className="fa-mrow">
                  {app.node.options.map((o) => (
                    <span key={o.label} className="fa-mnode is-live" data-node={nid.live(o.label)}>
                      <b>{o.label}</b>
                      <span>Elige aquí</span>
                    </span>
                  ))}
                </div>
              )}
              {app.result && (
                <div className="fa-mrow">
                  <span className="fa-mend" data-node={nid.result}>
                    <i>{app.result.taxon.scientificName}</i>
                  </span>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
        </>
      )}

    </div>
  )
}
