"""Compara los datos de la aplicación (data/keys.json, data/taxa.json) con el texto del PDF.

Uso (requiere rapidfuzz):  python scripts/verify_pdf.py
Escribe data/verificacion.txt con el detalle y muestra un resumen.

Comprobaciones:
  A. el texto de cada opción de cada clave aparece en el PDF
  B. el destino de cada opción (otro paso o un taxón) aparece junto a su texto en el PDF
  C. cada sección de cada ficha aparece en el PDF
  D. cada especie de las listas aparece en el PDF con su autor
"""
import json
import re
import unicodedata
from rapidfuzz import fuzz

RAW = open('data/raw/cangrejos_layout.txt', encoding='utf-8').read()


def compact_with_map(text):
    """Texto sin acentos, minúsculas y solo letras/dígitos, con el índice original de cada carácter."""
    out, idx = [], []
    for i, ch in enumerate(text):
        d = unicodedata.normalize('NFD', ch)
        d = ''.join(c for c in d if not unicodedata.combining(c)).lower()
        for c in d:
            if c.isalnum():
                out.append(c)
                idx.append(i)
    return ''.join(out), idx


def compact(text):
    return compact_with_map(text)[0]


PDF, PDF_IDX = compact_with_map(RAW)
keys = json.load(open('data/keys.json', encoding='utf-8'))
taxa = {t['scientificName']: t for t in json.load(open('data/taxa.json', encoding='utf-8'))}
report = []


def best(needle):
    """Mejor coincidencia aproximada de `needle` dentro del PDF: (puntaje 0-100, inicio, fin)."""
    n = compact(needle)
    a = fuzz.partial_ratio_alignment(n, PDF, score_cutoff=0)
    return a.score, a.dest_start, a.dest_end


# ---------- A y B: opciones y destinos ----------
a_bad, b_bad, total = [], [], 0
a_scores = []
for k in keys:
    for node in k['nodes']:
        for o in node['options']:
            total += 1
            score, s, e = best(o['text'])
            a_scores.append(score)
            oid = f"{k['id']}:{o['label']}"
            if score < 90:
                a_bad.append((oid, round(score, 1), o['text'][:70]))
            # B: destino cerca del final del texto de la opción
            window_raw = RAW[PDF_IDX[min(e, len(PDF_IDX) - 1)]: PDF_IDX[min(e, len(PDF_IDX) - 1)] + 700]
            if o['target'].isdigit():
                found = re.search(r'(?<!\d)' + o['target'] + r'(?!\d)', window_raw[:260]) is not None
                if not found:
                    b_bad.append((oid, f"paso {o['target']}", 'el número no se lee junto a la opción (OCR)'))
            else:
                name = o['target'].split()[-1] if ' ' in o['target'] else o['target']
                sc = fuzz.partial_ratio(compact(name), compact(window_raw[:700]))
                if sc < 85:
                    b_bad.append((oid, o['target'], f'no aparece junto a la opción (puntaje {sc:.0f})'))

report.append(f'A. Texto de las opciones: {total - len(a_bad)} de {total} coinciden con el PDF (puntaje mínimo 90). '
              f'Promedio {sum(a_scores) / len(a_scores):.1f}.')
for x in a_bad:
    report.append(f'   revisar {x[0]} ({x[1]}): {x[2]}')
report.append(f'B. Destinos: {total - len(b_bad)} de {total} se leen junto a su opción en el PDF.')
for x in b_bad:
    report.append(f'   revisar {x[0]} -> {x[1]}: {x[2]}')

# ---------- C: fichas ----------
c_bad, c_total = [], 0
for t in taxa.values():
    for f, v in (t.get('sheet') or {}).items():
        if not v:
            continue
        c_total += 1
        score, _, _ = best(v)
        if score < 88:
            c_bad.append((t['scientificName'], f, round(score, 1)))
report.append(f'C. Secciones de fichas: {c_total - len(c_bad)} de {c_total} coinciden con el PDF (puntaje mínimo 88).')
for x in c_bad:
    report.append(f'   revisar {x[0]} / {x[1]} ({x[2]})')

# ---------- D: listas de especies ----------
d_bad, d_total = [], 0
for t in taxa.values():
    if t['rank'] != 'species':
        continue
    d_total += 1
    needle = t['scientificName'] + ' ' + (t.get('author') or '')
    score, _, _ = best(needle)
    if score < 85:
        d_bad.append((t['scientificName'], t.get('author'), round(score, 1)))
report.append(f'D. Especies con autor: {d_total - len(d_bad)} de {d_total} aparecen en el PDF (puntaje mínimo 85).')
for x in d_bad:
    report.append(f'   revisar {x[0]} {x[1]} ({x[2]})')

open('data/verificacion.txt', 'w', encoding='utf-8').write('\n'.join(report) + '\n')
print('\n'.join(report))
