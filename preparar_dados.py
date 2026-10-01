"""Converte os arquivos oficiais já baixados em uma base mínima e auditável."""
from pathlib import Path
import csv, io, zipfile, json, hashlib, collections

ROOT = Path(__file__).resolve().parent
def rows(archive, name):
    with zipfile.ZipFile(ROOT / archive) as z:
        return list(csv.DictReader(io.StringIO(z.read(name).decode('latin1')), delimiter=';'))

OFFICES = ['DEPUTADO FEDERAL', 'DEPUTADO ESTADUAL', 'DEPUTADO DISTRITAL', 'SENADOR', 'GOVERNADOR', 'PRESIDENTE']
UFS = ['SP', 'DF', 'RJ', 'MG', 'RS', 'BR']
candidates = []
for uf in UFS:
    extra = {r['SQ_CANDIDATO']: r for r in rows('situacoes-tse.zip', f'consulta_cand_complementar_2026_{uf}.csv')}
    for r in rows('candidatos-tse.zip', f'consulta_cand_2026_{uf}.csv'):
        if r['NR_TURNO'] != '1' or r['DS_CARGO'] not in OFFICES:
            continue
        s = extra.get(r['SQ_CANDIDATO'], {})
        candidates.append(dict(id=r['SQ_CANDIDATO'], name=r['NM_URNA_CANDIDATO'], fullName=r['NM_CANDIDATO'], number=r['NR_CANDIDATO'], party=r['SG_PARTIDO'], office=r['DS_CARGO'], uf=uf, status=s.get('DS_SITUACAO_JULGAMENTO','Não informado'), inBallot=s.get('ST_CANDIDATO_INSERIDO_URNA')=='SIM', voteDestination=s.get('NM_TIPO_DESTINACAO_VOTOS','Não informado'), substituted=s.get('ST_SUBSTITUIDO')=='S', source=f"https://divulgacandcontas.tse.jus.br/divulga/#/candidato/2026/{r['CD_ELEICAO']}/{r['SG_UE']}/{r['SQ_CANDIDATO']}", generated=r['DT_GERACAO']+' '+r['HH_GERACAO']))
candidates.sort(key=lambda c:(c['office'],c['name'],c['id']))
assert len({c['id'] for c in candidates}) == len(candidates)
data = dict(consulted='2026-10-01', source='https://dadosabertos.tse.jus.br/dataset/candidatos-2026', candidates=candidates, counts=dict(collections.Counter(c['office'] for c in candidates)), hashes={n:hashlib.sha256((ROOT/n).read_bytes()).hexdigest() for n in ['candidatos-tse.zip','situacoes-tse.zip']})
(ROOT/'candidatos.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'dados.js').write_text('window.CANDIDATOS = '+json.dumps(data,ensure_ascii=False)+';\n',encoding='utf-8')
lines=['# Candidaturas — 1º Turno 2026','', 'SP, DF, RJ, MG e RS: deputados, Senado e governo. No DF, o cargo estadual é deputado distrital. BR: Presidência. Consulta: 01/10/2026.', '', 'Fonte: https://dadosabertos.tse.jus.br/dataset/candidatos-2026', '', 'Todos os registros encontrados são preservados, inclusive renúncias e indeferimentos. Confira a situação antes de usar um número. A presença na urna não garante a validade do voto.', '']
for uf in UFS:
    subset=[c for c in candidates if c['uf']==uf]
    lines += ['# '+uf, '']
    for office in OFFICES:
        group=[c for c in subset if c['office']==office]
        if not group: continue
        lines += ['## '+office,'','| Nome na urna | Partido | Número | Situação | Na urna |','|---|---|---|---|---|']
        lines += [f"| {c['name']} | {c['party']} | {c['number']} | {c['status']} | {'Sim' if c['inBallot'] else 'Não'} |" for c in group]
        lines += ['']
(ROOT/'Lista de candidatos.md').write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps(data['counts'],ensure_ascii=True))
