import { motion } from 'motion/react'
import { OPTION_IMAGES, TAXON_IMAGES } from '../data/images'
import type { LinkKind, Path } from './treeLinks'

/** Capa SVG con las conexiones. Debe ir dentro de un contenedor con position: relative. */
export function TreeSvg({ paths, className }: { paths: Path[]; className?: string }) {
  const order: Record<LinkKind, number> = { ghost: 0, live: 1, chosen: 2 }
  return (
    <svg className={className ?? 'tree-svg'} aria-hidden="true">
      {[...paths]
        .sort((a, b) => order[a.kind] - order[b.kind])
        .map((p) => (
          <g key={p.id} className={`link link-${p.kind}`}>
            <motion.path
              d={p.d}
              fill="none"
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
            <circle cx={p.x1} cy={p.y1} r={4} />
            <circle cx={p.x2} cy={p.y2} r={4} />
          </g>
        ))}
    </svg>
  )
}

/* ---------- espacio para imágenes ---------- */
export function OptionMedia({ imageKey, label, className = '' }: { imageKey: string; label: string; className?: string }) {
  const src = OPTION_IMAGES[imageKey]
  return (
    <span className={`media ${className}`}>
      {src ? (
        <img src={src} alt={`Figura de la opción ${label}`} loading="lazy" />
      ) : (
        <span className="media-empty" aria-hidden="true">
          {label.slice(-1)}
        </span>
      )}
    </span>
  )
}

export function TaxonMedia({ name, className = '' }: { name: string; className?: string }) {
  const src = TAXON_IMAGES[name]
  return (
    <span className={`media ${className}`}>
      {src ? <img src={src} alt={name} loading="lazy" /> : <span className="media-empty" aria-hidden="true" />}
    </span>
  )
}
