import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  linhaUf, tabelaUfs, mudancasDeVencedor, resumoNacional,
  agregarRegioes, transferenciaNacional, transferenciaPorUf,
} from '../analise/aggregate.mjs';
import { regiaoDaUf, nomeEstado } from '../analise/estados.mjs';

const root = dirname(fileURLToPath(import.meta.url));
const dados = JSON.parse(readFileSync(join(root, '../dados/resultados-2026.json'), 'utf8'));

test('resumoNacional traz o vencedor e a margem corretos do 2º turno', () => {
  const resumo = resumoNacional(dados);
  assert.equal(resumo.turno2.lula, 64255891);
  assert.equal(resumo.turno2.flavio, 59825984);
  assert.equal(resumo.turno2.vencedor, 'LULA');
  assert.equal(resumo.turno2.margem, 64255891 - 59825984);
  assert.ok(resumo.turno1.comparecimentoPct > 0 && resumo.turno1.comparecimentoPct < 100);
});

test('linhaUf detecta UF que mudou de vencedor entre os turnos (MG)', () => {
  const mg = linhaUf(dados, 'mg');
  assert.equal(mg.vencedor1, 'FLAVIO');
  assert.equal(mg.vencedor2, 'LULA');
  assert.equal(mg.mudou, true);
  assert.equal(mg.regiao, 'SE');
});

test('linhaUf mantém o mesmo vencedor quando não houve troca (AC)', () => {
  const ac = linhaUf(dados, 'ac');
  assert.equal(ac.vencedor1, 'FLAVIO');
  assert.equal(ac.vencedor2, 'FLAVIO');
  assert.equal(ac.mudou, false);
  assert.equal(ac.regiao, 'N');
});

test('tabelaUfs cobre todas as 26 UFs + DF + exterior (sem "br")', () => {
  const tabela = tabelaUfs(dados);
  assert.equal(tabela.length, 28);
  assert.ok(!tabela.some((row) => row.uf === 'BR'));
  assert.ok(tabela.some((row) => row.uf === 'ZZ'));
  // ordem alfabética
  const ufsOrdenadas = tabela.map((r) => r.uf);
  assert.deepEqual(ufsOrdenadas, [...ufsOrdenadas].sort((a, b) => a.localeCompare(b, 'pt-BR')));
});

test('mudancasDeVencedor identifica exatamente MG como a UF que trocou', () => {
  const mudancas = mudancasDeVencedor(dados);
  assert.deepEqual(mudancas.map((r) => r.uf), ['MG']);
});

test('agregarRegioes soma corretamente o eleitorado da região Centro-Oeste', () => {
  const regioes = agregarRegioes(dados);
  assert.deepEqual(regioes.CO.ufs, ['DF', 'GO', 'MS', 'MT']);
  assert.equal(regioes.CO.turno1.eleitorado, 12001141);
  assert.deepEqual(regioes.EXTERIOR.ufs, ['ZZ']);
  assert.equal(regioes.EXTERIOR.turno1.eleitorado, dados['1turno'].zz.eleitorado);
});

test('transferenciaNacional calcula o ganho absoluto e a estimativa de participação', () => {
  const transf = transferenciaNacional(dados);
  assert.equal(transf.outros1, 9316747);
  assert.equal(transf.ganhoLula, 10376353);
  assert.equal(transf.ganhoFlavio, 3721481);
  assert.equal(transf.participacaoLulaPct, 111.37);
  assert.equal(transf.participacaoFlavioPct, 39.94);
});

test('transferenciaPorUf tem uma linha por UF com os mesmos campos de ganho', () => {
  const porUf = transferenciaPorUf(dados);
  assert.equal(porUf.length, 28);
  const sp = porUf.find((r) => r.uf === 'SP');
  assert.equal(sp.ganhoLula, 12119274 - 9505413);
  assert.equal(sp.ganhoFlavio, 14139178 - 12922023);
});

test('regiaoDaUf e nomeEstado cobrem o exterior', () => {
  assert.equal(regiaoDaUf('zz'), 'EXTERIOR');
  assert.equal(nomeEstado('zz'), 'Exterior');
  assert.equal(regiaoDaUf('SP'), 'SE');
});
