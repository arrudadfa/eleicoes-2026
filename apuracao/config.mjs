/**
 * IDs do pleito no caminho da URL do TSE (pasta numérica após ele2026/).
 * No 1º turno de 2026: presidente 6257, governador por UF 6259 (pleito geral 3220).
 * No 2º turno de 2026, a eleição de presidente é a 6258; o resultado oficial final já
 * está em dados/resultados-2026.json e é a fonte padrão da aba de apuração. O feed ao
 * vivo abaixo (pathId/fileId) é só uma atualização opcional: os valores ainda não
 * estavam publicados em resultados.tse.jus.br/oficial/ele2026/ quando este arquivo foi
 * escrito — preencha pathId e fileId de presidente com o diretório real do TSE para
 * ativar o feed ao vivo.
 */
export const APURACAO_CONFIG = {
  cycle: 'ele2026',
  baseUrl: 'https://resultados.tse.jus.br/oficial',
  refreshSeconds: 45,
  /** Urnas fecham às 17:00 em Brasília (2º turno 25/10/2026). */
  pollCloseIso: '2026-10-25T17:00:00-03:00',
  /**
   * O TSE responde 403 a pedidos com cabeçalho Origin (GitHub Pages, localhost).
   * O painel tenta primeiro /api/tse (servidor.py) e depois proxyFallback.
   */
  proxyPath: '/api/tse',
  proxyFallback: 'https://api.allorigins.win/raw?url=',
  suffixes: ['u', 'v', 'r'],
  elections: {
    presidente: {
      pathId: null,
      fileId: null,
      cargo: 1,
      folder: 'br',
      prefix: 'br',
    },
    governador: {
      pathId: null,
      fileId: null,
      cargo: 3,
    },
  },
  /** Estados com 2º turno de governador em 25/10/2026. */
  runoffGovernorUfs: ['AC', 'AM', 'TO', 'RN', 'DF', 'ES'],
  referenceFirstRound: { presidente: 6257, governador: 6259, pleito: 3220 },
  referenceSecondRound: { presidente: 6258 },
  reference2022SecondRound: { presidente: 545, cargoPresidente: 1 },
};
