'use strict';

import { tabelaUfs, resumoNacional, votosDoCandidato, NUM_LULA, NUM_FLAVIO } from '../analise/aggregate.mjs';
import { MAPA_BRASIL, renderMapaSvg } from '../mapa-brasil.mjs';
import { tabelaOrdenavel } from '../analise/tabela.mjs';
import { APURACAO_CONFIG } from './config.mjs';
import { buildTseResultUrls, parseApuracaoPayload } from './parser.mjs';
import { fetchTseJson } from './fetch.mjs';

const CANDIDATO = {
  LULA: { numero: '13', partido: 'PT', nome: 'Lula', foto: 'fotos/280002542548.jpg', cor: '#c5343a' },
  FLAVIO: { numero: '22', partido: 'PL', nome: 'Flávio Bolsonaro', foto: 'fotos/280002551544.jpg', cor: '#234f83' },
};

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
function parsePct(s) {
  const n = Number(String(s ?? '0').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
}
function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function opacidadeMargem(margemPct) {
  return Math.min(1, 0.32 + (Math.min(margemPct, 40) / 40) * 0.68);
}

let dados = null;
let tabela = [];
let liveOverride = null;

async function carregarDadosLocais() {
  const res = await fetch('dados/resultados-2026.json', { cache: 'no-store' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function cardCandidato(chave, votos, pctValidos, vencedor) {
  const c = CANDIDATO[chave];
  const ganhou = chave === vencedor;
  return `<article class="ap-card${ganhou ? ' ap-card-vencedor' : ''}" style="--ap-cor:${c.cor}">
    <span class="ap-card-photo"><img src="${esc(c.foto)}" alt="" onerror="this.remove()"><span aria-hidden="true">${esc(c.nome[0])}</span></span>
    <div class="ap-card-body">
      <strong>${esc(c.nome)}${ganhou ? ' <span class="badge badge-eleito">Eleito</span>' : ''}</strong>
      <small>${esc(c.partido)} · nº ${esc(c.numero)}</small>
      <div class="ap-card-votes"><b>${pctStr(pctValidos)}%</b><span>${fmt(votos)} votos válidos</span></div>
    </div>
  </article>`;
}

function renderResumo(resumo, fonteLabel) {
  const t2 = resumo.turno2;
  const lulaPct = t2.validos > 0 ? (t2.lula / t2.validos) * 100 : 0;
  const flavioPct = t2.validos > 0 ? (t2.flavio / t2.validos) * 100 : 0;

  $('#ap-pill').textContent = t2.vencedor === 'LULA' ? 'Lula eleito' : 'Flávio Bolsonaro eleito';
  $('#ap-cards').innerHTML = cardCandidato('LULA', t2.lula, lulaPct, t2.vencedor)
    + cardCandidato('FLAVIO', t2.flavio, flavioPct, t2.vencedor);

  const secoesPct = parsePct(t2.secoes_totalizadas_pct);
  $('#ap-progress-bar').style.width = `${Math.min(100, secoesPct)}%`;
  $('#ap-progress-label').textContent = `${pctStr(secoesPct)}% das seções totalizadas`;
  $('#ap-updated').textContent = `Atualizado em ${esc(t2.atualizado)} (${esc(fonteLabel)})`;

  $('#ap-totals').innerHTML = `<p class="result-totals">
    <strong>Comparecimento:</strong> ${fmt(t2.comparecimento)} (${pctStr(t2.comparecimentoPct)}%) ·
    <strong>Abstenção:</strong> ${fmt(t2.abstencao)} (${pctStr(t2.abstencaoPct)}%) ·
    <strong>Brancos:</strong> ${fmt(t2.brancos)} (${pctStr(t2.brancosPct)}%) ·
    <strong>Nulos:</strong> ${fmt(t2.nulos)} (${pctStr(t2.nulosPct)}%)</p>`;
}

function estiloMapaUf(uf) {
  const row = tabela.find((r) => r.uf === uf);
  if (!row) return { fill: '#d5dbe3', title: uf };
  const cor = row.vencedor2 === 'LULA' ? CANDIDATO.LULA.cor : CANDIDATO.FLAVIO.cor;
  const fill = hexToRgba(cor, opacidadeMargem(row.margem2Pct));
  const nomeVenc = row.vencedor2 === 'LULA' ? 'Lula' : 'Flávio Bolsonaro';
  return { fill, title: `${row.nome}: ${nomeVenc} venceu por ${pctStr(row.margem2Pct)} p.p.` };
}

function renderMapa() {
  $('#ap-map').innerHTML = renderMapaSvg(MAPA_BRASIL, estiloMapaUf, { id: 'ap-map-svg', ariaLabel: 'Mapa do Brasil com o vencedor do 2º turno por estado' });
  $('#ap-map-legend').innerHTML = `
    <span><i class="mig-swatch" style="background:${CANDIDATO.LULA.cor}"></i>Lula venceu</span>
    <span><i class="mig-swatch" style="background:${CANDIDATO.FLAVIO.cor}"></i>Flávio Bolsonaro venceu</span>
    <span class="fine">Opacidade mais forte = margem de vitória maior</span>`;
}

function renderTabela() {
  const linhas = tabela.map((r) => ({
    uf: r.uf, nome: r.nome,
    lula2: r.lula2, lula2Pct: r.lula2Pct,
    flavio2: r.flavio2, flavio2Pct: r.flavio2Pct,
    vencedor2: r.vencedor2,
    margem2Pct: r.margem2Pct,
  }));
  tabelaOrdenavel($('#ap-table-wrap'), [
    { key: 'uf', label: 'UF' },
    { key: 'lula2', label: 'Lula (votos)', align: 'num', format: (v) => fmt(v) },
    { key: 'lula2Pct', label: 'Lula (%)', align: 'num', format: (v) => `${pctStr(v)}%` },
    { key: 'flavio2', label: 'Flávio (votos)', align: 'num', format: (v) => fmt(v) },
    { key: 'flavio2Pct', label: 'Flávio (%)', align: 'num', format: (v) => `${pctStr(v)}%` },
    { key: 'vencedor2', label: 'Vencedor', format: (v) => v === 'LULA' ? 'Lula' : 'Flávio Bolsonaro' },
    { key: 'margem2Pct', label: 'Margem (p.p.)', align: 'num', format: (v) => pctStr(v) },
  ], linhas, { key: 'lula2', dir: -1 });
}

function renderTudo(resumo, fonteLabel) {
  renderResumo(resumo, fonteLabel);
  renderMapa();
  renderTabela();
}

async function tentarFeedAoVivo() {
  const status = $('#ap-live-status');
  const spec = APURACAO_CONFIG.elections.presidente;
  if (!spec.pathId || !spec.fileId) {
    status.textContent = `Os códigos do 2º turno (eleição ${APURACAO_CONFIG.referenceSecondRound.presidente}) ainda não foram preenchidos em apuracao/config.mjs. Mostrando o resultado final consolidado.`;
    return;
  }
  status.textContent = 'Buscando dados ao vivo do TSE…';
  try {
    const urls = buildTseResultUrls(APURACAO_CONFIG, 'presidente');
    let payload, usedUrl;
    let lastError;
    for (const url of urls) {
      try { payload = await fetchTseJson(url); usedUrl = url; break; }
      catch (error) { lastError = error; }
    }
    if (!payload) throw lastError || new Error('Sem resposta do TSE');
    const parsed = parseApuracaoPayload(payload, { cargo: spec.cargo, scope: 'br' });
    const lula = parsed.candidates.find((c) => c.number === NUM_LULA);
    const flavio = parsed.candidates.find((c) => c.number === NUM_FLAVIO);
    if (!lula || !flavio) throw new Error('Candidatos não encontrados no retorno do TSE');
    liveOverride = JSON.parse(JSON.stringify(dados));
    liveOverride['2turno'].br = {
      atualizado: `${parsed.updated.date} ${parsed.updated.time}`.trim(),
      secoes_totalizadas_pct: String(parsed.sections.percent),
      eleitorado: parsed.electorate.total,
      comparecimento: parsed.electorate.voted,
      abstencao: parsed.electorate.abstention,
      validos: parsed.votes.valid,
      brancos: parsed.votes.blank,
      nulos: parsed.votes.null,
      candidatos: [
        { numero: flavio.number, nome: 'FLAVIO BOLSONARO', partido: 'PL', votos: flavio.votes },
        { numero: lula.number, nome: 'LULA', partido: 'PT', votos: lula.votes },
      ],
    };
    tabela = tabelaUfs(liveOverride);
    renderTudo(resumoNacional(liveOverride), `feed ao vivo do TSE · ${esc(usedUrl)}`);
    status.textContent = 'Atualizado com o feed ao vivo do TSE.';
  } catch (error) {
    status.textContent = `Não foi possível buscar o feed ao vivo agora (${error.message || error}). Mostrando o resultado final consolidado.`;
  }
}

export async function bootApuracaoPresidente() {
  try {
    dados = await carregarDadosLocais();
  } catch (error) {
    $('#ap-pill').textContent = 'Erro ao carregar dados';
    $('#ap-cards').innerHTML = `<p class="empty">Não foi possível carregar dados/resultados-2026.json (${esc(error.message || error)}).</p>`;
    return;
  }
  tabela = tabelaUfs(dados);
  renderTudo(resumoNacional(dados), 'arquivo consolidado dados/resultados-2026.json');
  const btn = $('#ap-live-refresh');
  if (btn) btn.addEventListener('click', tentarFeedAoVivo);
}

window.bootApuracaoPresidente = bootApuracaoPresidente;
