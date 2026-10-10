"""Baixa as fotos oficiais do TSE e grava fotos/{id}.jpg."""
from pathlib import Path
import io
import urllib.request
import zipfile

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'fotos'
UFS = ['SP', 'DF', 'RJ', 'MG', 'RS', 'BR']
URL = 'https://cdn.tse.jus.br/estatistica/sead/eleicoes/eleicoes2026/fotos/foto_cand2026_{uf}_div.zip'

def candidate_id(name):
    base = Path(name).name
    if not base.lower().endswith('.jpg'):
        return None
    stem = base[:-4]
    if stem.lower().endswith('_div'):
        stem = stem[:-4]
    if len(stem) < 4 or not stem.startswith('F'):
        return None
    return stem[3:]

def main():
    OUT.mkdir(exist_ok=True)
    saved = 0
    for uf in UFS:
        url = URL.format(uf=uf)
        print('baixando', uf, flush=True)
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req, timeout=180) as response:
            payload = response.read()
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            for info in archive.infolist():
                ident = candidate_id(info.filename)
                if not ident or info.is_dir():
                    continue
                target = OUT / f'{ident}.jpg'
                target.write_bytes(archive.read(info))
                saved += 1
        print(uf, 'ok', flush=True)
    print('fotos', saved)

if __name__ == '__main__':
    main()
