'use strict';
const NAV = {
  '1': [['resultado', 'Resultado'], ['explorar', 'Explorar candidatos'], ['consultar-bu', 'Consultar BU'], ['simular', 'Treinar sequência'], ['fontes', 'Fontes e dados']],
  '2': [['painel', 'Painel'], ['explorar', 'Explorar candidatos'], ['simular', 'Treinar sequência'], ['fontes', 'Fontes e dados']]
};
const TITLES = {'1': 'Meu voto • 1º Turno 2026', '2': 'Meu voto • 2º Turno 2026'};
let request = 0;
let current = '';
let turno1Ready = null;

function wantedTurno(){
  const hash = location.hash.replace('#', '');
  if (hash === '1' || hash === '2') return hash;
  try {
    const saved = localStorage.getItem('meu-voto-turno');
    if (saved === '1' || saved === '2') return saved;
  } catch {}
  return '2';
}
function paintSwitch(turno){
  document.querySelectorAll('.turno-track button').forEach(btn => btn.setAttribute('aria-pressed', String(btn.dataset.turno === turno)));
  document.querySelector('#section-nav').innerHTML = NAV[turno].map(([id, label], index) => `<button data-view="${id}" class="${index === 0 ? 'active' : ''}">${label}</button>`).join('');
  document.title = TITLES[turno];
}
function loadScript(src){
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(src));
    document.head.appendChild(script);
  });
}
function ensureTurno1(){
  if (window.bootTurno1) return Promise.resolve();
  if (!turno1Ready) turno1Ready = (async () => {
    await loadScript('dados.js?v=2');
    await loadScript('pesquisas.js');
    await loadScript('resultados.js');
    await loadScript('secoes.js');
    await loadScript('turno1-app.js?v=1');
  })();
  return turno1Ready;
}
async function showTurno(turno){
  if (turno !== '1' && turno !== '2') turno = '2';
  const ticket = ++request;
  paintSwitch(turno);
  const stage = document.querySelector('#stage');
  if (turno === '1' && !window.bootTurno1) {
    stage.textContent = 'Carregando o 1º turno…';
    stage.className = 'turno-loading';
    try { await ensureTurno1(); }
    catch { if (ticket === request) stage.textContent = 'Não foi possível abrir o 1º turno.'; return; }
  }
  if (ticket !== request) return;
  stage.className = '';
  stage.replaceChildren(document.querySelector('#tpl-turno-' + turno).content.cloneNode(true));
  try {
    if (turno === '2') window.bootTurno2();
    else window.bootTurno1();
    if (window.bindPassarCola) window.bindPassarCola();
  } catch (error) {
    console.error(error);
    stage.insertAdjacentHTML('afterbegin', '<p class="turno-loading">Não foi possível montar esta tela.</p>');
  }
  current = turno;
  try { localStorage.setItem('meu-voto-turno', turno); } catch {}
  if (location.hash !== '#' + turno) history.replaceState(null, '', '#' + turno);
}
document.querySelector('.turno-track').addEventListener('click', event => {
  const button = event.target.closest('[data-turno]');
  if (!button || button.dataset.turno === current) return;
  showTurno(button.dataset.turno);
});
document.querySelector('#section-nav').addEventListener('click', event => {
  const button = event.target.closest('[data-view]');
  if (!button || !window.Painel || !window.Painel.setView) return;
  window.Painel.setView(button.dataset.view);
});
window.addEventListener('hashchange', () => {
  const hash = location.hash.replace('#', '');
  if ((hash === '1' || hash === '2') && hash !== current) showTurno(hash);
});
window.TURNO2 = {CANDIDATOS: window.CANDIDATOS, PESQUISAS: window.PESQUISAS};
showTurno(wantedTurno());
