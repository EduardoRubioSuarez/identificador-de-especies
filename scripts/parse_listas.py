"""Extrae las listas de especies por familia (solo nombre, autor y codigo FAO) del texto del documento.
Genera data/raw/listas.json: {familia: [{scientificName, author, faoCode, note}]}"""
import re, json
L = open('data/raw/cangrejos_layout.txt', encoding='utf-8').read().split('\n')
STARTS = {685: 'Calappidae', 989: 'Cancridae', 1197: 'Dorippidae', 1342: 'Gecarcinidae', 1648: 'Grapsidae',
          1899: 'Majidae', 2182: 'Ocypodidae', 2462: 'Portunidae', 2944: 'Xanthidae'}
SP = re.compile(r'^\s*([A-ZÁ][a-záéíóúñ]+)\s+((?:\([A-Z][a-z]+\)\s+)?[a-z]+(?:\s+[a-z]+)?)\s+(.*?\d{4}\)?)(\s*\(.*?\))?\s*(?:([A-Z]{3,6}\s+\S+\s+\d+))?\s*$')
out = {}
for start, fam in STARTS.items():
    items, miss = [], 0
    i = start  # linea (1-based) del encabezado de la lista -> indice 0-based start
    while i < len(L):
        l = L[i]
        i += 1
        if not l.strip():
            continue
        if re.match(r'^\s*\d{3}\s|.*Cangrejos\s*\d*\s*$|^[A-Z][a-z]+idae\s+\d{3}', l):
            continue
        m = SP.match(l)
        if m and 'Nombres' not in l:
            sp = re.sub(r'^\(([A-Z][a-z]+)\)\s+', '', m.group(2))
            sub = re.match(r'^\(([A-Z][a-z]+)\)', m.group(2))
            items.append({'scientificName': f"{m.group(1)} {sp}".replace('  ', ' ').replace('Cáncer', 'Cancer'), 'subgenus': sub.group(1) if sub else None,
                          'author': re.sub(r'\s+', ' ', m.group(3)).strip(), 'note': (m.group(4) or '').strip() or None,
                          'faoCode': m.group(5)})
            miss = 0
        else:
            miss += 1
            if items and miss > 3: break
            if not items and miss > 12: break
    # separar fichas: la lista termina antes del primer encabezado de ficha
    seen, uniq = set(), []
    for it in items:
        if it['scientificName'] in seen: continue
        seen.add(it['scientificName']); uniq.append(it)
    out[fam] = uniq
    items = uniq
json.dump(out, open('data/raw/listas.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
decl = {'Calappidae': 14, 'Cancridae': 3, 'Dorippidae': 8, 'Gecarcinidae': 4, 'Grapsidae': 30, 'Majidae': 93,
        'Ocypodidae': 38, 'Portunidae': 18, 'Xanthidae': 91}
for f, it in out.items():
    print(f, len(it), '(declaradas', decl[f], ')')
