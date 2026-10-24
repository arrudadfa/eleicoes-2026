import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseApuracaoPayload, buildTseResultUrl, buildTseResultUrls } from '../apuracao/parser.mjs';
import { APURACAO_CONFIG } from '../apuracao/config.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const fixture2022 = JSON.parse(
  readFileSync(join(root, '../fixtures/ele2022-br-presidente-545-v.json'), 'utf8'),
);

test('parse 2022 2º turno presidente (fixture ele2022/545)', () => {
  const data = parseApuracaoPayload(fixture2022, { cargo: 1, scope: 'br' });
  assert.equal(data.state, 'closed');
  assert.equal(data.candidates.length, 2);
  assert.equal(data.candidates[0].number, '13');
  assert.equal(data.candidates[0].percentValid, 50.9);
  assert.equal(data.candidates[1].number, '22');
  assert.equal(data.candidates[1].percentValid, 49.1);
  assert.ok(data.sections.percent > 99);
  assert.ok(data.votes.valid > 0);
});

test('parse formato carg (1º turno 2026)', () => {
  const sample = {
    ele: '6257',
    and: 'f',
    dg: '05/10/2026',
    hg: '12:51:47',
    s: { ts: '100', st: '100', pst: '100,00' },
    e: { te: '1000', c: '800', a: '200', pa: '20,00' },
    v: { tv: '800', vv: '700', vb: '50', vn: '50' },
    carg: [{
      cd: '1',
      agr: [{
        par: [{
          cand: [
            { sqcand: '1', n: '22', nmu: 'A', vap: '400', pvap: '57,14', st: 'Eleito' },
            { sqcand: '2', n: '13', nmu: 'B', vap: '300', pvap: '42,86', st: 'Não eleito' },
          ],
        }],
      }],
    }],
  };
  const data = parseApuracaoPayload(sample, { cargo: 1, scope: 'br' });
  assert.equal(data.state, 'closed');
  assert.equal(data.candidates[0].votes, 400);
  assert.equal(data.candidates[0].percentValid, 57.14);
  assert.equal(data.votes.blank, 50);
});

test('buildTseResultUrl exige pathId configurado', () => {
  const cfg = {
    ...APURACAO_CONFIG,
    elections: {
      presidente: { pathId: 6260, fileId: 6260, cargo: 1, folder: 'br', prefix: 'br' },
      governador: APURACAO_CONFIG.elections.governador,
    },
  };
  const url = buildTseResultUrl(cfg, 'presidente');
  assert.match(url, /ele2026\/6260\/dados\/br\/br-c0001-e006260-u\.json/);
  const urls = buildTseResultUrls(cfg, 'presidente');
  assert.ok(urls.length >= 2);
});
