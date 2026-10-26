'use strict';

import {
  resumoNacional, agregarRegioes, transferenciaNacional, transferenciaPorUf,
  tabelaUfs, mudancasDeVencedor,
} from './aggregate.mjs';
import { REGIAO_NOME } from './estados.mjs';
import { MAPA_BRASIL, renderMapaSvg } from '../mapa-brasil.mjs';
import { tabelaOrdenavel } from './tabela.mjs';
import { graficoBarrasHorizontais, graficoBarrasPareadas } from './graficos.mjs';

const COR_LULA = '#c5343a';
const COR_FLAVIO = '#234f83';
const COR_T1 = '#8a97ab';
const COR_T2 = '#122b4b';

const $ = (sel) => document.querySelector(sel);

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmt(n) {
  return Number(n || 0).toLocaleString('pt-BR');
}
function pctStr(n) {
  return Number(n || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function nomeVencedor(key) {
  return key === 'LULA' ? 'Lula' : 'Flávio Bolsonaro';
}
function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  return `rgba(${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)},${alpha})`;
}
function opacidadeMargem(margemPct) {
  return Math.min(1, 0.32 + (Math.min(margemPct, 40) / 40) * 0.68);
}
function pctSobre(parte, total) {
  return total > 0 ? (parte / total) * 100 : 0;
}

async function carregarDados() {
  const res = await fetch('dados/resultados-2026.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function renderResumoNacional(dados) {
  const resumo = resumoNacional(dados);
  const t2 = resumo.turno2;
  const t1 = resumo.turno1;
  const venc = nomeVencedor(t2.vencedor);

  $('#an-resumo').innerHTML = `
    <p>No 2º turno (25 de outubro de 2026), <strong>${esc(venc)}</strong> venceu a eleição presidencial com
    <strong>${fmt(t2.vencedor === 'LULA' ? t2.lula : t2.flavio)}</strong> votos válidos
    (${pctStr(pctSobre(t2.vencedor === 'LULA' ? t2.lula : t2.flavio, t2.validos))}%), uma margem de
    <strong>${pctStr(t2.margemPct)} pontos percentuais</strong> sobre o outro candidato.</p>
    <div>${graficoBarrasHorizontais({
      rows: [
        { label: 'Lula', value: t2.lula, color: COR_LULA },
        { label: 'Flávio Bolsonaro', value: t2.flavio, color: COR_FLAVIO },
      ],
      formatValor: (v) => `${fmt(v)} votos`,
    })}</div>
    <p class="fine">Comparecimento: ${fmt(t2.comparecimento)} (${pctStr(t2.comparecimentoPct)}% do eleitorado) ·
    Abstenção: ${fmt(t2.abstencao)} (${pctStr(t2.abstencaoPct)}%) ·
    Brancos: ${fmt(t2.brancos)} (${pctStr(t2.brancosPct)}%) ·
    Nulos: ${fmt(t2.nulos)} (${pctStr(t2.nulosPct)}%)<br>
    No 1º turno (04 de outubro), Flávio Bolsonaro liderava com ${pctStr(pctSobre(t1.flavio, t1.validos))}% contra
    ${pctStr(pctSobre(t1.lula, t1.validos))}% de Lula, entre ${dados['1turno'].br.candidatos.length} candidatos na disputa.</p>`;
}

function renderRegioes(dados) {
  const regioes = agregarRegioes(dados);
  const linhas = Object.values(regioes).map((r) => ({
    regiao: r.regiao,
    nome: r.nome,
    eleitorado: r.turno1.eleitorado,
    comparecimentoPct2: pctSobre(r.turno2.comparecimento, r.turno2.eleitorado),
    lulaPct2: pctSobre(r.turno2.lula, r.turno2.validos),
    flavioPct2: pctSobre(r.turno2.flavio, r.turno2.validos),
    vencedor2: r.turno2.vencedor,
  }));

  $('#an-regioes-chart').innerHTML = graficoBarrasPareadas({
    rows: linhas.map((l) => ({ label: l.nome, a: l.lulaPct2, b: l.flavioPct2 })),
    corA: COR_LULA, corB: COR_FLAVIO,
    formatValor: (v) => `${pctStr(v)}%`,
  });
  $('#an-regioes-legenda').innerHTML = `<span><i class="mig-swatch" style="background:${COR_LULA}"></i>Lula</span><span><i class="mig-swatch" style="background:${COR_FLAVIO}"></i>Flávio Bolsonaro</span>`;

  const container = $('#an-regioes-tabela');
  tabelaOrdenavel(container, [
    { key: 'nome', label: 'Região' },
    { key: 'eleitorado', label: 'Eleitorado', align: 'num', format: (v) => fmt(v) },
    { key: 'comparecimentoPct2', label: 'Comparecimento 2T', align: 'num', format: (v) => `${pctStr(v)}%` },
    { key: 'lulaPct2', label: 'Lula 2T (%)', align: 'num', format: (v) => `${pctStr(v)}%` },
    { key: 'flavioPct2', label: 'Flávio 2T (%)', align: 'num', format: (v) => `${pctStr(v)}%` },
    { key: 'vencedor2', label: 'Vencedor', format: (v) => esc(nomeVencedor(v)) },
  ], linhas, { key: 'eleitorado', dir: -1 });

  return linhas;
}

function renderTransferencia(dados) {
  const nac = transferenciaNacional(dados);
  const porUf = transferenciaPorUf(dados);

  $('#an-transferencia-nacional').innerHTML = `
    <p>No 1º turno, <strong>${fmt(nac.outros1)}</strong> votos válidos foram para candidatos que não disputaram o 2º
    turno. Entre os turnos, Lula teve um ganho líquido de <strong>${fmt(nac.ganhoLula)}</strong> votos e Flávio
    Bolsonaro, de <strong>${fmt(nac.ganhoFlavio)}</strong> votos.</p>
    <div>${graficoBarrasHorizontais({
      rows: [
        { label: 'Ganho de Lula', value: nac.ganhoLula, color: COR_LULA },
        { label: 'Ganho de Flávio', value: nac.ganhoFlavio, color: COR_FLAVIO },
      ],
      formatValor: (v) => `${v >= 0 ? '+' : ''}${fmt(v)} votos`,
    })}</div>
    <p class="fine"><strong>Estimativa aritmética, não é pesquisa de boca de urna</strong>: dividindo o ganho líquido de
    cada candidato pelos ${fmt(nac.outros1)} votos que foram para os demais candidatos no 1º turno, o ganho de Lula
    equivale a ${nac.participacaoLulaPct == null ? '—' : `${pctStr(nac.participacaoLulaPct)}%`} desse total e o de
    Flávio, a ${nac.participacaoFlavioPct == null ? '—' : `${pctStr(nac.participacaoFlavioPct)}%`}. A soma pode passar
    de 100% (ou não chegar lá) porque o comparecimento, os brancos e os nulos também mudaram entre os turnos — a
    conta não rastreia o voto de cada eleitor, apenas os totais oficiais.</p>`;

  tabelaOrdenavel($('#an-transferencia-tabela'), [
    { key: 'uf', label: 'UF' },
    { key: 'nome', label: 'Estado' },
    { key: 'outros1', label: 'Outros no 1º turno', align: 'num', format: (v) => fmt(v) },
    { key: 'ganhoLula', label: 'Ganho Lula', align: 'num', format: (v) => `${v >= 0 ? '+' : ''}${fmt(v)}` },
    { key: 'ganhoFlavio', label: 'Ganho Flávio', align: 'num', format: (v) => `${v >= 0 ? '+' : ''}${fmt(v)}` },
    { key: 'participacaoLulaPct', label: 'Participação Lula (est.)', align: 'num', format: (v) => (v == null ? '—' : `${pctStr(v)}%`) },
    { key: 'participacaoFlavioPct', label: 'Participação Flávio (est.)', align: 'num', format: (v) => (v == null ? '—' : `${pctStr(v)}%`) },
  ], porUf, { key: 'ganhoLula', dir: -1 });

  return nac;
}

function renderParticipacao(dados) {
  const resumo = resumoNacional(dados);
  const t1 = resumo.turno1;
  const t2 = resumo.turno2;
  $('#an-participacao-chart').innerHTML = graficoBarrasPareadas({
    rows: [
      { label: 'Comparecimento (% eleitorado)', a: t1.comparecimentoPct, b: t2.comparecimentoPct },
      { label: 'Abstenção (% eleitorado)', a: t1.abstencaoPct, b: t2.abstencaoPct },
      { label: 'Brancos (% comparecimento)', a: t1.brancosPct, b: t2.brancosPct },
      { label: 'Nulos (% comparecimento)', a: t1.nulosPct, b: t2.nulosPct },
    ],
    corA: COR_T1, corB: COR_T2,
    formatValor: (v) => `${pctStr(v)}%`,
  });
  $('#an-participacao-legenda').innerHTML = `<span><i class="mig-swatch" style="background:${COR_T1}"></i>1º turno</span><span><i class="mig-swatch" style="background:${COR_T2}"></i>2º turno</span>`;
  return { t1, t2 };
}

function renderPadraoGeografico(dados) {
  const tabela = tabelaUfs(dados);
  const mudancas = mudancasDeVencedor(dados);

  const estiloPorUf = (uf) => {
    const row = tabela.find((r) => r.uf === uf);
    if (!row) return { fill: '#d5dbe3', title: uf };
    const cor = row.vencedor2 === 'LULA' ? COR_LULA : COR_FLAVIO;
    const fill = hexToRgba(cor, opacidadeMargem(row.margem2Pct));
    const base = `${row.nome}: ${esc(nomeVencedor(row.vencedor2))} venceu por ${pctStr(row.margem2Pct)} p.p.`;
    if (row.mudou) {
      return { fill, title: `${base} · mudou de vencedor (1º turno: ${esc(nomeVencedor(row.vencedor1))})`, stroke: '#ffcf4b', strokeWidth: 3.2 };
    }
    return { fill, title: base };
  };

  $('#an-map').innerHTML = renderMapaSvg(MAPA_BRASIL, estiloPorUf, { id: 'an-map-svg', ariaLabel: 'Mapa com o padrão geográfico da eleição' });
  $('#an-map-legend').innerHTML = `
    <span><i class="mig-swatch" style="background:${COR_LULA}"></i>Lula venceu</span>
    <span><i class="mig-swatch" style="background:${COR_FLAVIO}"></i>Flávio Bolsonaro venceu</span>
    ${mudancas.length ? '<span><i class="mig-swatch" style="background:#ffcf4b"></i>Contorno dourado: mudou de vencedor entre os turnos</span>' : ''}
    <span class="fine">Opacidade mais forte = margem de vitória maior</span>`;

  $('#an-mudancas').innerHTML = mudancas.length
    ? `<p><strong>${mudancas.length === 1 ? '1 estado mudou' : `${mudancas.length} estados mudaram`} de vencedor</strong> entre o 1º e o 2º turno:</p>
      <ul>${mudancas.map((m) => `<li><strong>${esc(m.nome)}</strong>: ${esc(nomeVencedor(m.vencedor1))} liderava no 1º turno (${pctStr(m.vencedor1 === 'LULA' ? m.lula1Pct : m.flavio1Pct)}%) e ${esc(nomeVencedor(m.vencedor2))} venceu no 2º turno (${pctStr(m.vencedor2 === 'LULA' ? m.lula2Pct : m.flavio2Pct)}%).</li>`).join('')}</ul>`
    : '<p>Nenhum estado mudou de vencedor entre o 1º e o 2º turno: quem liderava entre os dois finalistas no 1º turno também venceu no 2º turno em todas as UFs.</p>';

  return { tabela, mudancas };
}

function regiaoMaisForte(linhasRegiao, campo) {
  return linhasRegiao.reduce((melhor, atual) => (atual[campo] > (melhor?.[campo] ?? -Infinity) ? atual : melhor), null);
}

function renderConclusoes(dados, regioesLinhas, transfNacional, participacao, mudancas) {
  const resumo = resumoNacional(dados);
  const t2 = resumo.turno2;
  const melhorLula = regiaoMaisForte(regioesLinhas, 'lulaPct2');
  const melhorFlavio = regiaoMaisForte(regioesLinhas, 'flavioPct2');
  const compDelta = participacao.t2.comparecimentoPct - participacao.t1.comparecimentoPct;

  const pontos = [
    `${esc(nomeVencedor(t2.vencedor))} venceu a eleição presidencial de 2026 por ${pctStr(t2.margemPct)} pontos percentuais, em uma disputa polarizada entre dois nomes que já haviam liderado o 1º turno.`,
    `${esc(melhorLula.nome)} foi a região de maior força de Lula no 2º turno (${pctStr(melhorLula.lulaPct2)}% dos votos válidos), enquanto ${esc(melhorFlavio.nome)} foi a de maior força de Flávio Bolsonaro (${pctStr(melhorFlavio.flavioPct2)}%).`,
    mudancas.length
      ? `${mudancas.map((m) => esc(m.nome)).join(', ')} ${mudancas.length === 1 ? 'foi o único estado' : 'foram os estados'} que mudou(ram) de vencedor entre os turnos — nos demais, quem liderava entre os dois finalistas no 1º turno também venceu no 2º.`
      : 'Nenhum estado mudou de vencedor entre os turnos: a liderança entre os dois finalistas no 1º turno se manteve em todas as UFs no 2º turno.',
    `O comparecimento nacional ${compDelta >= 0 ? 'subiu' : 'caiu'} ${pctStr(Math.abs(compDelta))} pontos percentuais entre os turnos (de ${pctStr(participacao.t1.comparecimentoPct)}% para ${pctStr(participacao.t2.comparecimentoPct)}% do eleitorado).`,
    `Pela estimativa aritmética de transferência de voto, o ganho líquido de Lula (${fmt(transfNacional.ganhoLula)} votos) equivale a ${transfNacional.participacaoLulaPct == null ? '—' : `${pctStr(transfNacional.participacaoLulaPct)}%`} dos votos que foram para outros candidatos no 1º turno, e o de Flávio Bolsonaro (${fmt(transfNacional.ganhoFlavio)} votos), a ${transfNacional.participacaoFlavioPct == null ? '—' : `${pctStr(transfNacional.participacaoFlavioPct)}%`} — números que não substituem pesquisa de opinião sobre migração de voto.`,
  ];

  $('#an-conclusoes').innerHTML = pontos.map((p) => `<p>${p}</p>`).join('');
}

const HTML_SHELL = `
<section class="panel an-panel"><div class="section-title"><div><p class="eyebrow">ANÁLISE · 2º TURNO · 25 DE OUTUBRO DE 2026</p><h2>Resultado nacional</h2></div></div><div id="an-resumo"></div></section>
<section class="panel an-panel"><div class="section-title"><div><p class="eyebrow">REGIÕES</p><h2>Resultado por região</h2></div></div><div id="an-regioes-chart"></div><div id="an-regioes-legenda" class="mig-legend"></div><div id="an-regioes-tabela" class="ap-table-wrap"></div></section>
<section class="panel an-panel"><div class="section-title"><div><p class="eyebrow">TRANSFERÊNCIA DE VOTOS</p><h2>Do 1º para o 2º turno</h2></div></div><div id="an-transferencia-nacional"></div><p class="fine">Clique no cabeçalho de uma coluna para ordenar.</p><div id="an-transferencia-tabela" class="ap-table-wrap"></div></section>
<section class="panel an-panel"><div class="section-title"><div><p class="eyebrow">PARTICIPAÇÃO</p><h2>Comparecimento, abstenção, brancos e nulos</h2></div></div><div id="an-participacao-chart"></div><div id="an-participacao-legenda" class="mig-legend"></div></section>
<section class="panel an-panel"><div class="section-title"><div><p class="eyebrow">PADRÃO GEOGRÁFICO</p><h2>Onde cada lado avançou</h2></div></div><div class="ap-map-wrap"><div id="an-map" class="ap-map"></div><div id="an-map-legend" class="mig-legend"></div></div><div id="an-mudancas"></div></section>
<section class="panel an-panel"><div class="section-title"><div><p class="eyebrow">LEITURA</p><h2>Principais conclusões</h2></div></div><div id="an-conclusoes"></div><p class="fine">Fontes: <a href="https://resultados.tse.jus.br" target="_blank" rel="noopener">TSE Resultados</a> · <a href="https://electomaps.com.br/segundo-turno" target="_blank" rel="noopener">ElectoMaps</a> · <a href="https://apuracao-bayes-2026.netlify.app/" target="_blank" rel="noopener">Apuração × Projeção Bayesiana</a>.</p></section>`;

export async function bootAnalise() {
  const root = $('#analise-app');
  if (!root) return;
  root.innerHTML = HTML_SHELL;
  try {
    const dados = await carregarDados();
    renderResumoNacional(dados);
    const regioesLinhas = renderRegioes(dados);
    const transfNacional = renderTransferencia(dados);
    const participacao = renderParticipacao(dados);
    const { mudancas } = renderPadraoGeografico(dados);
    renderConclusoes(dados, regioesLinhas, transfNacional, participacao, mudancas);
  } catch (error) {
    root.innerHTML = `<section class="panel an-panel"><p class="empty">Não foi possível carregar dados/resultados-2026.json (${esc(error.message || error)}).</p></section>`;
  }
}

window.bootAnalise = bootAnalise;
