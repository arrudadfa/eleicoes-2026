'use strict';
const qs = selector => document.querySelector(selector);
const font = (weight, size) => `${weight} ${size}px Outfit, "Segoe UI", sans-serif`;
const PALETTES = {
  branco: {id:'branco', label:'Branco', bg:'#ffffff', ink:'#1c1915', muted:'#5c6570', line:'rgba(28,25,21,.14)', digitBg:'#f3f5f8', digitInk:'#1c1915'},
  escuro: {id:'escuro', label:'Escuro', bg:'#111111', ink:'#f4f1ea', muted:'#b7b1a6', line:'rgba(255,255,255,.16)', digitBg:'#1c1c1c', digitInk:'#f4f1ea'},
  azul: {id:'azul', label:'Azul', bg:'#1d4e89', ink:'#f7f4ee', muted:'#d5e2f2', line:'rgba(255,255,255,.2)', digitBg:'#f4f7fb', digitInk:'#122b4b'},
  vinho: {id:'vinho', label:'Vinho', bg:'#6d2433', ink:'#fff6f2', muted:'#f0d2d6', line:'rgba(255,255,255,.2)', digitBg:'#fff8f6', digitInk:'#4a1520'},
  verde: {id:'verde', label:'Verde', bg:'#1c6b45', ink:'#f4fff8', muted:'#d5efe2', line:'rgba(255,255,255,.2)', digitBg:'#f6fff9', digitInk:'#143d28'}
};
const photoCache = new Map();
const partyCache = new Map();
let share = {format:'post', palette:'branco', vice:false, suplente:false};
let shareToken = 0;
let recording = false;

