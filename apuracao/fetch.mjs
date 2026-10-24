'use strict';

import { APURACAO_CONFIG } from './config.mjs';

async function tryFetch(url, mode = 'cors') {
  const response = await fetch(url, { cache: 'no-store', mode });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function sameOriginProxy(url, config) {
  if (!config.proxyPath || typeof location === 'undefined') return null;
  const path = config.proxyPath.replace(/\/?$/, '');
  return `${location.origin}${path}?url=${encodeURIComponent(url)}`;
}

function fallbackProxy(url, config) {
  if (!config.proxyFallback) return null;
  return config.proxyFallback + encodeURIComponent(url);
}

/**
 * Busca JSON do TSE com fallback para proxy (CORS).
 */
export async function fetchTseJson(url, config = APURACAO_CONFIG) {
  const attempts = [url];
  const local = sameOriginProxy(url, config);
  if (local) attempts.push(local);
  const remote = fallbackProxy(url, config);
  if (remote) attempts.push(remote);

  let lastError;
  for (const attempt of attempts) {
    try {
      return await tryFetch(attempt);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('Falha ao buscar dados do TSE');
}
