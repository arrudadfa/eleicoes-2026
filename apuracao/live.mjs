'use strict';

import { APURACAO_CONFIG } from './config.mjs';
import { buildTseResultUrls, parseApuracaoPayload } from './parser.mjs';
import { fetchTseJson } from './fetch.mjs';

let timer = null;
let countdownTimer = null;
let secondsLeft = APURACAO_CONFIG.refreshSeconds;
let active = false;
let role = 'presidente';
let ufGov = 'AC';
let lastError = '';
let deps = {};

const $ = (sel) => document.querySelector(sel);

function fmt(n) {
  return deps.fmt ? deps.fmt(n) : Number(n).toLocaleString('pt-BR');
}

function esc(s) {
  return deps.esc ? deps.esc(s) : String(s ?? '');
}

function stateLabel(name) {
  if (deps.stateName) return deps.stateName(name);
  return name;
}

function renderStatus(data, urls) {
  const pill = $('#apuracao-pill');
  const meta = $('#apuracao-meta');
  const wait = $('#apuracao-waiting');
  const err = $('#apuracao-error');
  const body = $('#apuracao-body');
  const countdown = $('#apuracao-countdown');

  if (!pill || !meta) return;

  const missingIds = !APURACAO_CONFIG.elections.presidente.pathId;
  if (missingIds) {
    pill.textContent = 'Configurar IDs';
    meta.innerHTML = '<p class="metadata">Os códigos do 2º turno ainda não estão em <code>apuracao/config.mjs</code>. Atualize <code>pathId</code> e <code>fileId</code> de presidente e governador quando o TSE publicar (referência 2022: pleito <strong>545</strong>).</p>';
    if (wait) wait.hidden = false;
    if (body) body.hidden = true;
    if (err) err.hidden = true;
    if (countdown) countdown.textContent = '';
    return;
  }

  if (lastError) {
    pill.textContent = 'Erro na atualização';
    if (err) {
      err.hidden = false;
      err.textContent = lastError;
    }
  } else if (err) err.hidden = true;

  if (!data || data.state === 'waiting') {
    pill.textContent = 'Aguardando apuração';
    if (wait) wait.hidden = false;
    if (body) body.hidden = true;
    meta.innerHTML = `<p class="metadata">Fonte: <a href="${esc(urls[0] || 'https://resultados.tse.jus.br/oficial/ele2026/')}" target="_blank" rel="noopener">resultados.tse.jus.br</a> · Atualização automática a cada ${APURACAO_CONFIG.refreshSeconds}s (horário de Brasília).</p>`;
    return;
  }

  if (wait) wait.hidden = true;
  if (body) body.hidden = false;

  pill.textContent = data.closed ? 'Apuração encerrada' : 'Apuração em andamento';
  const when = data.updated.date && data.updated.time
    ? `${data.updated.date} ${data.updated.time} (BRT)`
    : '—';
  meta.innerHTML = `<p class="metadata"><strong>${esc(data.sections.percent.toFixed(2).replace('.', ','))}%</strong> das seções totalizadas (${fmt(data.sections.counted)} de ${fmt(data.sections.total)}). Última atualização TSE: <strong>${esc(when)}</strong>.<br>Fonte: <a href="${esc(urls[0])}" target="_blank" rel="noopener">arquivo oficial JSON</a></p>`;
}

function renderBars(data) {
  const list = $('#apuracao-candidates');
  const totals = $('#apuracao-totals');
  if (!list || !totals || !data) return;

  const maxPct = Math.max(...data.candidates.map((c) => c.percentValid), 1);
  list.innerHTML = data.candidates.map((c, i) => `
    <div class="bar-row apuracao-row">
      <span class="bar-label"><strong>${i + 1}. ${esc(c.name)}</strong><small>Nº ${esc(c.number)}${c.status ? ' · ' + esc(c.status) : ''}</small></span>
      <div class="bar-track"><div class="bar" style="width:${(c.percentValid / maxPct) * 100}%"></div></div>
      <strong>${esc(String(c.percentValid).replace('.', ','))}%</strong>
    </div>
    <p class="fine apuracao-votes-line">${fmt(c.votes)} votos válidos</p>
  `).join('') || '<p class="empty">Nenhum candidato com votos no arquivo ainda.</p>';

  totals.innerHTML = `
    <p class="result-totals"><strong>Votos válidos:</strong> ${fmt(data.votes.valid)} ·
    <strong>Brancos:</strong> ${fmt(data.votes.blank)} (${data.blankPct.toFixed(2).replace('.', ',')}%) ·
    <strong>Nulos:</strong> ${fmt(data.votes.null)} (${data.nullPct.toFixed(2).replace('.', ',')}%) ·
    <strong>Abstenção:</strong> ${fmt(data.electorate.abstention)} (${String(data.electorate.abstentionPct).replace('.', ',')}%)</p>
  `;
}

