import json
keys = {k['id']: {n['step']: n for n in k['nodes']} for k in json.load(open('data/keys.json', encoding='utf-8'))}
def walk(key, labels):
    step = 1
    for lab in labels:
        opt = next(o for o in keys[key][step]['options'] if o['label'] == lab)
        t = opt['target']
        if t.isdigit(): step = int(t)
        else: return t
    raise SystemExit('ruta incompleta')
CASES = [('familias', ['1b','2a','3b','5b'], 'Calappidae'),
         ('familias', ['1b','2b','6b','9b','19a'], 'Majidae'),
         ('familias', ['1b','2b','6b','9a','10b','11b','16b','17a','18a'], 'Grapsidae'),
         ('familias', ['1b','2b','6b','9a','10b','11a','12a'], 'Portunidae'),
         ('calappidae-generos', ['1b','2b','3b','5a','6b'], 'Hepatus lineatus'),
         ('portunidae-especies', ['1b','3b','4b','5b','6b','7b','8b'], 'Callinectes toxotes'),
         ('gecarcinidae-especies', ['1b','2b','3a'], 'Gecarcinus planatus'),
         ('ocypodidae-generos', ['1b','2b'], 'Uca')]
for key, path, exp in CASES:
    got = walk(key, path)
    print('OK ' if got == exp else 'FALLA', key, '->', got)
