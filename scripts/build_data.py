"""Construye data/keys.json y data/taxa.json a partir de data/src/claves.txt y data/raw/fichas.json.
Valida el árbol y escribe data/reporte.txt. Uso: python -I scripts/build_data.py
"""
import json, re, sys, unicodedata

ROOT = 'data/'
FAMILY_PREFIX = {'CAL': 'Calappidae', 'CAN': 'Cancridae', 'DORIP': 'Dorippidae', 'GECAR': 'Gecarcinidae',
                 'GRAPS': 'Grapsidae', 'MAJI': 'Majidae', 'OCYP': 'Ocypodidae', 'PORT': 'Portunidae',
                 'PORTE': 'Portunidae', 'XANTH': 'Xanthidae'}
# Correcciones de OCR verificadas contra el texto del documento
FIX_NAME = {'Euphylax robustos': 'Euphylax robustus'}
FIX_AUTHOR = [(r'\bSraith\b', 'Smith'), (r'deSaussure', 'de Saussure'), (r'\bd e Saussure', 'de Saussure'),
              (r'MilneEdwards', 'Milne Edwards'), (r'A \. ', 'A. '), (r'\s+,', ','), (r'\s+', ' ')]


def slug(s):
    s = unicodedata.normalize('NFD', s).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')


def rank_of(name):
    w = name.split()
    if len(w) == 1:
        if name.endswith('idae'): return 'family'
        if name.endswith('inae'): return 'subfamily'
        return 'genus'
    return 'species'


# ---------- claves ----------
keys, cur, node = {}, None, None
for ln, raw in enumerate(open(ROOT + 'src/claves.txt', encoding='utf-8'), 1):
    line = raw.rstrip('\n')
    if not line.strip() or line.startswith('#'): continue
    if line.startswith('@KEY'):
        kid, title, owner, pages = [p.strip() for p in line[4:].split('|')]
        cur = keys[kid] = {'id': kid, 'title': title, 'ownerTaxon': None if owner == '-' else owner,
                           'pages': pages, 'nodes': {}}
        node = None
    elif re.match(r'^\[\d+\]$', line):
        node = {'id': f"{cur['id']}:{line[1:-1]}", 'step': int(line[1:-1]), 'options': []}
        cur['nodes'][node['step']] = node
    else:
        m = re.match(r'^([a-z]): (.*) => (.*?)(\s+!inf)?$', line)
        if not m: sys.exit(f'línea {ln} inválida: {line[:60]}')
        node['options'].append({'label': f"{node['step']}{m.group(1)}", 'text': m.group(2).strip(),
                                'target': m.group(3).strip(), 'inferred': bool(m.group(4))})

# ---------- taxones ----------
taxa = {}

def get_taxon(name):
    name = FIX_NAME.get(name, name)
    if name not in taxa:
        taxa[name] = {'id': slug(name), 'rank': rank_of(name), 'scientificName': name, 'parent': None}
    return taxa[name]

# familias: lista del documento (p. 575), con el numero de especies presentes en el area
FAMILIES = [
    ('Dromiidae', 'De Haan, 1833', 4), ('Dynomenidae', 'Ortmann, 1892', 1),
    ('Cyclodorippidae', 'Alcock, 1896', 3), ('Raninidae', 'De Haan, 1839', 5),
    ('Calappidae', 'De Haan, 1833', 14), ('Dorippidae', 'MacLeay, 1838', 8), ('Leucosiidae', 'Samouelle, 1819', 20),
    ('Majidae', 'Samouelle, 1819', 93), ('Parthenopidae', 'MacLeay, 1838', 19),
    ('Atelecyclidae', 'Ortmann, 1893', 3), ('Cancridae', 'Latreille, 1803', 3),
    ('Cryptochiridae', 'Paulson, 1875', None), ('Gecarcinidae', 'MacLeay, 1838', 4),
    ('Goneplacidae', 'MacLeay, 1838', 17), ('Grapsidae', 'MacLeay, 1838', 30), ('Ocypodidae', 'Rafinesque, 1815', 38),
    ('Palicidae', 'Rathbun, 1898', 5), ('Pinnotheridae', 'De Haan, 1833', 38), ('Portunidae', 'Rafinesque, 1815', 18),
    ('Xanthidae', 'MacLeay, 1838', 91),
]
for nm, au, cnt in FAMILIES:
    t = get_taxon(nm)
    t['author'] = au
    t['speciesInArea'] = cnt

# objetivos de las claves
for k in keys.values():
    owner = k['ownerTaxon']
    for n in k['nodes'].values():
        for o in n['options']:
            if not o['target'].isdigit():
                t = get_taxon(o['target'])
                if owner and t['rank'] in ('genus', 'species', 'subfamily'):
                    fam = owner
                    if t['rank'] == 'species':
                        g = get_taxon(t['scientificName'].split()[0])
                        g['parent'] = g['parent'] or fam
                        t['parent'] = g['scientificName']
                    else:
                        t['parent'] = fam
    if owner:
        get_taxon(owner)['keyId'] = k['id']

