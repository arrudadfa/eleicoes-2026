'use strict';

/**
 * Renderiza uma tabela ordenável por clique no cabeçalho.
 * columns: [{ key, label, align, format(value, row) }]
 */
export function tabelaOrdenavel(containerEl, columns, rows, initialSort) {
  let sortKey = initialSort?.key || columns[0].key;
  let sortDir = initialSort?.dir || 1;

  function render() {
    const ordenadas = [...rows].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === 'string' || typeof bv === 'string') {
        return String(av ?? '').localeCompare(String(bv ?? ''), 'pt-BR') * sortDir;
      }
      return ((av ?? 0) - (bv ?? 0)) * sortDir;
    });

    containerEl.innerHTML = `<table class="sortable-table"><thead><tr>${columns.map((c) => {
      const active = c.key === sortKey;
      const arrow = active ? (sortDir === 1 ? ' ▲' : ' ▼') : '';
      return `<th data-key="${c.key}" class="${c.align || ''}" aria-sort="${active ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'}">${c.label}${arrow}</th>`;
    }).join('')}</tr></thead><tbody>${ordenadas.map((row) => `<tr>${columns.map((c) => `<td class="${c.align || ''}">${c.format ? c.format(row[c.key], row) : row[c.key]}</td>`).join('')}</tr>`).join('')}</tbody></table>`;

    containerEl.querySelectorAll('th[data-key]').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (key === sortKey) sortDir *= -1;
        else { sortKey = key; sortDir = 1; }
        render();
      });
    });
  }

  render();
}
