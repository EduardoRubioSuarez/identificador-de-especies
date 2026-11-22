"""Integra las listas de especies (data/raw/listas.json + correcciones manuales) en data/taxa.json."""
import json, re
taxa = {t['scientificName']: t for t in json.load(open('data/taxa.json', encoding='utf-8'))}
listas = json.load(open('data/raw/listas.json', encoding='utf-8'))

PARTICLES = {'von', 'de', 'van', 'du', 'la'}
manual = []
for ln in open('data/src/xanthidae_pp633-634.txt', encoding='utf-8'):
    if ln.startswith('#') or not ln.strip(): continue
    p = [x.strip() for x in ln.rstrip('\n').split('|')]
    manual.append({'scientificName': p[0], 'author': p[1], 'faoCode': (p[2] if len(p) > 2 and p[2] else None),
                   'note': p[3] if len(p) > 3 and p[3] else None})
# La parte de Xanthidae desde Globopilumnus se reemplaza por la transcripción manual
xl = listas['Xanthidae']
cut = next(i for i, x in enumerate(xl) if x['scientificName'].startswith('Globopilumnus'))
listas['Xanthidae'] = xl[:cut] + manual

added = 0
warns = []
for fam, items in listas.items():
    for it in items:
        name = it['scientificName']
        w = name.split()
        if w[0] == 'Otros': continue
        while len(w) > 2 and w[-1] in PARTICLES: w.pop()   # 'Uca dorotheae von' -> particula del autor
        name = ' '.join(w)
        name = {'Euchirograpsus americanas': 'Euchirograpsus americanus', 'Goetice americanas': 'Goetice americanus'}.get(name, name)  # verificado en p. 603
        if len(w) > 1 and w[1] in PARTICLES: continue
        if name in taxa:
            continue
        genus = w[0]
        if genus not in taxa:
            taxa[genus] = {'id': genus.lower(), 'rank': 'genus', 'scientificName': genus, 'parent': fam, 'children': []}
            taxa[fam]['children'].append(genus)
        elif not taxa[genus]['parent']:
            taxa[genus]['parent'] = fam
        a = re.sub(r'\bde$', '', it['author']).strip()
        taxa[name] = {'id': re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-'), 'rank': 'species',
                      'scientificName': name, 'parent': genus, 'author': it['author'],
                      'faoCode': it.get('faoCode'), 'note': it.get('note'), 'children': []}
        taxa[genus]['children'].append(name)
        added += 1
        if re.search(r'[^\x20-\x7e]', name.replace('á', 'a').replace('é', 'e')) or w[1].endswith('as') and w[1] not in ('sulcatas',):
            warns.append(name)
# Correcciones verificadas contra la imagen de las páginas 615 (Ocypodidae) y 621 (Portunidae)
for name, author, fam in [('Uca festae', 'Nobili, 1902', 'Ocypodidae'),
                          ('Uca musica musica', 'Rathbun, 1914', 'Ocypodidae'),
                          ('Uca musica terpsichores', 'Crane, 1941', 'Ocypodidae')]:
    if name not in taxa:
        taxa[name] = {'id': re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-'), 'rank': 'species',
                      'scientificName': name, 'parent': 'Uca', 'author': author, 'faoCode': None, 'note': None,
                      'children': []}
        taxa['Uca']['children'].append(name)
        added += 1
CODES = {'Callinectes arcuatus': 'PORT Call 13', 'Callinectes bellicosus': 'PORT Call 14',
         'Callinectes exasperatus': 'PORT Call 5', 'Callinectes toxotes': 'PORT Call 15',
         'Cronius ruber': 'PORT Cron 1', 'Portunus asper': 'PORT Portun 4', 'Portunus xantusii': 'PORT Portun 5'}
for name, code in CODES.items():
    taxa[name]['faoCode'] = code
# Subfamilias de Grapsidae (pp. 602-603): la clave nombra los géneros de cada una; para Grapsinae solo Grapsus y Goniopsis (Fig. 3)
SUBFAMILIES = {
    'Plagusiinae': (['Plagusia', 'Percnon'], 'Géneros Plagusia y Percnon.'),
    'Sesarminae': (['Aratus', 'Armases', 'Sesarma'],
                   'Géneros Aratus, Armases y Sesarma. Aratus tiene una sola especie (A. pisonii), arborícola en bosques de mangle; Armases tiene 3 especies y Sesarma, 4.'),
    'Varuninae': (['Tetragrapsus'], 'Tetragrapsus jouyi.'),
    'Grapsinae': (['Grapsus', 'Goniopsis'], 'Incluye 7 géneros presentes en el área y 15 especies en el Pacífico centro-oriental; solo dos son de interés para la pesca (a nivel de subsistencia): Grapsus grapsus y Goniopsis pulchra. Solo se asignan a esta subfamilia los géneros que el documento nombra (Fig. 3a y b); no nombra los demás.'),
}
for sub, (genera, note) in SUBFAMILIES.items():
    taxa[sub]['note'] = note
    for g in genera:
        if g not in taxa:
            continue
        old = taxa[g]['parent']
        if old and g in taxa[old]['children']:
            taxa[old]['children'].remove(g)
        taxa[g]['parent'] = sub
        if g not in taxa[sub]['children']:
            taxa[sub]['children'].append(g)

print('especies añadidas tras correcciones:', added)
json.dump(list(taxa.values()), open('data/taxa.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('especies añadidas desde listas:', added, '| total taxones:', len(taxa))
print('nombres a revisar (OCR sospechoso):', warns)
