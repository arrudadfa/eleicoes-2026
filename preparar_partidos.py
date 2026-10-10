"""Baixa os símbolos oficiais dos partidos e grava partidos/{sigla}.jpg."""
from pathlib import Path
import json
import unicodedata
import urllib.request

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'partidos'
URL = 'https://assets.colinha.ai/partidos/{slug}/logo/md.jpg'

def slug(name):
    text = unicodedata.normalize('NFD', name)
    return ''.join(char for char in text if unicodedata.category(char) != 'Mn').lower()

def main():
    data = json.loads((ROOT / 'candidatos.json').read_text(encoding='utf-8'))
    parties = sorted({item['party'] for item in data['candidates'] if item.get('party')})
    OUT.mkdir(exist_ok=True)
    missing = []
    for party in parties:
        ident = slug(party)
        target = OUT / f'{ident}.jpg'
        url = URL.format(slug=ident)
        print('baixando', party, flush=True)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        try:
            with urllib.request.urlopen(req, timeout=60) as response:
                payload = response.read()
        except Exception as exc:
            missing.append(f'{party}: {exc}')
            continue
        if len(payload) < 500:
            missing.append(party)
            continue
        target.write_bytes(payload)
    print('partidos', len(parties) - len(missing))
    if missing:
        raise SystemExit('faltou: ' + ', '.join(missing))

if __name__ == '__main__':
    main()
