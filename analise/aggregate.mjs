'use strict';

import { REGIOES, REGIAO_NOME, regiaoDaUf, nomeEstado } from './estados.mjs';

export const NUM_LULA = '13';
export const NUM_FLAVIO = '22';

function round2(n) {
  return Math.round(n * 100) / 100;
}

export function candidatoPorNumero(turnoUf, numero) {
  if (!turnoUf || !Array.isArray(turnoUf.candidatos)) return null;
  return turnoUf.candidatos.find((c) => String(c.numero) === String(numero)) || null;
}

export function votosDoCandidato(turnoUf, numero) {
  return candidatoPorNumero(turnoUf, numero)?.votos || 0;
}

/** Lista as chaves de UF (minúsculas) presentes nos dados, incluindo "zz" (exterior) e excluindo "br". */
export function ufKeys(dados, turno = '2turno') {
  return Object.keys(dados[turno] || {}).filter((k) => k !== 'br');
}

function pct(parte, total) {
  return total > 0 ? round2((parte / total) * 100) : 0;
}

/**
 * Linha de análise de uma UF: votos dos dois finalistas em cada turno,
 * vencedor (entre os dois) em cada turno, margem e ganho absoluto de votos.
 */
export function linhaUf(dados, ufLower) {
  const uf = ufLower.toUpperCase();
  const t1 = dados['1turno'][ufLower];
  const t2 = dados['2turno'][ufLower];
  const lula1 = votosDoCandidato(t1, NUM_LULA);
  const flavio1 = votosDoCandidato(t1, NUM_FLAVIO);
  const lula2 = votosDoCandidato(t2, NUM_LULA);
  const flavio2 = votosDoCandidato(t2, NUM_FLAVIO);
  const outros1 = Math.max(0, (t1.validos || 0) - lula1 - flavio1);
  const vencedor1 = lula1 >= flavio1 ? 'LULA' : 'FLAVIO';
  const vencedor2 = lula2 >= flavio2 ? 'LULA' : 'FLAVIO';
  const ganhoLula = lula2 - lula1;
  const ganhoFlavio = flavio2 - flavio1;
  const margem2 = Math.abs(lula2 - flavio2);

  return {
    uf,
    nome: nomeEstado(uf),
    regiao: regiaoDaUf(uf),
    lula1, flavio1, outros1,
    lula2, flavio2,
    lula1Pct: pct(lula1, t1.validos),
    flavio1Pct: pct(flavio1, t1.validos),
    lula2Pct: pct(lula2, t2.validos),
    flavio2Pct: pct(flavio2, t2.validos),
    vencedor1,
    vencedor2,
    mudou: vencedor1 !== vencedor2,
    margem2,
    margem2Pct: pct(margem2, t2.validos),
    ganhoLula,
    ganhoFlavio,
    participacaoLulaPct: outros1 > 0 ? round2((ganhoLula / outros1) * 100) : null,
    participacaoFlavioPct: outros1 > 0 ? round2((ganhoFlavio / outros1) * 100) : null,
    atualizado2: t2.atualizado,
    secoesTotalizadasPct2: t2.secoes_totalizadas_pct,
  };
}

/** Tabela com uma linha por UF (sem "br"), em ordem alfabética de UF. */
export function tabelaUfs(dados) {
  return ufKeys(dados)
    .map((uf) => linhaUf(dados, uf))
    .sort((a, b) => a.uf.localeCompare(b.uf, 'pt-BR'));
}

/** UFs em que o candidato que liderava entre os dois finalistas no 1º turno não é quem venceu no 2º. */
export function mudancasDeVencedor(dados) {
  return tabelaUfs(dados).filter((row) => row.mudou);
}

/** Resumo nacional comparando 1º e 2º turno ("br"). */
export function resumoNacional(dados) {
  const t1 = dados['1turno'].br;
  const t2 = dados['2turno'].br;
  const lula1 = votosDoCandidato(t1, NUM_LULA);
  const flavio1 = votosDoCandidato(t1, NUM_FLAVIO);
  const lula2 = votosDoCandidato(t2, NUM_LULA);
  const flavio2 = votosDoCandidato(t2, NUM_FLAVIO);
  const vencedor2 = lula2 >= flavio2 ? 'LULA' : 'FLAVIO';
  const margem2 = Math.abs(lula2 - flavio2);

  const participacao = (turnoUf) => ({
    comparecimentoPct: pct(turnoUf.comparecimento, turnoUf.eleitorado),
    abstencaoPct: pct(turnoUf.abstencao, turnoUf.eleitorado),
    validosPct: pct(turnoUf.validos, turnoUf.comparecimento),
    brancosPct: pct(turnoUf.brancos, turnoUf.comparecimento),
    nulosPct: pct(turnoUf.nulos, turnoUf.comparecimento),
  });

  return {
    turno1: { ...t1, lula: lula1, flavio: flavio1, ...participacao(t1) },
    turno2: { ...t2, lula: lula2, flavio: flavio2, ...participacao(t2), vencedor: vencedor2, margem: margem2, margemPct: pct(margem2, t2.validos) },
  };
}

