import { useEffect, useRef } from 'react'
import { motion } from 'motion/react'
import { COPY, RANK_LABEL, SECTIONS, speciesOf, useViewing } from './shared'
import { TaxonMedia } from './tree'
import type { KeyApp } from '../useKeyApp'

/** Pantalla de inicio común. Cada tema la viste con las clases `.sp-*`. */
export function StartPanel({ app }: { app: KeyApp }) {
  return (
    <section className="sp">
      <h2>{COPY.startTitle}</h2>
      <p className="sp-lead">{COPY.startLead}</p>
      <ol className="sp-how">
        {COPY.howTo.map((t, i) => (
          <li key={t}>
            <span>{i + 1}</span>
            {t}
          </li>
        ))}
      </ol>
      <button className="btn btn-main" onClick={app.begin}>
        {COPY.start}
      </button>
    </section>
  )
}

/** Resultado común: clasificación, ficha del documento y, si aplica, la lista de especies. Se viste con `.rp-*`. */
export function ResultPanel({ app }: { app: KeyApp }) {
  const r = app.result!
  const title = useRef<HTMLHeadingElement>(null)
  const [viewing, setViewing] = useViewing(r.taxon.scientificName)
  const shown = viewing ?? r.taxon
  const species = r.taxon.rank === 'species' ? [] : speciesOf(app.engine, r.taxon)

  // Accesibilidad: al llegar a un resultado, el foco pasa a su nombre.
  useEffect(() => {
    title.current?.focus()
  }, [shown.scientificName])

  return (
    <motion.section
      className="rp"
      aria-label="Resultado de la identificación"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 140, damping: 20 }}
    >
      <div className="rp-head">
        <nav className="rp-lineage" aria-label={COPY.lineage}>
          {r.lineage.map((t) => (
            <span key={t.scientificName}>
              <i>{t.scientificName}</i>
            </span>
          ))}
        </nav>
        {viewing && (
          <button className="btn btn-link" onClick={() => setViewing(null)}>
            Volver a {r.taxon.scientificName}
          </button>
        )}
        <p className="rp-rank">{RANK_LABEL[shown.rank]}</p>
        <h2 ref={title} tabIndex={-1}>
          <i>{shown.scientificName}</i>
        </h2>
        <p className="rp-meta">
          {shown.author}
          {shown.faoCode ? ` · Código FAO ${shown.faoCode}` : ''}
        </p>
        {shown.note && <p className="rp-note">{shown.note}</p>}
        <TaxonMedia name={shown.scientificName} className="rp-media" />

        {!viewing && r.canContinue && (
          <div className="rp-next">
            <p>
              {COPY.continueText} <i>{r.taxon.scientificName}</i>.
            </p>
            <button className="btn btn-main" onClick={app.enterKey}>
              {COPY.continueKey}
            </button>
          </div>
        )}
        <div className="rp-actions">
          <button className="btn" onClick={app.back}>
            {COPY.back}
          </button>
          <button className="btn" onClick={app.restart}>
            {COPY.restart}
          </button>
        </div>
      </div>

      <div className="rp-sheet">
        {shown.sheet ? (
          <dl>
            {SECTIONS.map(([f, label]) =>
              shown.sheet![f] ? (
                <div key={f}>
                  <dt>{label}</dt>
                  <dd>{shown.sheet![f]}</dd>
                </div>
              ) : null,
            )}
          </dl>
        ) : (
          shown.rank === 'species' && <p className="rp-muted">{COPY.noSheet}</p>
        )}

        {!viewing && !r.canContinue && species.length > 0 && (
          <div className="rp-species">
            <h3>Especies registradas en la guía ({species.length})</h3>
            <p className="rp-muted">{COPY.noKey}</p>
            <ul>
              {species.map((s) => (
                <li key={s.scientificName}>
                  {s.sheet ? (
                    <button className="btn btn-link" onClick={() => setViewing(s)}>
                      <i>{s.scientificName}</i>
                    </button>
                  ) : (
                    <i>{s.scientificName}</i>
                  )}
                  {s.sheet && <b>ficha</b>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </motion.section>
  )
}