async function loadOnce() {
  const urls = buildTseResultUrls(APURACAO_CONFIG, role, ufGov);
  if (!urls.length) {
    renderStatus(null, []);
    return;
  }

  let payload;
  let usedUrl = urls[0];
  lastError = '';
  for (const url of urls) {
    try {
      payload = await fetchTseJson(url);
      usedUrl = url;
      break;
    } catch (error) {
      lastError = error.message || 'Não foi possível ler o TSE';
    }
  }

  if (!payload) {
    renderStatus({ state: 'waiting' }, urls);
    return;
  }

  const scope = role === 'presidente' ? 'br' : ufGov.toLowerCase();
  const cargo = APURACAO_CONFIG.elections[role].cargo;
  const data = parseApuracaoPayload(payload, { cargo, scope });
  renderStatus(data, [usedUrl]);
  renderBars(data);
}

function tickCountdown() {
  const el = $('#apuracao-countdown');
  if (!el || !active) return;
  el.textContent = `Próxima atualização em ${secondsLeft}s`;
  secondsLeft -= 1;
  if (secondsLeft < 0) {
    secondsLeft = APURACAO_CONFIG.refreshSeconds;
    loadOnce().catch(() => {});
  }
}

function bindControls() {
  const tabs = $('#apuracao-role-tabs');
  if (tabs && !tabs.dataset.bound) {
    tabs.dataset.bound = '1';
    tabs.addEventListener('click', (event) => {
      const btn = event.target.closest('[data-ap-role]');
      if (!btn) return;
      role = btn.dataset.apRole;
      tabs.querySelectorAll('button').forEach((b) => {
        b.classList.toggle('active', b === btn);
        b.setAttribute('aria-pressed', String(b === btn));
      });
      const ufWrap = $('#apuracao-uf-wrap');
      if (ufWrap) ufWrap.hidden = role !== 'governador';
      loadOnce().catch(() => {});
    });
  }

  const ufSel = $('#apuracao-uf');
  if (ufSel && !ufSel.dataset.bound) {
    ufSel.dataset.bound = '1';
    ufSel.addEventListener('change', () => {
      ufGov = ufSel.value;
      loadOnce().catch(() => {});
    });
  }

  const refreshBtn = $('#apuracao-refresh');
  if (refreshBtn && !refreshBtn.dataset.bound) {
    refreshBtn.dataset.bound = '1';
    refreshBtn.addEventListener('click', () => {
      secondsLeft = APURACAO_CONFIG.refreshSeconds;
      loadOnce().catch(() => {});
    });
  }
}

function fillUfSelect() {
  const sel = $('#apuracao-uf');
  if (!sel || sel.options.length) return;
  const states = deps.STATES || [];
  const runoff = new Set(APURACAO_CONFIG.runoffGovernorUfs);
  sel.innerHTML = states.map(([code, name]) => {
    const dis = runoff.has(code) ? '' : ' disabled';
    const note = runoff.has(code) ? '' : ' (governo já definido)';
    return `<option value="${code}"${dis}${code === ufGov ? ' selected' : ''}>${esc(name)} (${code})${note}</option>`;
  }).join('');
  if (!runoff.has(ufGov)) ufGov = APURACAO_CONFIG.runoffGovernorUfs[0];
  sel.value = ufGov;
}

export function bootApuracao(helpers = {}) {
  deps = helpers;
  bindControls();
  fillUfSelect();
}

export function startApuracaoPolling() {
  active = true;
  secondsLeft = APURACAO_CONFIG.refreshSeconds;
  if (timer) clearInterval(timer);
  if (countdownTimer) clearInterval(countdownTimer);
  loadOnce().catch(() => {});
  countdownTimer = setInterval(tickCountdown, 1000);
}

export function stopApuracaoPolling() {
  active = false;
  if (countdownTimer) clearInterval(countdownTimer);
  countdownTimer = null;
}

window.bootApuracaoLive = bootApuracao;
window.startApuracaoPolling = startApuracaoPolling;
window.stopApuracaoPolling = stopApuracaoPolling;
