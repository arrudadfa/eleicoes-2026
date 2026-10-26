'use strict';

function escXml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/**
 * Gráfico de barras horizontais em SVG puro (sem dependências externas).
 * rows: [{ label, value, color }]
 */
export function graficoBarrasHorizontais({ rows, largura = 640, alturaBarra = 26, gap = 10, max, corPadrao = '#234f83', formatValor = (v) => String(v), formatRotulo = (v) => String(v) }) {
  const maxVal = max ?? Math.max(...rows.map((r) => Math.abs(r.value)), 1);
  const altura = rows.length * (alturaBarra + gap) + gap;
  const labelW = 150;
  const chartW = Math.max(40, largura - labelW - 80);

  const barras = rows.map((r, i) => {
    const y = gap + i * (alturaBarra + gap);
    const w = Math.max(1, (Math.abs(r.value) / maxVal) * chartW);
    return `<text x="${labelW - 8}" y="${y + alturaBarra * 0.68}" text-anchor="end" font-size="13" fill="#172c45">${escXml(formatRotulo(r.label, r))}</text>
      <rect x="${labelW}" y="${y}" width="${chartW}" height="${alturaBarra}" fill="#eef2f7" rx="4"></rect>
      <rect x="${labelW}" y="${y}" width="${w}" height="${alturaBarra}" fill="${escXml(r.color || corPadrao)}" rx="4"></rect>
      <text x="${labelW + w + 8}" y="${y + alturaBarra * 0.68}" font-size="13" font-weight="700" fill="#172c45">${escXml(formatValor(r.value, r))}</text>`;
  }).join('');

  return `<svg viewBox="0 0 ${largura} ${altura}" width="100%" height="${altura}" role="img" aria-label="Gráfico de barras">${barras}</svg>`;
}

/**
 * Gráfico de barras pareadas (duas séries lado a lado por categoria), em SVG puro.
 * rows: [{ label, a, b }]; a/b usam corA/corB.
 */
export function graficoBarrasPareadas({ rows, largura = 640, alturaBarra = 14, gapBarra = 3, gapGrupo = 14, max, corA = '#c5343a', corB = '#234f83', formatValor = (v) => String(v) }) {
  const maxVal = max ?? Math.max(...rows.flatMap((r) => [r.a, r.b]), 1);
  const alturaGrupo = alturaBarra * 2 + gapBarra;
  const altura = rows.length * (alturaGrupo + gapGrupo) + gapGrupo;
  const labelW = 170;
  const chartW = Math.max(40, largura - labelW - 80);

  const grupos = rows.map((r, i) => {
    const yGrupo = gapGrupo + i * (alturaGrupo + gapGrupo);
    const wa = Math.max(1, (r.a / maxVal) * chartW);
    const wb = Math.max(1, (r.b / maxVal) * chartW);
    return `<text x="${labelW - 8}" y="${yGrupo + alturaGrupo * 0.62}" text-anchor="end" font-size="13" fill="#172c45">${escXml(r.label)}</text>
      <rect x="${labelW}" y="${yGrupo}" width="${wa}" height="${alturaBarra}" fill="${corA}" rx="3"></rect>
      <text x="${labelW + wa + 6}" y="${yGrupo + alturaBarra * 0.8}" font-size="11.5" fill="#172c45">${escXml(formatValor(r.a))}</text>
      <rect x="${labelW}" y="${yGrupo + alturaBarra + gapBarra}" width="${wb}" height="${alturaBarra}" fill="${corB}" rx="3"></rect>
      <text x="${labelW + wb + 6}" y="${yGrupo + alturaBarra + gapBarra + alturaBarra * 0.8}" font-size="11.5" fill="#172c45">${escXml(formatValor(r.b))}</text>`;
  }).join('');

  return `<svg viewBox="0 0 ${largura} ${altura}" width="100%" height="${altura}" role="img" aria-label="Gráfico de barras comparativas">${grupos}</svg>`;
}