/** Soma os campos numéricos dos dados de uma UF/turno em um acumulador. */
function somarEm(acc, turnoUf) {
  acc.eleitorado += turnoUf.eleitorado || 0;
  acc.comparecimento += turnoUf.comparecimento || 0;
  acc.abstencao += turnoUf.abstencao || 0;
  acc.validos += turnoUf.validos || 0;
  acc.brancos += turnoUf.brancos || 0;
  acc.nulos += turnoUf.nulos || 0;
  acc.lula += votosDoCandidato(turnoUf, NUM_LULA);
  acc.flavio += votosDoCandidato(turnoUf, NUM_FLAVIO);
  return acc;
}

function zerado() {
  return { eleitorado: 0, comparecimento: 0, abstencao: 0, validos: 0, brancos: 0, nulos: 0, lula: 0, flavio: 0 };
}

/**
 * Agrega eleitorado/votos por região (N, NE, CO, SE, S, exterior), somando as UFs de cada região,
 * para 1º e 2º turno. "Exterior" contém apenas a chave "zz".
 */
export function agregarRegioes(dados) {
  const out = {};
  for (const regiao of Object.keys(REGIOES)) {
    const ufs = REGIOES[regiao].map((uf) => uf.toLowerCase());
    const t1 = ufs.reduce((acc, uf) => somarEm(acc, dados['1turno'][uf]), zerado());
    const t2 = ufs.reduce((acc, uf) => somarEm(acc, dados['2turno'][uf]), zerado());
    const vencedor1 = t1.lula >= t1.flavio ? 'LULA' : 'FLAVIO';
    const vencedor2 = t2.lula >= t2.flavio ? 'LULA' : 'FLAVIO';
    out[regiao] = {
      regiao,
      nome: REGIAO_NOME[regiao],
      ufs: REGIOES[regiao],
      turno1: { ...t1, vencedor: vencedor1 },
      turno2: { ...t2, vencedor: vencedor2 },
      mudou: vencedor1 !== vencedor2,
      ganhoLula: t2.lula - t1.lula,
      ganhoFlavio: t2.flavio - t1.flavio,
    };
  }
  return out;
}

/**
 * Estimativa aritmética (não é pesquisa individual) de quanto do voto dos demais
 * candidatos do 1º turno foi parar com cada finalista no 2º turno, a nível nacional.
 * participacaoXPct = ganho absoluto de X / votos dos "demais candidatos" no 1º turno.
 * A soma pode não fechar 100% porque comparecimento, brancos e nulos também mudam entre turnos.
 */
export function transferenciaNacional(dados) {
  const t1 = dados['1turno'].br;
  const t2 = dados['2turno'].br;
  const lula1 = votosDoCandidato(t1, NUM_LULA);
  const flavio1 = votosDoCandidato(t1, NUM_FLAVIO);
  const lula2 = votosDoCandidato(t2, NUM_LULA);
  const flavio2 = votosDoCandidato(t2, NUM_FLAVIO);
  const outros1 = Math.max(0, (t1.validos || 0) - lula1 - flavio1);
  const ganhoLula = lula2 - lula1;
  const ganhoFlavio = flavio2 - flavio1;

  return {
    outros1,
    ganhoLula,
    ganhoFlavio,
    participacaoLulaPct: outros1 > 0 ? round2((ganhoLula / outros1) * 100) : null,
    participacaoFlavioPct: outros1 > 0 ? round2((ganhoFlavio / outros1) * 100) : null,
    comparecimentoDelta: (t2.comparecimento || 0) - (t1.comparecimento || 0),
    abstencaoDelta: (t2.abstencao || 0) - (t1.abstencao || 0),
    brancosDelta: (t2.brancos || 0) - (t1.brancos || 0),
    nulosDelta: (t2.nulos || 0) - (t1.nulos || 0),
  };
}

/** Transferência de votos (ganho absoluto e estimativa de participação) por UF, reaproveitando tabelaUfs. */
export function transferenciaPorUf(dados) {
  return tabelaUfs(dados).map((row) => ({
    uf: row.uf,
    nome: row.nome,
    regiao: row.regiao,
    outros1: row.outros1,
    ganhoLula: row.ganhoLula,
    ganhoFlavio: row.ganhoFlavio,
    participacaoLulaPct: row.participacaoLulaPct,
    participacaoFlavioPct: row.participacaoFlavioPct,
  }));
}
