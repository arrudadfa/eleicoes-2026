"""Baixa o resultado oficial do 1º turno e o índice de seções do TSE.

Gera resultados.js e secoes.js. Não grava os JSON brutos.
Usa apenas a biblioteca padrão.
"""
from pathlib import Path
import json, urllib.request

ROOT = Path(__file__).resolve().parent
BASE = 'https://resultados.tse.jus.br/oficial/ele2026'
UFS = ['SP', 'DF', 'RJ', 'MG', 'RS']
OFFICES = {
    '1': 'PRESIDENTE',
    '3': 'GOVERNADOR',
    '5': 'SENADOR',
    '6': 'DEPUTADO FEDERAL',
    '7': 'DEPUTADO ESTADUAL',
    '8': 'DEPUTADO DISTRITAL',
}

def get(url):
    with urllib.request.urlopen(url, timeout=120) as response:
        return json.load(response)

def race_url(election, folder, prefix, office):
    code = f'{int(election):06d}'
    cargo = f'{int(office):04d}'
    return f'{BASE}/{election}/dados/{folder}/{prefix}-c{cargo}-e{code}-u.json'

def summary(data):
    votes, sections, electorate = data['v'], data['s'], data['e']
    return dict(
        dg=data['dg'], hg=data['hg'], closed=data.get('and') == 'f',
        sections=int(sections['st']), sectionsTotal=int(sections['ts']), counted=sections['pst'],
        electorate=int(electorate['te']), total=int(votes['tv']), valid=int(votes['vv']),
        nominal=int(votes['vnom']), legend=int(votes['van']), blank=int(votes['vb']), nulls=int(votes['vn']),
    )

def candidates(data):
    found = {}
    for group in data['carg'][0]['agr']:
        for party in group.get('par') or []:
            for cand in party.get('cand') or []:
                if not cand.get('sqcand'):
                    continue
                found[str(cand['sqcand'])] = [int(cand['vap']), cand.get('pvap') or '', cand.get('st') or '']
    return found

races, by_id = {}, {}
url = race_url(6257, 'br', 'br', 1)
print('baixando', url)
payload = get(url)
races['BR|PRESIDENTE'] = summary(payload)
by_id.update(candidates(payload))
for uf in UFS:
    offices = ['3', '5', '6', '8' if uf == 'DF' else '7']
    for office in offices:
        url = race_url(6259, uf.lower(), uf.lower(), office)
        print('baixando', url)
        payload = get(url)
        races[f'{uf}|{OFFICES[office]}'] = summary(payload)
        by_id.update(candidates(payload))

results = dict(
    consulted='2026-10-10',
    source='https://resultados.tse.jus.br/oficial/ele2026/',
    pleito='3220',
    races=races,
    byId=by_id,
)
(ROOT / 'resultados.js').write_text('window.RESULTADOS = ' + json.dumps(results, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')

sections = {}
for uf in UFS:
    url = f'{BASE}/arquivo-urna/3220/config/{uf.lower()}/{uf.lower()}-p003220-cs.json'
    print('baixando', url)
    payload = get(url)
    municipalities, zones = {}, {}
    for municipality in payload['abr'][0]['mu']:
        municipalities[municipality['cd']] = municipality['nm']
        for zone in municipality['zon']:
            zone_key = str(int(zone['cd']))
            bucket = zones.setdefault(zone_key, {})
            for section in zone['sec']:
                section_key = str(int(section['ns']))
                if section_key in bucket:
                    raise SystemExit(f'Seção repetida: {uf} zona {zone_key} seção {section_key}')
                if section.get('nsp'):
                    bucket[section_key] = f"{municipality['cd']}>{int(section['nsp'])}"
                else:
                    bucket[section_key] = municipality['cd']
    sections[uf] = dict(m=municipalities, z=zones)

index = dict(
    consulted='2026-10-10',
    source='https://resultados.tse.jus.br/oficial/ele2026/arquivo-urna/3220/config/',
    pleito='3220',
    uf=sections,
)
(ROOT / 'secoes.js').write_text('window.SECOES = ' + json.dumps(index, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
print('candidatos com voto', len(by_id))
print('resultados.js', (ROOT / 'resultados.js').stat().st_size)
print('secoes.js', (ROOT / 'secoes.js').stat().st_size)
