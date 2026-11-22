"""Extrae las fichas de especies del texto del documento y limpia los artefactos del OCR.
Entrada: data/raw/cangrejos_layout.txt, data/src/fichas_manuales.json (fichas transcritas a mano desde la imagen)
Salida:  data/raw/fichas.json, data/raw/fichas_revision.txt (lo que quedó sospechoso)
"""
import re, json, collections

src = open('data/raw/cangrejos_layout.txt', encoding='utf-8').read().split('\n')

CODE = r'([A-Z]{2,6}\s+[A-Z][a-z]+\s+\d+)'
HDR = re.compile(r'^(?!\s*Otros)\s*(?:' + CODE + r'\s+)?([A-ZÁÉÍÓÚ][a-záéíóúñ]+(?:\s+\([A-Z][a-z]+\))?\s+[a-z]+\s+.*?(?:\d\s?){4}\)?)\s*(\S.*)?$')
LABELS = ['Otros nombres científicos aún utilizados:', 'Nombres vernáculos:', 'Caracteres distintivos:',
          'Talla:', 'Hábitat y biología:', 'Pesca y utilización:']
# rótulos tolerantes al OCR: letras espaciadas ("P e s c a y utilización"), tildes perdidas y ":" leído como "1." o ";"
ACC = {'á': '[áa]', 'é': '[ée]', 'í': '[íi]', 'ó': '[óo]', 'ú': '[úu]'}


def label_rx(lab):
    body = lab.rstrip(':').replace(' ', '')
    return re.compile(r'\s*'.join(ACC.get(c, re.escape(c)) for c in body) + r'\s*[:.1;]')


LABEL_RE = [(lab, label_rx(lab)) for lab in LABELS]
NOISE = re.compile(r'^\s*(\d{3}\s+.*Cangrejos|.*Cangrejos\s*\d{3}|[A-Z][a-z]+idae\s+\d{3}|\d{3}\s+[A-Z][a-z]+idae)\s*$')
# donde termina una ficha: encabezado de familia/subfamilia, claves, listas, texto general de la familia
STOP = re.compile(r'^\s*(?:[A-ZÁÉÍÓÚ0-9]{4,}(?:DAE|NAE)\b|Clave para|Lista de|Familias de aspecto similar|Consideraciones|Subfamilia\b)')

lines = [l for l in src if not NOISE.match(l)]
starts = []
for i, l in enumerate(lines):
    m = HDR.match(l)
    if not m: continue
    if re.search(r'Nombres vern|Otros nombres científicos', ' '.join(lines[i + 1:i + 4])):
        starts.append((i, m))


def squash_name(t):
    return re.sub(r'\b(?:[A-Za-zñé] ){2,}[A-Za-zñé]\b', lambda m: m.group(0).replace(' ', ''), t)


def raw_clean(t):
    t = re.sub(r'-\n\s*', '', t)
    return re.sub(r'\s+', ' ', t).strip()


# ---------- vocabulario para separar palabras fusionadas por el OCR ----------
vocab = collections.Counter()
for l in lines:
    for w in re.findall(r'[a-záéíóúñü]{2,}', l.lower()):
        vocab[w] += 1
SHORT = {'y', 'a', 'o', 'e', 'u'}
WORDS = {w for w, c in vocab.items() if c >= 3} | {'de', 'la', 'el', 'en', 'no', 'un', 'su', 'se', 'es', 'al', 'lo', 'los', 'las',
                                                  'con', 'por', 'una', 'más', 'sus', 'del', 'que', 'ya', 'si'}
WORDS |= SHORT


def segment(s):
    """Separa una cadena pegada en palabras del vocabulario (mínimo de palabras). None si no se puede."""
    n = len(s)
    best = [None] * (n + 1)
    best[0] = []
    for i in range(1, n + 1):
        for j in range(max(0, i - 15), i):
            if best[j] is not None and s[j:i] in WORDS:
                cand = best[j] + [s[j:i]]
                if best[i] is None or len(cand) < len(best[i]):
                    best[i] = cand
    return best[n]


REVIEW = []


def unspace(text, who):
    """Une las letras espaciadas ("v e c e s" -> "veces"); si quedan varias palabras pegadas, las separa."""
    def fix(m):
        run = m.group(0)
        word = run.replace(' ', '')
        if word.lower() in WORDS or len(word) <= 3 and word.lower() in WORDS:
            return word
        seg = segment(word.lower())
        if seg and len(seg) > 1:
            out = ' '.join(seg)
            return out[0].upper() + out[1:] if word[0].isupper() else out
        return word
    return re.sub(r'(?:\b[A-Za-záéíóúñ] ){2,}[A-Za-záéíóúñ]\b', fix, text)


def clean_text(t, who):
    t = unspace(t, who)
    for pat, rep in POINT_FIXES + OCR_FIXES: t = re.sub(pat, rep, t)
    t = t.replace('—>', ' ').replace('->', ' ')
    t = re.sub(r'[{]', '(', t)
    t = re.sub(r'[}\\|^_]', ' ', t)
    t = re.sub(r'(\d)\s?%[o>0]S?(?=\W|$)', r'\1 ‰', t)
    t = re.sub(r'\s+', ' ', t).strip()
    for pat, rep in OCR_FIXES: t = re.sub(pat, rep, t)   # segunda pasada: restos que quedan al final tras quitar símbolos
    return t.strip()


def trim_tail(t):
    """Quita rótulos de figuras o códigos que quedaron pegados tras la última oración de la ficha."""
    cut = t.rfind('. ')
    if cut < 0: return t
    tail = t[cut + 2:]
    if '. ' not in tail and ('(según' in tail or re.match(r'^[A-Z]{3,6} \S+ \d+$', tail.strip()) or len(tail) > 60 and not tail.rstrip().endswith('.')):
        return t[:cut + 1]
    return t


