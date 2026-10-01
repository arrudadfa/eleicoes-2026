"""Converte os arquivos oficiais já baixados em uma base mínima e auditável."""
from pathlib import Path
import csv, io, zipfile, json, hashlib, collections

ROOT = Path(__file__).resolve().parent
def rows(archive, name):
    with zipfile.ZipFile(ROOT / archive) as z:
        return list(csv.DictReader(io.StringIO(z.read(name).decode('latin1')), delimiter=';'))

candidates = []
for uf in ['SP', 'BR']:
    extra = {r['SQ_CANDIDATO']: r for r in rows('situacoes-tse.zip', f'consulta_cand_complementar_2026_{uf}.csv')}
    for r in rows('candidatos-tse.zip', f'consulta_cand_2026_{uf}.csv'):
        if r['NR_TURNO'] != '1' or r['DS_CARGO'] not in ['DEPUTADO FEDERAL', 'DEPUTADO ESTADUAL', 'SENADOR', 'GOVERNADOR', 'PRESIDENTE']:
            continue
        s = extra.get(r['SQ_CANDIDATO'], {})
        candidates.append(dict(id=r['SQ_CANDIDATO'], name=r['NM_URNA_CANDIDATO'], fullName=r['NM_CANDIDATO'], number=r['NR_CANDIDATO'], party=r['SG_PARTIDO'], office=r['DS_CARGO'], uf=uf, status=s.get('DS_SITUACAO_JULGAMENTO','Não informado'), inBallot=s.get('ST_CANDIDATO_INSERIDO_URNA')=='SIM', voteDestination=s.get('NM_TIPO_DESTINACAO_VOTOS','Não informado'), substituted=s.get('ST_SUBSTITUIDO')=='S', source=f"https://divulgacandcontas.tse.jus.br/divulga/#/candidato/2026/{r['CD_ELEICAO']}/{r['SG_UE']}/{r['SQ_CANDIDATO']}", generated=r['DT_GERACAO']+' '+r['HH_GERACAO']))
candidates.sort(key=lambda c:(c['office'],c['name'],c['id']))
assert len({c['id'] for c in candidates}) == len(candidates)
data = dict(consulted='2026-10-01', source='https://dadosabertos.tse.jus.br/dataset/candidatos-2026', candidates=candidates, counts=dict(collections.Counter(c['office'] for c in candidates)), hashes={n:hashlib.sha256((ROOT/n).read_bytes()).hexdigest() for n in ['candidatos-tse.zip','situacoes-tse.zip']})
(ROOT/'candidatos.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'dados.js').write_text('window.CANDIDATOS = '+json.dumps(data,ensure_ascii=False)+';\n',encoding='utf-8')
lines=['# Candidaturas — 1º Turno 2026','', 'SP: deputados, Senado e governo. BR: Presidência. Consulta: 01/10/2026.', '', 'Fonte: https://dadosabertos.tse.jus.br/dataset/candidatos-2026', '', 'Todos os registros encontrados são preservados, inclusive renúncias e indeferimentos. Confira a situação antes de usar um número. A presença na urna não garante a validade do voto.', '']
for office in data['counts']:
    lines += ['## '+office,'','| Nome na urna | Partido | Número | Situação | Na urna |','|---|---|---|---|---|']
    lines += [f"| {c['name']} | {c['party']} | {c['number']} | {c['status']} | {'Sim' if c['inBallot'] else 'Não'} |" for c in candidates if c['office']==office]
    lines += ['']
(ROOT/'Lista de candidatos.md').write_text('\n'.join(lines),encoding='utf-8')
print(json.dumps(data['counts'],ensure_ascii=True))
