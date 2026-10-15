'use strict';
window.bootMigracao = function () {
  const root = document.querySelector('#mig-app');
  if (!root) return;
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const STORE = 'meu-voto-2026-migracao';
  const VALIDOS = 119300788;
  const APTOS = 158745079;
  const VOTOS = {
    flavio: 56104503,
    lula: 53879538,
    cury: 3448569,
    renan: 2675887,
    caiado: 2605148,
    demais: 587143,
    grupo: 9056092,
    micro: 260655,
    ausentes: 39444291
  };
  const QUAEST = {
    baseF: { flavio: 100, lula: 0, fora: 0, indeciso: 0 },
    baseL: { flavio: 0, lula: 100, fora: 0, indeciso: 0 },
    cury: { flavio: 30, lula: 34, fora: 30, indeciso: 6 },
    renan: { flavio: 40, lula: 14, fora: 43, indeciso: 3 },
    caiado: { flavio: 42, lula: 23, fora: 33, indeciso: 2 },
    demais: { flavio: 38, lula: 33, fora: 22, indeciso: 7 },
    ausentes: { flavio: 38, lula: 43, fora: 17, indeciso: 2 }
  };
  const DATAFOLHA = {
    baseF: { flavio: 100, lula: 0, fora: 0, indeciso: 0 },
    baseL: { flavio: 0, lula: 100, fora: 0, indeciso: 0 },
    grupo: { flavio: 46, lula: 32, fora: 0, indeciso: 0 },
    micro: { flavio: 0, lula: 0, fora: 0, indeciso: 0 },
    ausentes: { flavio: 0, lula: 0, fora: 100, indeciso: 0 }
  };
  const ORIGENS = {
    quaest: [
      ['baseF', 'Base de Flávio', '56.104.503 votos no 1º turno. A pesquisa não abriu a permanência.', VOTOS.flavio, 'hipótese', null],
      ['baseL', 'Base de Lula', '53.879.538 votos no 1º turno. A permanência também é hipótese.', VOTOS.lula, 'hipótese', null],
      ['cury', 'Augusto Cury', 'Avante · 3.448.569 · 2,89% dos válidos. O G1 descreve o grupo como 2% da amostra.', VOTOS.cury, 'taxa publicada', 43],
      ['renan', 'Renan Santos', 'Missão · 2.675.887 · 2,24% dos válidos.', VOTOS.renan, 'taxa publicada', 43],
      ['caiado', 'Ronaldo Caiado', 'PSD · 2.605.148 · 2,18% dos válidos.', VOTOS.caiado, 'taxa publicada', 43],
      ['demais', 'Demais candidatos', '587.143 votos abaixo de 1%, inclusive Zema (326.488).', VOTOS.demais, 'taxa publicada', 21],
      ['ausentes', 'Branco, nulo e abstenção', '39.444.291 pessoas. Cerca de 22% da amostra da Quaest.', VOTOS.ausentes, 'taxa publicada', 474]
    ],
    datafolha: [
      ['baseF', 'Base de Flávio', '56.104.503 votos. O Datafolha não publicou esta fidelidade.', VOTOS.flavio, 'hipótese', null],
      ['baseL', 'Base de Lula', '53.879.538 votos. Permanência editável.', VOTOS.lula, 'hipótese', null],
      ['grupo', 'Cury, Renan, Caiado e Zema', '9.056.092 votos. Publicados 46% para Flávio e 32% para Lula.', VOTOS.grupo, 'grupo publicado', 144],
      ['micro', 'Demais, sem Zema', '260.655 votos. Este recorte não foi aberto.', VOTOS.micro, 'sem taxa', null],
      ['ausentes', 'Branco, nulo e abstenção', '39.444.291 pessoas. Sem taxa publicada.', VOTOS.ausentes, 'sem taxa', null]
    ]
  };
  const POLLS = [
    ['Datafolha', '6 e 7/10', '2.520', '2 p.p.', '49–45', 52, 48, '52–48, publicado', 'BR-02949/2026'],
    ['PoderData', '5 a 7/10', '3.000', '1,8 p.p.', 'só válidos', 53, 47, '53–47, URA', 'BR-08134/2026'],
    ['AtlasIntel', '3 a 8/10', '5.026', '1 p.p.', '51,1–45,7', 52.8, 47.2, '52,8–47,2, publicado', 'BR-03663/2026'],
    ['Ipespe', '6 a 8/10', '1.500', '2,6 p.p.', '49–44, soma 101', 52.7, 47.3, '52,7–47,3, exercício do instituto', 'não informado'],
    ['Quaest', '10 a 13/10', '2.154', '2 p.p.', '46–44', 51.1, 48.9, '51,1–48,9, conversão 46/(46+44)', 'BR-08729/2026']
  ];
  const CORES = { flavio: '#234f83', lula: '#a56b12', fora: '#8aa0b8', indeciso: '#c5ced8', aberto: '#d4b45a' };
  const DESTINOS = [
    ['flavio', 'Flávio no 2º turno'],
    ['lula', 'Lula no 2º turno'],
    ['fora', 'Branco, nulo ou ausente'],
    ['indeciso', 'Indeciso'],
    ['aberto', 'Sem destino publicado']
  ];
  const state = {
    scenario: 'quaest',
    view: 'migracao',
    mobilize: false,
    rates: {},
    headName: 'Outra fonte',
    headF: '',
    headL: '',
    oddF: '',
    oddL: '',
    oddO: ''
  };
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved && typeof saved === 'object') Object.assign(state, saved);
    if (state.scenario !== 'quaest' && state.scenario !== 'datafolha' && state.scenario !== 'propria') state.scenario = 'quaest';
    if (state.view !== 'migracao' && state.view !== 'completo') state.view = 'migracao';
    if (!state.rates || typeof state.rates !== 'object') state.rates = {};
  } catch {}

  function save() {
    try { localStorage.setItem(STORE, JSON.stringify(state)); } catch {}
  }
  function bag() { return state.scenario === 'datafolha' ? DATAFOLHA : QUAEST; }
  function metas() { return state.scenario === 'datafolha' ? ORIGENS.datafolha : ORIGENS.quaest; }
  function num(raw) {
    const n = Number(String(raw ?? '').trim().replace('%', '').replace(',', '.'));
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  function pctNum(raw) {
    const n = Number(String(raw ?? '').trim().replace('%', '').replace(',', '.'));
    return Number.isFinite(n) && n >= 0 ? n : 0;
  }
  function odd(raw) {
    const n = Number(String(raw ?? '').trim().replace(',', '.'));
    return Number.isFinite(n) && n > 1 ? n : null;
  }
  function fmt(n) { return Math.round(n).toLocaleString('pt-BR'); }
  function pct1(n) { return n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%'; }
  function mi(n) {
    const digits = Math.abs(n) >= 10000000 ? 1 : 2;
    return (n / 1000000).toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits }) + ' mi';
  }
  function mediana(xs) {
    const s = xs.slice().sort((a, b) => a - b);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }
  function moe(percent, n) {
    if (!n || percent <= 0 || percent >= 100) return null;
    const p = percent / 100;
    return 1.96 * Math.sqrt((p * (1 - p)) / n) * 100;
  }
  function ratesOf(id) {
    const key = state.scenario + ':' + id;
    const stored = state.rates[key];
    const base = stored || bag()[id];
    return {
      flavio: pctNum(stored ? stored.flavio : base.flavio),
      lula: pctNum(stored ? stored.lula : base.lula),
      fora: pctNum(stored ? stored.fora : base.fora),
      indeciso: pctNum(stored ? stored.indeciso : base.indeciso)
    };
  }
  function shownRates(id) {
    const rates = ratesOf(id);
    if (id === 'ausentes' && !state.mobilize) return { flavio: 0, lula: 0, fora: 100, indeciso: 0 };
    return rates;
  }
  function inputRates(id) {
    const key = state.scenario + ':' + id;
    const stored = state.rates[key];
    const base = bag()[id];
    return {
      flavio: stored ? stored.flavio : String(base.flavio),
      lula: stored ? stored.lula : String(base.lula),
      fora: stored ? stored.fora : String(base.fora),
      indeciso: stored ? stored.indeciso : String(base.indeciso)
    };
  }
  function split(votes, rates) {
    const keys = ['flavio', 'lula', 'fora', 'indeciso'];
    const sum = keys.reduce((acc, key) => acc + rates[key], 0);
    const scale = sum > 100 ? 100 / sum : 1;
    const used = sum * scale;
    const floats = {
      flavio: votes * rates.flavio * scale / 100,
      lula: votes * rates.lula * scale / 100,
      fora: votes * rates.fora * scale / 100,
      indeciso: votes * rates.indeciso * scale / 100,
      aberto: votes * (100 - used) / 100
    };
    const order = ['flavio', 'lula', 'fora', 'indeciso', 'aberto'];
    const rounded = order.map(key => Math.round(floats[key]));
    let drift = Math.round(votes) - rounded.reduce((acc, value) => acc + value, 0);
    let largest = 0;
    rounded.forEach((value, index) => { if (value > rounded[largest]) largest = index; });
    rounded[largest] += drift;
    return { flavio: rounded[0], lula: rounded[1], fora: rounded[2], indeciso: rounded[3], aberto: rounded[4] };
  }
  function conta() {
    return metas().map(meta => ({ meta, rates: shownRates(meta[0]), parts: split(meta[3], shownRates(meta[0])) }));
  }
  function totais(rows) {
    const total = { flavio: 0, lula: 0, fora: 0, indeciso: 0, aberto: 0 };
    rows.forEach(row => DESTINOS.forEach(([key]) => { total[key] += row.parts[key]; }));
    return total;
  }

  root.innerHTML = `
    <section class="panel">
      <div class="section-title"><div><p class="eyebrow">PRESIDÊNCIA · 25 DE OUTUBRO</p><h2>Migração de votos</h2></div><span class="pill">Estimativa</span></div>
      <p class="metadata" id="mig-lead"></p>
      <div class="office-tabs" id="mig-source" role="group" aria-label="Fonte da matriz"></div>
      <div class="office-tabs" id="mig-view" role="group" aria-label="Recorte do diagrama"></div>
      <div class="mig-stats" id="mig-stats"></div>
      <div id="mig-svg"></div>
      <div class="mig-legend" id="mig-legend"></div>
      <p class="fine" id="mig-note"></p>
      <div id="mig-warn"></div>
      <div class="mig-scroll"><table class="mig-table"><thead><tr><th>Origem</th><th>Votos</th><th>Flávio</th><th>Lula</th><th>Fora</th><th>Indeciso</th><th>Resto</th></tr></thead><tbody id="mig-flows"></tbody></table></div>
    </section>
    <section class="panel">
      <div class="section-title"><div><h2>Taxas de cada origem</h2></div><button type="button" id="mig-reset">Restaurar</button></div>
      <label class="mig-check"><input type="checkbox" id="mig-mobilize"> Incluir branco, nulo e abstenção como origem de voto</label>
      <p class="fine" id="mig-rate-note"></p>
      <div id="mig-rates"></div>
    </section>
    <section class="panel">
      <h2>Cômputo esperado</h2>
      <p class="metadata" id="mig-computo"></p>
      <div class="mig-stats" id="mig-median"></div>
      <div class="poll-rows" id="mig-bars"></div>
      <div class="mig-scroll"><table class="mig-table"><thead><tr><th>Instituto</th><th>Campo</th><th>n</th><th>Margem</th><th>Totais</th><th>Válidos</th><th>Registro</th></tr></thead><tbody id="mig-polls"></tbody></table></div>
      <p class="fine">Eixo das barras: percentual dos votos válidos, a partir de zero, no mesmo desenho das outras pesquisas do painel. A barra da Quaest converte 46 e 44. PoderData é telefone com URA. O campo da AtlasIntel começou em 3/10. A última barra, quando houver, é a leitura digitada abaixo e fica fora da mediana.</p>
      <h3>Outra leitura de votos válidos</h3>
      <div class="mig-fields">
        <label>Fonte<input id="mig-head-name" type="text" placeholder="Paraná, MDA, EPP, Amostragem…"></label>
        <label>Flávio %<input id="mig-head-f" type="text" inputmode="decimal" placeholder="52,7"></label>
        <label>Lula %<input id="mig-head-l" type="text" inputmode="decimal" placeholder="47,3"></label>
      </div>
      <p class="fine" id="mig-user"></p>
      <h3>Casa de apostas</h3>
      <p class="fine">Cotação decimal. A probabilidade implícita reparte o ágio da casa.</p>
      <div class="mig-fields">
        <label>Odd de Flávio<input id="mig-odd-f" type="text" inputmode="decimal" placeholder="1,80"></label>
        <label>Odd de Lula<input id="mig-odd-l" type="text" inputmode="decimal" placeholder="2,10"></label>
        <label>Odd de outro, opcional<input id="mig-odd-o" type="text" inputmode="decimal"></label>
      </div>
      <p class="fine" id="mig-book"></p>
      <p class="fine">Urnas: TSE, 100% das 499.248 seções, arquivo de 05/10/2026 às 12:51. Transferência: <a href="https://g1.globo.com/politica/eleicoes/2026/pesquisa-eleitoral/noticia/2026/10/14/quaest-43percent-dos-eleitores-que-se-abstiveram-no-primeiro-turno-declaram-voto-em-lula-no-segundo.ghtml" target="_blank" rel="noopener">Quaest no G1, 14/10</a> · <a href="https://noticias.uol.com.br/eleicoes/2026/10/14/quaest-presidencial-intencao-de-voto-segundo-turno.ghtm" target="_blank" rel="noopener">UOL, 46%–44%</a> · <a href="https://datafolha.folha.uol.com.br/eleicoes/2026/10/flavio-bolsonaro-pl-tem-49-na-largada-do-2o-turno-contra-45-de-lula-pt.shtml" target="_blank" rel="noopener">Datafolha</a> · <a href="https://www.bbc.com/portuguese/articles/cm1dlv13yql9o" target="_blank" rel="noopener">agregador da BBC em 15/10</a>. Esta tela estima. O resultado do dia 25 sai da apuração do TSE.</p>
    </section>`;

  const medianF = mediana(POLLS.map(p => p[5]));
  const medianL = mediana(POLLS.map(p => p[6]));

  function desenho(rows) {
    return rows.filter(row => {
      if (state.view === 'completo') return true;
      const id = row.meta[0];
      return id !== 'baseF' && id !== 'baseL' && id !== 'ausentes';
    });
  }
  function sankey(rows) {
    const width = 980;
    const leftGutter = 214;
    const rightGutter = 236;
    const nodeW = 12;
    const gap = 14;
    const sources = rows.map(row => ({
      id: row.meta[0],
      label: row.meta[1],
      value: DESTINOS.reduce((acc, [key]) => acc + row.parts[key], 0),
      parts: row.parts
    })).filter(row => row.value > 0);
    const dests = DESTINOS.map(([id, label]) => ({
      id, label, value: sources.reduce((acc, row) => acc + row.parts[id], 0)
    })).filter(row => row.value > 0);
    const inner = Math.max(300, Math.max(sources.length, dests.length, 1) * 64);
    const place = items => {
      const total = items.reduce((acc, item) => acc + item.value, 0) || 1;
      const usable = inner - gap * Math.max(0, items.length - 1);
      let y = 18;
      return items.map(item => {
        const h = item.value / total * usable;
        const node = Object.assign({ y, h }, item);
        y += h + gap;
        return node;
      });
    };
    const left = place(sources);
    const right = place(dests);
    const leftMap = Object.fromEntries(left.map(node => [node.id, node]));
    const rightMap = Object.fromEntries(right.map(node => [node.id, node]));
    const srcCursor = {};
    const tgtCursor = {};
    left.forEach(node => { srcCursor[node.id] = node.y; });
    right.forEach(node => { tgtCursor[node.id] = node.y; });
    const x0 = leftGutter + nodeW;
    const x1 = width - rightGutter;
    const curve = (x1 - x0) * 0.5;
    const ribbons = [];
    sources.forEach(source => {
      DESTINOS.forEach(([dest]) => {
        const value = source.parts[dest];
        const sourceNode = leftMap[source.id];
        const targetNode = rightMap[dest];
        if (!sourceNode || !targetNode || value <= 0) return;
        const sh = value / sourceNode.value * sourceNode.h;
        const th = value / targetNode.value * targetNode.h;
        const y0a = srcCursor[source.id];
        const y1a = tgtCursor[dest];
        srcCursor[source.id] += sh;
        tgtCursor[dest] += th;
        ribbons.push({ dest, title: `${source.label} para ${DESTINOS.find(item => item[0] === dest)[1]}: ${fmt(value)} votos`, d: `M ${x0} ${y0a} C ${x0 + curve} ${y0a}, ${x1 - curve} ${y1a}, ${x1} ${y1a} L ${x1} ${y1a + th} C ${x1 - curve} ${y1a + th}, ${x0 + curve} ${y0a + sh}, ${x0} ${y0a + sh} Z` });
      });
    });
    const text = (node, x, anchor) => node.h < 22 ? '' : `<text x="${x}" y="${node.y + node.h / 2}" text-anchor="${anchor}" dominant-baseline="middle" fill="#172c45" font-size="14"><tspan x="${x}" dy="-0.35em">${esc(node.label)}</tspan><tspan x="${x}" dy="1.25em" fill="#54657a" font-size="12">${esc(mi(node.value))} votos</tspan></text>`;
    return `<svg viewBox="0 0 ${width} ${inner + 28}" width="100%" role="img" aria-label="Diagrama de Sankey da migração de votos do primeiro para o segundo turno">
      ${ribbons.map(ribbon => `<path d="${ribbon.d}" fill="${CORES[ribbon.dest]}" fill-opacity="0.72"><title>${esc(ribbon.title)}</title></path>`).join('')}
      ${left.map(node => `<rect x="${leftGutter}" y="${node.y}" width="${nodeW}" height="${Math.max(node.h, 1)}" fill="#e7eef6" stroke="#dce4ee"></rect>${text(node, leftGutter - 8, 'end')}`).join('')}
      ${right.map(node => `<rect x="${x1}" y="${node.y}" width="${nodeW}" height="${Math.max(node.h, 1)}" fill="${CORES[node.id]}"></rect>${text(node, x1 + nodeW + 8, 'start')}`).join('')}
    </svg>`;
  }

  function renderRates() {
    const dirty = Object.keys(state.rates).some(key => key.startsWith(state.scenario + ':'));
    document.querySelector('#mig-reset').textContent = state.scenario === 'propria' ? 'Voltar ao ponto de partida' : 'Restaurar taxas publicadas';
    document.querySelector('#mig-reset').disabled = !dirty;
    document.querySelector('#mig-mobilize').checked = state.mobilize;
    document.querySelector('#mig-rate-note').textContent = state.scenario === 'propria'
      ? 'O ponto de partida copia a matriz da Quaest sobre as urnas oficiais. Troque os percentuais pela fonte que você quiser. A urna de cada origem continua a do TSE.'
      : state.scenario === 'quaest'
        ? 'Cury, Renan e Caiado são cerca de 2% da amostra de 2.154 entrevistas, algo em torno de 43 pessoas. Um percentual de 40% nesse recorte tem margem aproximada de 15 pontos. A margem de 2 pontos vale para o resultado nacional.'
        : '46% e 32% deixam 22% do grupo de Cury, Renan, Caiado e Zema sem destino, cerca de 1,99 milhão de votos. Zema está nesse grupo, e fora do bloco dos demais.';
    document.querySelector('#mig-rates').innerHTML = metas().map(meta => {
      const values = inputRates(meta[0]);
      return `<article class="mig-origin"><h3>${esc(meta[1])}</h3><p class="fine" data-note="${esc(meta[0])}"></p><div class="mig-rate-grid">
        ${[['flavio', 'Flávio'], ['lula', 'Lula'], ['fora', 'Fora'], ['indeciso', 'Indeciso']].map(([field, label]) => `<label>${label}<input data-rate="${esc(meta[0])}" data-field="${field}" type="text" inputmode="decimal" value="${esc(values[field])}"></label>`).join('')}
      </div></article>`;
    }).join('') + '<p class="fine">O que faltar para 100% vai para “sem destino publicado”. Cada ponto retirado da base de Flávio move cerca de 561 mil votos. Augusto Cury declarou apoio a Flávio; na Quaest, o eleitorado dele reparte 34% para Lula e 30% para Flávio.</p>';
  }

  function renderPicture() {
    const rows = conta();
    const drawn = desenho(rows);
    const total = totais(rows);
    const allocated = total.flavio + total.lula;
    const shareF = allocated ? total.flavio / allocated * 100 : 0;
    const shareL = allocated ? total.lula / allocated * 100 : 0;
    const leader = total.flavio === total.lula ? 'Empate' : total.flavio > total.lula ? 'Flávio' : 'Lula';
    const lead = Math.abs(total.flavio - total.lula);
    const swing = total.indeciso + total.aberto;
    const stressedF = total.flavio <= total.lula ? total.flavio + swing : total.flavio;
    const stressedL = total.lula < total.flavio ? total.lula + swing : total.lula;
    const stressedDen = stressedF + stressedL;
    const sourceName = state.scenario === 'quaest' ? 'Quaest, 10 a 13/10/2026, BR-08729/2026' : state.scenario === 'datafolha' ? 'Datafolha, 6 e 7/10/2026, BR-02949/2026' : (state.headName || 'Estimativa própria');
    const dirty = Object.keys(state.rates).some(key => key.startsWith(state.scenario + ':'));
    document.querySelector('#mig-lead').innerHTML = `A mediana das cinco leituras de votos válidos coloca <strong>Flávio em ${pct1(medianF)}</strong> e <strong>Lula em ${pct1(medianL)}</strong>. O diagrama abaixo reparte a urna de 4 de outubro. No ponto de partida da Quaest, sem mobilizar abstenção e com as bases integrais, a conta dá 51,4% a 48,6%.`;
    document.querySelector('#mig-source').innerHTML = [
      ['quaest', 'Quaest 14/10'],
      ['datafolha', 'Datafolha 8/10'],
      ['propria', 'Estimativa própria']
    ].map(([id, label]) => `<button type="button" data-source="${id}" class="${state.scenario === id ? 'active' : ''}">${label}</button>`).join('');
    document.querySelector('#mig-view').innerHTML = [
      ['migracao', 'Só a migração'],
      ['completo', 'Eleitorado inteiro']
    ].map(([id, label]) => `<button type="button" data-viewmode="${id}" class="${state.view === id ? 'active' : ''}">${label}</button>`).join('');
    document.querySelector('#mig-stats').innerHTML = `
      <div class="mig-stat"><strong>${pct1(shareF)}</strong><span>Flávio nos votos alocados</span></div>
      <div class="mig-stat"><strong>${pct1(shareL)}</strong><span>Lula nos votos alocados</span></div>
      <div class="mig-stat"><strong>${mi(lead)}</strong><span>${esc(leader)} à frente, em votos</span></div>`;
    document.querySelector('#mig-svg').innerHTML = sankey(drawn);
    document.querySelector('#mig-legend').innerHTML = DESTINOS.filter(([key]) => drawn.some(row => row.parts[key] > 0)).map(([key, label]) => `<span><i class="mig-swatch" style="background:${CORES[key]}"></i>${esc(label)}</span>`).join('');
    const foraTxt = state.view === 'migracao'
      ? `O desenho mostra quem ficou pelo caminho no 1º turno. A conta soma esses fluxos às duas bases${state.mobilize ? ' e a branco, nulo e abstenção' : ''}.`
      : 'O desenho mostra o eleitorado inteiro, e a conta é a soma dessas faixas.';
    let stress = '';
    if (swing > 0 && stressedDen) stress = ` Se indecisos e o restante sem taxa fossem todos para quem está atrás, o placar iria a ${pct1(stressedF / stressedDen * 100)} para Flávio e ${pct1(stressedL / stressedDen * 100)} para Lula.`;
    document.querySelector('#mig-note').textContent = `${fmt(total.flavio)} votos para Flávio e ${fmt(total.lula)} para Lula. O percentual usa só esses dois. Ficam de fora ${fmt(total.fora)} em branco, nulo ou ausente, ${fmt(total.indeciso)} indecisos e ${fmt(total.aberto)} sem destino. ${foraTxt}${stress} Fonte das taxas: ${sourceName}${dirty ? ', com taxas ajustadas nesta tela' : ''}.`;
    document.querySelector('#mig-warn').innerHTML = state.mobilize
      ? `<p class="poll-note">Ligar branco, nulo e abstenção produz ${fmt(allocated)} votos em um dos dois, ${pct1(allocated / APTOS * 100)} dos aptos. No 1º turno os válidos foram 75,2% dos aptos.</p>`
      : `<p class="fine">${state.scenario === 'datafolha' ? 'Branco, nulo e abstenção (39,44 mi) permanecem fora. O Datafolha não publicou a transferência desse grupo.' : 'Branco, nulo e abstenção (39,44 mi) permanecem fora. A Quaest mediu nesse grupo 38% Flávio, 43% Lula, 17% fora e 2% indecisos.'}</p>`;
    document.querySelector('#mig-flows').innerHTML = rows.map(row => `<tr><td>${esc(row.meta[1])}</td><td>${fmt(row.meta[3])}</td>${DESTINOS.map(([key]) => `<td>${fmt(row.parts[key])}</td>`).join('')}</tr>`).join('') + `<tr><td>Total da conta</td><td>${fmt(rows.reduce((acc, row) => acc + row.meta[3], 0))}</td>${DESTINOS.map(([key]) => `<td>${fmt(total[key])}</td>`).join('')}</tr>`;
    metas().forEach(meta => {
      const note = document.querySelector(`[data-note="${meta[0]}"]`);
      if (!note) return;
      const values = inputRates(meta[0]);
      const sum = ['flavio', 'lula', 'fora', 'indeciso'].reduce((acc, key) => acc + pctNum(values[key]), 0);
      const margin = meta[5] ? moe(pctNum(values.flavio), meta[5]) : null;
      const kinds = { 'hipótese': 'Taxa hipotética', 'taxa publicada': 'Taxa publicada', 'grupo publicado': 'Grupo publicado', 'sem taxa': 'Sem taxa publicada' };
      const bits = [meta[2].replace(/\.$/, ''), kinds[meta[4]] || meta[4]];
      if (meta[5]) bits.push('Cerca de ' + fmt(meta[5]) + ' entrevistas neste recorte');
      if (margin != null) bits.push('Margem aproximada de ' + Math.round(margin) + ' pontos no percentual de Flávio');
      if (sum > 100.05) bits.push('A soma ' + Math.round(sum) + ' é reduzida a 100 na conta');
      else if (sum < 99.95) bits.push('O resto de ' + Math.round(100 - sum) + '% fica sem destino');
      if (meta[0] === 'ausentes' && !state.mobilize) bits.push('Estas taxas ficam guardadas e só entram na conta com a caixa marcada');
      note.textContent = bits.join('. ') + '.';
    });

    const repeatF = VALIDOS * medianF / 100;
    const repeatL = VALIDOS * medianL / 100;
    const gap = Math.abs(shareF - medianF);
    document.querySelector('#mig-computo').textContent = `O centro das cinco leituras é ${pct1(medianF)} para Flávio e ${pct1(medianL)} para Lula. A conta desta tela, com as taxas de agora, dá ${pct1(shareF)} a ${pct1(shareL)}, ${gap.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${Math.abs(gap - 1) < 0.05 ? 'ponto' : 'pontos'} distante dessa mediana. Se os ${fmt(VALIDOS)} votos válidos de 4/10 se repetirem, a mediana corresponde a ${fmt(repeatF)} e ${fmt(repeatL)}. No 1º turno a diferença foi de ${fmt(VOTOS.flavio - VOTOS.lula)} votos.`;
    document.querySelector('#mig-median').innerHTML = `
      <div class="mig-stat"><strong>${pct1(medianF)}</strong><span>Mediana, Flávio nos válidos</span></div>
      <div class="mig-stat"><strong>${pct1(medianL)}</strong><span>Mediana, Lula nos válidos</span></div>
      <div class="mig-stat"><strong>${mi(repeatF - repeatL)}</strong><span>Diferença se a urna válida se repetir</span></div>`;
    const headF = num(state.headF);
    const headL = num(state.headL);
    const user = headF > 0 && headL > 0;
    const userF = user ? headF / (headF + headL) * 100 : 0;
    const userL = user ? headL / (headF + headL) * 100 : 0;
    const bars = POLLS.map(poll => [poll[0], poll[5], poll[6]]);
    if (user) bars.push([state.headName || 'Outra fonte', userF, userL]);
    document.querySelector('#mig-bars').innerHTML = bars.map(([name, f, l]) => `
      <div class="bar-row"><span class="bar-label">${esc(name)}<small>Flávio</small></span><span class="bar-track"><span class="bar" style="width:${Math.max(0, Math.min(100, f))}%"></span></span><strong>${pct1(f)}</strong></div>
      <div class="bar-row"><span class="bar-label">${esc(name)}<small>Lula</small></span><span class="bar-track"><span class="bar mig-bar-lula" style="width:${Math.max(0, Math.min(100, l))}%"></span></span><strong>${pct1(l)}</strong></div>`).join('');
    document.querySelector('#mig-polls').innerHTML = POLLS.map(poll => `<tr>${[0, 1, 2, 3, 4, 7, 8].map(index => `<td>${esc(poll[index])}</td>`).join('')}</tr>`).join('');
    document.querySelector('#mig-user').textContent = user
      ? `${state.headName || 'Outra fonte'} digitada como ${pct1(headF)} e ${pct1(headL)} entra nas barras como ${pct1(userF)} e ${pct1(userL)} entre os dois. Esse par fica fora da mediana.`
      : 'Paraná Pesquisas, MDA, EPP, Amostragem ou o número que você tiver. Se a soma for um par de votos totais, a barra divide entre os dois.';
    const oddF = odd(state.oddF);
    const oddL = odd(state.oddL);
    const oddO = odd(state.oddO);
    if (oddF && oddL) {
      const inv = [1 / oddF, 1 / oddL].concat(oddO ? [1 / oddO] : []);
      const over = inv.reduce((acc, value) => acc + value, 0);
      const parts = [`Flávio ${pct1(inv[0] / over * 100)}`, `Lula ${pct1(inv[1] / over * 100)}`];
      if (oddO) parts.push(`outro ${pct1(inv[2] / over * 100)}`);
      parts.push(`ágio repartido ${pct1((over - 1) * 100)}`);
      document.querySelector('#mig-book').textContent = parts.join(' · ');
    } else {
      document.querySelector('#mig-book').textContent = 'Preencha as duas cotações decimais para ver a probabilidade implícita.';
    }
  }

  function paint() { renderRates(); renderPicture(); }

  root.addEventListener('click', event => {
    const source = event.target.closest('[data-source]');
    if (source && source.dataset.source !== state.scenario) {
      state.scenario = source.dataset.source;
      save();
      paint();
      return;
    }
    const mode = event.target.closest('[data-viewmode]');
    if (mode && mode.dataset.viewmode !== state.view) {
      state.view = mode.dataset.viewmode;
      save();
      renderPicture();
      return;
    }
    if (event.target.id === 'mig-reset') {
      Object.keys(state.rates).forEach(key => { if (key.startsWith(state.scenario + ':')) delete state.rates[key]; });
      save();
      paint();
    }
  });
  root.addEventListener('change', event => {
    if (event.target.id !== 'mig-mobilize') return;
    state.mobilize = event.target.checked;
    save();
    paint();
  });
  root.addEventListener('input', event => {
    const field = event.target;
    if (field.dataset.rate) {
      const key = state.scenario + ':' + field.dataset.rate;
      const current = state.rates[key] || Object.assign({}, inputRates(field.dataset.rate));
      current[field.dataset.field] = field.value;
      state.rates[key] = current;
      save();
      renderPicture();
      document.querySelector('#mig-reset').disabled = false;
      return;
    }
    const map = { 'mig-head-name': 'headName', 'mig-head-f': 'headF', 'mig-head-l': 'headL', 'mig-odd-f': 'oddF', 'mig-odd-l': 'oddL', 'mig-odd-o': 'oddO' };
    if (!map[field.id]) return;
    state[map[field.id]] = field.value;
    save();
    renderPicture();
  });

  document.querySelector('#mig-head-name').value = state.headName || '';
  document.querySelector('#mig-head-f').value = state.headF || '';
  document.querySelector('#mig-head-l').value = state.headL || '';
  document.querySelector('#mig-odd-f').value = state.oddF || '';
  document.querySelector('#mig-odd-l').value = state.oddL || '';
  document.querySelector('#mig-odd-o').value = state.oddO || '';
  paint();
};