# fichas
for f in json.load(open(ROOT + 'raw/fichas.json', encoding='utf-8')):
    sci = f['scientificName']
    subgenus = re.search(r'\(([A-Z][a-z]+)\)', sci)
    name = re.sub(r'\s*\([A-Z][a-z]+\)', '', sci)
    name = FIX_NAME.get(name, name)
    t = get_taxon(name)
    a = f['author'] or ''
    for p, r in FIX_AUTHOR: a = re.sub(p, r, a)
    t['author'] = a.strip()
    code = (f['faoCode'] or '')
    code = re.sub(r'Cal!', 'Cali', code)
    code = re.sub(r'PORTE uphy', 'PORT Euphy', code)
    code = re.sub(r'Sten.', 'Steno', code) if 'MAJI' in code else code
    t['faoCode'] = code or None
    if subgenus: t['subgenus'] = subgenus.group(1)
    sec = f['sections']
    t['sheet'] = {
        'otherNames': sec.get('Otros nombres científicos aún utilizados'),
        'vernacular': sec.get('Nombres vernáculos'),
        'distinctive': sec.get('Caracteres distintivos'),
        'size': sec.get('Talla'),
        'habitat': sec.get('Hábitat y biología') or sec.get('Habitat y biología'),
        'fisheries': sec.get('Pesca y utilización'),
    }
    pref = code.split()[0] if code else None
    fam = FAMILY_PREFIX.get(pref)
    if fam and not t['parent']:
        g = get_taxon(name.split()[0])
        g['parent'] = g['parent'] or fam
        t['parent'] = g['scientificName']
    if 'Arenaeus' in name and not t['parent']:
        t['parent'] = 'Arenaeus'

# Correcciones manuales verificadas contra el documento (OCR defectuoso)
OVERRIDES = {'Euphylax dovii': {'author': 'Stimpson, 1860'},
             'Arenaeus mexicanus': {'faoCode': 'PORT Aren 2'}}
for nm, ov in OVERRIDES.items():
    taxa[nm].update(ov)

for t in taxa.values():
    t['children'] = []
for t in taxa.values():
    if t['parent'] and t['parent'] in taxa:
        taxa[t['parent']]['children'].append(t['scientificName'])

# ---------- validación ----------
rep = []
def bad(msg): rep.append('ERROR: ' + msg)
def warn(msg): rep.append('AVISO: ' + msg)
SUSP = [(r'�', 'carácter de reemplazo'), (r'\w- \w', 'posible guion de fin de línea'),
        (r'(?:\b[a-záéíóú] ){3,}', 'letras espaciadas'), (r'\s{2,}', 'espacios dobles')]
n_opts = n_inf = 0
for k in keys.values():
    steps = k['nodes']
    if 1 not in steps: bad(f"{k['id']}: no tiene paso 1")
    reach, stack = set(), [1]
    while stack:
        s = stack.pop()
        if s in reach or s not in steps: continue
        reach.add(s)
        for o in steps[s]['options']:
            if o['target'].isdigit(): stack.append(int(o['target']))
    for s, nd in steps.items():
        if s not in reach: bad(f"{k['id']}: paso {s} inalcanzable")
        if len(nd['options']) < 2: bad(f"{k['id']}:{s} tiene menos de 2 opciones")
        for o in nd['options']:
            n_opts += 1
            if o['inferred']: n_inf += 1; warn(f"{k['id']}:{o['label']} enlace inferido -> {o['target']}")
            if o['target'].isdigit():
                if int(o['target']) not in steps: bad(f"{k['id']}:{o['label']} apunta a paso inexistente {o['target']}")
                elif int(o['target']) <= s: bad(f"{k['id']}:{o['label']} ciclo/retroceso hacia {o['target']}")
            else:
                if FIX_NAME.get(o['target'], o['target']) not in taxa: bad(f"{k['id']}:{o['label']} taxón inexistente {o['target']}")
            for p, d in SUSP:
                if re.search(p, o['text']): warn(f"{k['id']}:{o['label']} {d}")
for t in taxa.values():
    if t['rank'] != 'family' and not t['parent']: warn(f"taxón sin padre: {t['scientificName']}")
    if t.get('sheet'):
        for fld, v in t['sheet'].items():
            if v and '�' in v: warn(f"{t['scientificName']} ficha.{fld}: carácter de reemplazo")
    if t.get('faoCode') and not re.match(r'^[A-Z]{3,6} [A-Za-zó]+ \d+$', t['faoCode']):
        warn(f"{t['scientificName']}: código FAO sospechoso '{t['faoCode']}'")

out_keys = [{**k, 'nodes': list(k['nodes'].values())} for k in keys.values()]
json.dump(out_keys, open(ROOT + 'keys.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(list(taxa.values()), open(ROOT + 'taxa.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
summary = (f"claves={len(keys)} pasos={sum(len(k['nodes']) for k in keys.values())} opciones={n_opts} "
           f"inferidas={n_inf} taxones={len(taxa)} (familias={sum(t['rank']=='family' for t in taxa.values())}, "
           f"géneros={sum(t['rank']=='genus' for t in taxa.values())}, especies={sum(t['rank']=='species' for t in taxa.values())}, "
           f"con ficha={sum(bool(t.get('sheet')) for t in taxa.values())})")
open(ROOT + 'reporte.txt', 'w', encoding='utf-8').write(summary + '\n' + '\n'.join(rep) + '\n')
print(summary)
print('\n'.join(rep))