POINT_FIXES = [
    (r'\s*«mi»:', ''), (r'\b4• ', ''), (r"\s*lio- H 100' ", ' '),
    (r'\s*•\s*1\s*\.\s*(?=Durante)', ' '), (r'\s*•\s*', ' '),
    (r'\[ocalmente', 'localmente'), (r'\bp.ra depositar', 'para depositar'),
    (r'(\d) (\d)(?= a \d)', r'\1\2'),
    (r"\s,a-\s+V\s", ' '), (r"\bm\s+(?=ocasionalmente)", ''), (r"\s*I O'W l\(.*?93'", ''),
    (r'"Snow % crab"', '"Snow crab"'),
]


OCR_FIXES = json.load(open('data/src/ocr_correcciones.json', encoding='utf-8'))


def clean_vernacular(v):
    v = v.split('Nacional:')[0]
    for pat, rep in OCR_FIXES: v = re.sub(pat, rep, v)
    v = re.sub(r'\bE\s+s\b', 'Es', v)
    v = re.sub(r'\bFA.\s*:', 'FAO:', v)
    v = v.replace(';.', ';').replace('Migralne', 'Migraine')
    m = re.search(r'(FAO:\s*Es\s*-.*?;\s*Fr\s*-.*?;\s*In\s*-[^.]*\.)', v)
    return (m.group(1) if m else v).strip()


EXTRAS = {}
out = []
for k, (i, m) in enumerate(starts):
    end = starts[k + 1][0] if k + 1 < len(starts) else len(lines)
    full_end = end
    for j in range(i + 1, end):
        if STOP.match(lines[j]):
            end = full_end = j
            break
        if re.match(r'^\s*Otras especies presentes', lines[j]):
            end = j
            full_end = next((q for q in range(j + 1, full_end) if STOP.match(lines[q])), full_end)
            EXTRAS[' '.join(lines[i].split()[:2])] = raw_clean('\n'.join(lines[j:full_end]))
            break
    block = '\n'.join(lines[i + 1:end])
    name_line = squash_name(m.group(2))
    code = (m.group(1) or '').strip()
    if not code and m.group(3):
        cm = re.match(r'^' + CODE, m.group(3).strip())
        code = cm.group(1) if cm else m.group(3).strip()
    if not code and i > 0:
        pm = re.match(r'^\s*' + CODE + r'\s*$', lines[i - 1])
        if pm: code = pm.group(1)
    parts = name_line.split(' ')
    n = 3 if len(parts) > 2 and parts[1].startswith('(') else 2
    sci = ' '.join(parts[:n]).replace('Cáncer', 'Cancer')   # el documento imprime Cancer, sin tilde
    author = ' '.join(parts[n:])
    author = re.sub(r'\s+,', ',', re.sub(r'\b(d) (e)\b', r'\1\2', author)).replace('( ', '(').replace(' )', ')')
    # posiciones de rótulos (tolerantes a letras espaciadas)
    idx = []
    for lab, rx in LABEL_RE:
        mm = rx.search(block)
        if mm: idx.append((mm.start(), mm.end(), lab))
    idx.sort()
    sections = {}
    for j, (p, e, lab) in enumerate(idx):
        stop = idx[j + 1][0] if j + 1 < len(idx) else len(block)
        text = raw_clean(block[e:stop])
        val = clean_vernacular(text) if lab.startswith('Nombres') else clean_text(text, f'{sci}/{lab}')
        if ' Otras especies presentes' in val:   # texto de otra(s) especie(s) que sigue a la ficha: se guarda aparte
            val, extra = val.split(' Otras especies presentes', 1)
            EXTRAS.setdefault(sci, 'Otras especies presentes' + extra)
        sections[lab.rstrip(':')] = trim_tail(val) if lab.startswith('Pesca') else val
    out.append({'scientificName': sci, 'author': author, 'faoCode': code or None, 'sections': sections})

json.dump(EXTRAS, open('data/raw/otras_especies.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# fichas transcritas a mano
for f in json.load(open('data/src/fichas_manuales.json', encoding='utf-8')):
    out = [o for o in out if o['scientificName'] != f['scientificName']] + [f]

best = {}
for o in out:
    key = o['scientificName']
    if key not in best or len(o['sections']) > len(best[key]['sections']): best[key] = o
out = list(best.values())
json.dump(out, open('data/raw/fichas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)

# revisión de lo que quede sospechoso
rev = []
for o in out:
    for sec, v in o['sections'].items():
        if len(v) > 1100: rev.append(f"LARGA ({len(v)}): {o['scientificName']} / {sec}")
        for mm in re.finditer(r'[^\w\s.,;:()\-/\'"‰%°=*¿?¡!]', v):
            rev.append(f"SÍMBOLO '{mm.group(0)}': {o['scientificName']} / {sec}: …{v[max(0, mm.start() - 30):mm.end() + 30]}…")
        for mm in re.finditer(r'\b\w*[a-záéíóúñ][A-ZÁÉÍÓÚ]\w*\b', v):
            rev.append(f"MAYÚSCULA INTERNA '{mm.group(0)}': {o['scientificName']} / {sec}")
        for mm in re.finditer(r'\b(?:[A-Za-z] ){2,}[A-Za-z]\b', v):
            rev.append(f"LETRAS ESPACIADAS '{mm.group(0)}': {o['scientificName']} / {sec}")
open('data/raw/fichas_revision.txt', 'w', encoding='utf-8').write('\n'.join(rev) + '\n')
print(len(out), 'fichas;', len(rev), 'avisos de revisión')