function painel(){return window.Painel;}
function partySlug(party){
  return String(party || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}
function initials(name){
  const clean = String(name || '').trim();
  if (!clean || clean.startsWith('AINDA') || clean.startsWith('VOTO')) return '';
  const parts = clean.split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
function fitText(ctx, text, max){
  let value = String(text || '');
  if (ctx.measureText(value).width <= max) return value;
  while (value.length > 1 && ctx.measureText(value + '…').width > max) value = value.slice(0, -1);
  return value + '…';
}
function traceRound(ctx, x, y, w, h, r){
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}
function loadCached(cache, key, url){
  if (!key) return Promise.resolve(null);
  const hit = cache.get(key);
  if (hit instanceof HTMLImageElement) return Promise.resolve(hit.naturalWidth ? hit : null);
  if (hit) return hit;
  const image = new Image();
  const pending = new Promise(resolve => {
    image.onload = () => {
      if (image.naturalWidth) { cache.set(key, image); resolve(image); }
      else { cache.delete(key); resolve(null); }
    };
    image.onerror = () => { cache.delete(key); resolve(null); };
  });
  cache.set(key, pending);
  image.src = url;
  return pending;
}
function asset(path){
  return (window.ASSET_ROOT || '') + path;
}
function loadPhoto(id){
  return loadCached(photoCache, id, asset(`fotos/${id}.jpg`));
}
function cachedPhoto(id){
  const hit = photoCache.get(id);
  return hit instanceof HTMLImageElement && hit.naturalWidth ? hit : null;
}
function loadParty(party){
  return loadCached(partyCache, party, asset(`partidos/${partySlug(party)}.jpg`));
}
function cachedParty(party){
  const hit = partyCache.get(party);
  return hit instanceof HTMLImageElement && hit.naturalWidth ? hit : null;
}
function shareRows(options){
  const {slots, byId, slotLabel, choices} = painel();
  return slots.map((slot, index) => {
    const picked = choices[index];
    const candidate = byId.get(picked);
    const row = {
      label: slotLabel(index).toUpperCase(),
      digits: slot[2],
      number: candidate ? candidate.number : '',
      name: candidate ? candidate.name : picked === 'BRANCO' ? 'VOTO EM BRANCO' : picked === 'NULO' ? 'VOTO NULO' : 'AINDA NÃO ESCOLHIDO',
      party: candidate ? candidate.party : '',
      id: candidate ? candidate.id : '',
      vice: null,
      suplente: null
    };
    if (options.vice && candidate && candidate.vice && (slot[0] === 'GOVERNADOR' || slot[0] === 'PRESIDENTE')) row.vice = candidate.vice;
    if (options.suplente && candidate && candidate.substitutes && candidate.substitutes[0] && (index === 2 || index === 3)) row.suplente = candidate.substitutes[0];
    return row;
  });
}
function photoIds(rows){
  const ids = [];
  rows.forEach(row => {
    if (row.id) ids.push(row.id);
    if (row.vice) ids.push(row.vice.id);
    if (row.suplente) ids.push(row.suplente.id);
  });
  return [...new Set(ids)];
}
function partyIds(rows){
  return [...new Set(rows.map(row => row.party).filter(Boolean))];
}
function preloadPhotos(){
  const rows = shareRows({format:share.format, palette:share.palette, vice:true, suplente:true});
  return Promise.all([...photoIds(rows).map(loadPhoto), ...partyIds(rows).map(loadParty)]);
}
function drawFace(ctx, image, x, y, size, name, pal){
  ctx.save();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.clip();
  if (image) {
    const scale = Math.max(size / image.width, size / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.drawImage(image, x + (size - width) / 2, y + (size - height) / 2, width, height);
  } else {
    ctx.fillStyle = pal.digitBg;
    ctx.fillRect(x, y, size, size);
    const letters = initials(name);
    if (letters) {
      ctx.fillStyle = pal.ink;
      ctx.font = font(800, Math.round(size * 0.34));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letters, x + size / 2, y + size / 2 + 1);
    }
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2, size / 2, 0, Math.PI * 2);
  ctx.lineWidth = 3;
  ctx.strokeStyle = pal.line;
  ctx.stroke();
}
function drawParty(ctx, party, centerX, y, symbol, pal, labelWidth){
  const x = centerX - symbol / 2;
  const radius = 18;
  traceRound(ctx, x, y, symbol, symbol, radius);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  const image = cachedParty(party);
  if (image) {
    const pad = 5;
    const inner = symbol - pad * 2;
    const scale = Math.min(inner / image.width, inner / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.save();
    traceRound(ctx, x, y, symbol, symbol, radius);
    ctx.clip();
    ctx.drawImage(image, x + (symbol - width) / 2, y + (symbol - height) / 2, width, height);
    ctx.restore();
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(28,25,21,.14)';
  traceRound(ctx, x, y, symbol, symbol, radius);
  ctx.stroke();
  let fontSize = 15;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = pal.ink;
  while (fontSize > 10) {
    ctx.font = font(700, fontSize);
    if (ctx.measureText(party).width <= labelWidth) break;
    fontSize -= 1;
  }
  ctx.fillText(party, centerX, y + symbol + 8 + fontSize / 2);
}
function drawHeader(ctx, width, pal, format, place){
  const pad = 52;
  const title = place || `${painel().stateName()}  ·  ${painel().uf}`;
  const titleY = format === 'story' ? 98 : 82;
  let size = format === 'story' ? 52 : 44;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = pal.ink;
  do {
    ctx.font = font(800, size);
    size -= 2;
  } while (size > 28 && ctx.measureText(title).width > width - 430);
  ctx.fillText(title, width / 2, titleY);
  ctx.textAlign = 'left';
  ctx.font = font(700, 22);
  ctx.fillText('meu voto', pad, titleY);
  ctx.textAlign = 'right';
  ctx.fillStyle = pal.muted;
  ctx.font = font(700, 15);
  ctx.fillText('ELEIÇÕES', width - pad, titleY - 14);
  ctx.fillStyle = pal.ink;
  ctx.font = font(800, 26);
  ctx.fillText('2026', width - pad, titleY + 16);
}
function drawRow(ctx, row, x, y, width, height, pal){
  const column = 132;
  const symbol = Math.min(86, Math.max(64, height - 48));
  const centerX = x + width - column / 2;
  const block = symbol + 28;
  const symbolY = y + Math.max(6, (height - block) / 2);
  if (row.party) drawParty(ctx, row.party, centerX, symbolY, symbol, pal, column);
  const vice = row.vice;
  const photo = Math.min(vice ? 92 : 104, height - (vice ? 52 : 28));
  const photoY = y + (height - photo) / 2 - (vice ? 8 : 0);
  let textX;
  if (vice) {
    const gap = 8;
    drawFace(ctx, cachedPhoto(row.id), x, photoY, photo, row.name, pal);
    drawFace(ctx, cachedPhoto(vice.id), x + photo + gap, photoY, photo, vice.name, pal);
    ctx.fillStyle = pal.muted;
    ctx.font = font(600, 15);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(fitText(ctx, vice.name, photo * 2 + gap), x, photoY + photo + 18);
    textX = x + photo * 2 + gap + 18;
  } else {
    drawFace(ctx, cachedPhoto(row.id), x, photoY, photo, row.name, pal);
    textX = x + photo + 18;
  }
  const textW = Math.max(120, centerX - column / 2 - 16 - textX);
  const box = Math.max(34, Math.min(62, Math.floor((textW - (row.digits - 1) * 8) / row.digits)));
  const boxH = Math.round(box * 1.12);
  const blockH = 22 + 8 + boxH + 16 + 26 + (row.suplente ? 24 : 0);
  let cursor = y + Math.max(12, (height - blockH) / 2);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = pal.muted;
  ctx.font = font(700, 15);
  ctx.fillText(fitText(ctx, row.label, textW), textX, cursor + 15);
  cursor += 24;
  for (let index = 0; index < row.digits; index++) {
    const boxX = textX + index * (box + 8);
    traceRound(ctx, boxX, cursor, box, boxH, 8);
    ctx.fillStyle = pal.digitBg;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = pal.line;
    ctx.stroke();
    ctx.fillStyle = pal.digitInk;
    ctx.font = font(800, Math.round(box * 0.62));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(row.number[index] || '', boxX + box / 2, cursor + boxH / 2 + 1);
  }
  cursor += boxH + 26;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = pal.ink;
  ctx.font = font(800, 24);
  ctx.fillText(fitText(ctx, row.name, textW), textX, cursor);
  if (row.suplente) {
    ctx.fillStyle = pal.muted;
    ctx.font = font(600, 16);
    ctx.fillText(fitText(ctx, 'Suplente  ·  ' + row.suplente.name, textW), textX, cursor + 24);
  }
}
function paintCard(ctx, width, height, options, rows, place){
  const pal = PALETTES[options.palette];
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = pal.bg;
  ctx.fillRect(0, 0, width, height);
  drawHeader(ctx, width, pal, options.format, place);
  const pad = 48;
  const headerBottom = options.format === 'story' ? 168 : 136;
  const footerTop = height - (options.format === 'story' ? 72 : 58);
  const weights = rows.map(row => 1 + (row.vice ? 0.45 : 0) + (row.suplente ? 0.28 : 0));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  const inner = footerTop - headerBottom;
  let y = headerBottom;
  rows.forEach((row, index) => {
    const rowHeight = inner * weights[index] / total;
    drawRow(ctx, row, pad, y, width - pad * 2, rowHeight, pal);
    y += rowHeight;
    if (index < rows.length - 1) {
      ctx.strokeStyle = pal.line;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(pad, y);
      ctx.lineTo(width - pad, y);
      ctx.stroke();
    }
  });
  ctx.fillStyle = pal.muted;
  ctx.font = font(400, 20);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('Material pessoal  ·  sem vínculo com o TSE', width / 2, height - 32);
}
function cardSize(format){
  return format === 'story' ? {width:1080, height:1920} : {width:1080, height:1350};
}
async function refreshShare(){
  const token = ++shareToken;
  const canvas = qs('#share-preview');
  if (!canvas) return;
  const size = cardSize(share.format);
  const rows = shareRows(share);
  await document.fonts.load('800 48px Outfit');
  await Promise.all([...photoIds(rows).map(loadPhoto), ...partyIds(rows).map(loadParty)]);
  if (token !== shareToken) return;
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  paintCard(ctx, size.width, size.height, share, rows);
  const format = share.format === 'story' ? 'STORY · 9:16' : 'POST · 4:5';
  const suplenteCaption = qs('#share-suplente') ? ` · ${share.suplente ? 'COM SUPLENTE' : 'SEM SUPLENTE'}` : '';
  qs('#share-caption').textContent = `${format} · ${PALETTES[share.palette].label.toUpperCase()} · ${share.vice ? 'COM VICE' : 'SEM VICE'}${suplenteCaption} · ${size.width} × ${size.height}`;
}
window.refreshSharePreview = refreshShare;
function canvasBlob(canvas){
  return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}
function saveBlob(blob, name){
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1500);
}
function colinhaMessage(){
  const {slots, byId, slotLabel, stateName, choices, uf} = painel();
  const lines = slots.map((slot, index) => {
    const picked = choices[index];
    const candidate = byId.get(picked);
    const who = candidate ? `${candidate.number} ${candidate.name}` : picked === 'BRANCO' ? 'branco' : picked === 'NULO' ? 'nulo' : 'ainda não escolhido';
    let line = `${slotLabel(index)}: ${who}`;
    if (share.vice && candidate && candidate.vice && (slot[0] === 'GOVERNADOR' || slot[0] === 'PRESIDENTE')) line += ` · vice ${candidate.vice.name}`;
    if (share.suplente && candidate && candidate.substitutes && candidate.substitutes[0] && (index === 2 || index === 3)) line += ` · suplente ${candidate.substitutes[0].name}`;
    return line;
  });
  return `Minha colinha · ${stateName()} · ${uf}\nEleições 2026\n\n${lines.join('\n')}\n\nMaterial pessoal, sem vínculo com o TSE.`;
}
async function downloadCard(){
  const blob = await canvasBlob(qs('#share-preview'));
  const name = share.format === 'story' ? 'minha-colinha-story-1080x1920.png' : 'minha-colinha-post-1080x1350.png';
  saveBlob(blob, name);
  painel().notify('Imagem da colinha baixada.');
}
async function sendWhatsApp(){
  const blob = await canvasBlob(qs('#share-preview'));
  const text = colinhaMessage();
  const file = new File([blob], 'minha-colinha-2026.png', {type:'image/png'});
  try {
    if (navigator.canShare && navigator.canShare({files:[file]})) {
      await navigator.share({files:[file], text, title:'Minha colinha'});
      painel().notify('Escolha o WhatsApp na janela de compartilhamento.');
      return;
    }
  } catch (error) {
    if (error && error.name === 'AbortError') return;
  }
  saveBlob(blob, 'minha-colinha-2026.png');
  window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  painel().notify('A imagem foi baixada. No WhatsApp, anexe o PNG. A mensagem com os números já foi aberta.');
}
function formatClock(seconds){
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
function timeline(){
  const vote = 5;
  const total = 15;
  const fade = 0.4;
  const intro = 0;
  const count = Math.max(1, painel().slots.length);
  const step = vote / count;
  return {intro, step, votesEnd: vote, total, fade};
}
function drawKey(ctx, x, y, w, h, label, fill, ink, size){
  traceRound(ctx, x, y, w, h, 16);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.fillStyle = ink;
  ctx.font = font(800, size);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2 + 1);
}
function drawKeypad(ctx, confirming){
  const key = 168;
  const gap = 16;
  const sideW = 214;
  const gridW = key * 3 + gap * 2;
  const total = gridW + 20 + sideW;
  const left = (1080 - total) / 2;
  const top = 948;
  ['1','2','3','4','5','6','7','8','9'].forEach((label, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    drawKey(ctx, left + column * (key + gap), top + row * (key + gap), key, key, label, '#1b2128', '#ffffff', 48);
  });
  drawKey(ctx, left + (key + gap), top + 3 * (key + gap), key, key, '0', '#1b2128', '#ffffff', 48);
  const right = left + gridW + 20;
  drawKey(ctx, right, top, sideW, key, 'BRANCO', '#f3f4f6', '#1b2128', 22);
  drawKey(ctx, right, top + key + gap, sideW, key, 'CORRIGE', '#ef9963', '#2a160c', 22);
  drawKey(ctx, right, top + 2 * (key + gap), sideW, key * 2 + gap, 'CONFIRMA', confirming ? '#46d484' : '#2f9e62', '#ffffff', 22);
}
function drawVoteScreen(ctx, index, progress, rows){
  const row = rows[index];
  const count = row.digits;
  const blank = row.name === 'VOTO EM BRANCO';
  const nil = row.name === 'VOTO NULO';
  const empty = !row.id;
  const confirming = progress >= 0.78;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#5c6b7a';
  ctx.font = font(700, 22);
  ctx.fillText('SEU VOTO PARA', 540, 150);
  ctx.fillStyle = '#122033';
  ctx.font = font(800, 42);
  ctx.fillText(row.label, 540, 214);
  if (empty) {
    ctx.font = font(800, 46);
    ctx.fillStyle = blank || nil ? '#122033' : '#6a7b8c';
    ctx.fillText(row.name, 540, 430);
  } else {
    const shown = Math.min(count, Math.floor((Math.min(progress, 0.42) / 0.42) * count));
    const number = row.number || '';
    const box = 84;
    const boxH = 102;
    const gap = 12;
    const total = count * box + (count - 1) * gap;
    let boxX = 540 - total / 2;
    for (let digit = 0; digit < count; digit++) {
      traceRound(ctx, boxX, 260, box, boxH, 12);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#c5ced6';
      ctx.stroke();
      if (digit < shown && number[digit]) {
        ctx.fillStyle = '#122033';
        ctx.font = font(800, 58);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(number[digit], boxX + box / 2, 260 + boxH / 2 + 2);
      }
      boxX += box + gap;
    }
    if (progress > 0.42) {
      drawFace(ctx, cachedPhoto(row.id), 470, 392, 140, row.name, {digitBg:'#e7eef5', ink:'#122033', line:'rgba(18,32,51,.16)'});
      ctx.fillStyle = '#122033';
      ctx.font = font(800, 34);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.fillText(fitText(ctx, row.name, 760), 540, 582);
      if (row.party) drawParty(ctx, row.party, 540, 608, 92, {ink:'#122033'}, 280);
    }
  }
  if (confirming) {
    ctx.fillStyle = '#1c8c4e';
    ctx.font = font(800, 26);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    const label = blank ? 'BRANCO CONFIRMADO' : nil ? 'NULO CONFIRMADO' : 'VOTO CONFIRMADO';
    ctx.fillText(label, 540, 844);
  }
  return confirming;
}
function drawIntro(ctx, place){
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#5c6b7a';
  ctx.font = font(700, 22);
  ctx.fillText('ELEIÇÕES 2026', 540, 300);
  ctx.fillStyle = '#122033';
  ctx.font = font(800, 58);
  const title = place;
  let size = 58;
  do {
    ctx.font = font(800, size);
    size -= 2;
  } while (size > 32 && ctx.measureText(title).width > 820);
  ctx.fillText(title, 540, 400);
  ctx.fillStyle = '#3d5168';
  ctx.font = font(600, 30);
  ctx.fillText('Sua colinha na ordem da urna', 540, 470);
}
function fadeLevel(time, clock){
  const start = clock.total - clock.fade;
  if (time <= start) return 1;
  return Math.max(0, 1 - (time - start) / clock.fade);
}
function drawUrna(ctx, time, clock, options, rows, place){
  if (time >= clock.votesEnd) {
    paintCard(ctx, 1080, 1920, {...options, format:'story'}, rows, place);
  } else {
    ctx.fillStyle = '#0e1612';
    ctx.fillRect(0, 0, 1080, 1920);
    traceRound(ctx, 40, 28, 1000, 1804, 42);
    ctx.fillStyle = '#1a3330';
    ctx.fill();
    traceRound(ctx, 78, 64, 924, 820, 12);
    ctx.fillStyle = '#f7f6f1';
    ctx.fill();
    let confirming = false;
    if (time < clock.intro) drawIntro(ctx, place);
    else {
      const elapsed = time - clock.intro;
      const index = Math.min(rows.length - 1, Math.floor(elapsed / clock.step));
      const progress = (elapsed - index * clock.step) / clock.step;
      confirming = drawVoteScreen(ctx, index, progress, rows);
    }
    drawKeypad(ctx, confirming);
    ctx.fillStyle = '#d5e4dc';
    ctx.font = font(600, 22);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('ENSAIE O SEU VOTO    ·    MEU VOTO', 540, 1776);
  }
  const level = fadeLevel(time, clock);
  if (level < 1) {
    ctx.fillStyle = `rgba(0,0,0,${1 - level})`;
    ctx.fillRect(0, 0, 1080, 1920);
  }
}
function recordUrna(options, onProgress){
  const rows = shareRows(options);
  const place = `${painel().stateName()}  ·  ${painel().uf}`;
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  const audio = new Audio(asset('mundo_eleitoral_jingles2026_jingle_tropa_do_capitao_de_flavio_bo.m4a'));
  audio.preload = 'auto';
  return new Promise((resolve, reject) => {
    const fail = error => reject(error instanceof Error ? error : new Error('Não foi possível gravar o vídeo.'));
    audio.onerror = () => fail(new Error('Não foi possível abrir o jingle.'));
    audio.onloadedmetadata = async () => {
      let recorder = null;
      try {
        if (!Number.isFinite(audio.duration) || audio.duration < 1) throw new Error('Não foi possível ler o jingle.');
        audio.playbackRate = 1;
        const clock = timeline();
        const audioCtx = new AudioContext();
        await audioCtx.resume();
        const source = audioCtx.createMediaElementSource(audio);
        const gain = audioCtx.createGain();
        const dest = audioCtx.createMediaStreamDestination();
        source.connect(gain);
        gain.connect(dest);
        gain.connect(audioCtx.destination);
        const applyGain = now => gain.gain.setValueAtTime(now < clock.votesEnd ? 0 : fadeLevel(now, clock), audioCtx.currentTime);
        applyGain(0);
        const stream = canvas.captureStream(30);
        dest.stream.getAudioTracks().forEach(track => stream.addTrack(track));
        const mime = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm'].find(type => MediaRecorder.isTypeSupported(type));
        if (!mime) throw new Error('Este navegador não grava vídeo.');
        recorder = new MediaRecorder(stream, {mimeType: mime, videoBitsPerSecond: 4500000, audioBitsPerSecond: 160000});
        const chunks = [];
        recorder.ondataavailable = event => { if (event.data && event.data.size) chunks.push(event.data); };
        recorder.onerror = () => fail(new Error('A gravação do vídeo falhou.'));
        let frame = 0;
        let stopped = false;
        let startedAt = 0;
        let musicOn = false;
        const elapsed = () => startedAt ? (performance.now() - startedAt) / 1000 : 0;
        const finish = () => {
          if (stopped) return;
          stopped = true;
          applyGain(clock.total);
          drawUrna(ctx, clock.total, clock, options, rows, place);
          onProgress(clock.total, clock.total);
          audio.pause();
          if (recorder.state === 'recording') recorder.stop();
        };
        const paint = () => {
          const now = elapsed();
          if (!musicOn && now >= clock.votesEnd) {
            musicOn = true;
            audio.play().catch(() => {});
          }
          applyGain(now);
          if (now >= clock.total) {
            finish();
            return;
          }
          drawUrna(ctx, now, clock, options, rows, place);
          onProgress(now, clock.total);
          frame = requestAnimationFrame(paint);
        };
        recorder.onstop = () => {
          cancelAnimationFrame(frame);
          stream.getTracks().forEach(track => track.stop());
          source.disconnect();
          audioCtx.close();
          resolve(new Blob(chunks, {type: mime}));
        };
        drawUrna(ctx, 0, clock, options, rows, place);
        recorder.start(200);
        try {
          await audio.play();
          audio.pause();
          audio.currentTime = 0;
        } catch (error) {
          recorder.onstop = () => {
            stream.getTracks().forEach(track => track.stop());
            source.disconnect();
            audioCtx.close();
          };
          if (recorder.state === 'recording') recorder.stop();
          fail(new Error('O navegador bloqueou o áudio do jingle.'));
          return;
        }
        startedAt = performance.now();
        frame = requestAnimationFrame(paint);
      } catch (error) {
        if (recorder && recorder.state === 'recording') recorder.stop();
        fail(error);
      }
    };
    audio.load();
  });
}
async function generateVideo(){
  if (recording) return;
  recording = true;
  const button = qs('#share-video');
  const status = qs('#share-status');
  button.disabled = true;
  let webm = null;
  try {
    if (location.protocol === 'file:') throw new Error('Abra o painel pelo arquivo Abrir painel.cmd para gerar o vídeo.');
    status.textContent = 'Preparando fotos e áudio…';
    await preloadPhotos();
    await document.fonts.load('800 48px Outfit');
    const options = {...share};
    webm = await recordUrna(options, (time, total) => {
      status.textContent = `Gerando vídeo… ${formatClock(time)} de ${formatClock(total)}`;
    });
    status.textContent = 'Convertendo para MP4…';
    const response = await fetch('/api/video', {method:'POST', headers:{'Content-Type': webm.type || 'video/webm'}, body: webm});
    if (!response.ok) throw new Error((await response.text()) || 'Não foi possível converter o vídeo.');
    saveBlob(await response.blob(), 'tela-da-urna.mp4');
    status.textContent = 'Vídeo pronto: tela-da-urna.mp4';
    painel().notify('Vídeo da urna baixado.');
  } catch (error) {
    if (webm) {
      saveBlob(webm, 'tela-da-urna.webm');
      status.textContent = 'O MP4 não saiu. Baixei o WebM para você assistir neste navegador.';
    } else status.textContent = error.message || 'Não foi possível gerar o vídeo.';
    painel().notify(status.textContent);
  } finally {
    recording = false;
    button.disabled = false;
  }
}
function chipButtons(container, items, current, onPick){
  container.innerHTML = items.map(item => `<button type="button" class="${item.id === current ? 'active' : ''}" data-id="${item.id}">${item.swatch || ''}${item.label}</button>`).join('');
  container.onclick = event => {
    const id = event.target.closest('button')?.dataset.id;
    if (!id || id === current) return;
    onPick(id);
  };
}
function renderControls(){
  chipButtons(qs('#share-colors'), Object.values(PALETTES).map(pal => ({id:pal.id, label:pal.label, swatch:`<i class="color-dot" style="background:${pal.bg}"></i>`})), share.palette, id => { share.palette = id; renderControls(); refreshShare(); });
  chipButtons(qs('#share-formats'), [{id:'post', label:'Post'}, {id:'story', label:'Story'}], share.format, id => { share.format = id; renderControls(); refreshShare(); });
  chipButtons(qs('#share-vice'), [{id:'off', label:'Sem vice'}, {id:'on', label:'Com vice'}], share.vice ? 'on' : 'off', id => { share.vice = id === 'on'; renderControls(); refreshShare(); });
  const suplenteBox = qs('#share-suplente');
  if (suplenteBox) chipButtons(suplenteBox, [{id:'off', label:'Sem suplente'}, {id:'on', label:'Com suplente'}], share.suplente ? 'on' : 'off', id => { share.suplente = id === 'on'; renderControls(); refreshShare(); });
}
function openShare(){
  const dialog = qs('#share-dialog');
  if (!dialog.open) dialog.showModal();
  const status = qs('#share-status');
  if (!recording) status.textContent = location.protocol === 'file:' ? 'Abra pelo arquivo Abrir painel.cmd para usar foto, vídeo e o envio da imagem.' : '';
  renderControls();
  refreshShare();
  preloadPhotos();
}
function bindPassarCola(){
  const open = qs('#share-open');
  const top = qs('#share-top');
  const download = qs('#share-download');
  const whats = qs('#share-whatsapp');
  const video = qs('#share-video');
  if (open) open.onclick = openShare;
  if (top) top.onclick = openShare;
  if (download) download.onclick = () => downloadCard();
  if (whats) whats.onclick = () => sendWhatsApp();
  if (video) video.onclick = () => generateVideo();
  if (qs('#share-colors')) renderControls();
}
window.bindPassarCola = bindPassarCola;
