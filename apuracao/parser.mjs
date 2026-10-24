'use strict';

const num = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(String(value).replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

const pctNum = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const n = Number(String(value).replace(',', '.'));
  return Number.isFinite(n) ? n : 0;
};

function pickScope(payload, scopeKey) {
  if (!payload) return null;
  const key = String(scopeKey || 'br').toLowerCase();
  if (payload.carg) return payload;
  if (!Array.isArray(payload.abr)) return null;
  const hit = payload.abr.find(
    (row) => String(row.cdabr || row.tpabr || '').toLowerCase() === key
      || (key === 'br' && String(row.tpabr || '').toUpperCase() === 'BR'),
  );
  return hit || payload.abr[0] || null;
}

function readSections(block, payload) {
  const s = block?.s || payload?.s;
  if (typeof s === 'object' && s !== null) {
    return {
      total: num(s.ts),
      counted: num(s.st),
      percent: pctNum(s.pst),
    };
  }
  return {
    total: num(block?.ts ?? block?.s),
    counted: num(block?.st ?? block?.s),
    percent: pctNum(block?.pst),
  };
}

function readElectorate(block, payload) {
  const e = block?.e || payload?.e;
  if (typeof e === 'object' && e !== null) {
    return {
      total: num(e.te ?? e.est),
      voted: num(e.c),
      abstention: num(e.a),
      abstentionPct: pctNum(e.pa),
    };
  }
  return {
    total: num(block?.e),
    voted: num(block?.c),
    abstention: num(block?.a),
    abstentionPct: pctNum(block?.pa),
  };
}

function readVotes(block, payload) {
  const v = block?.v || payload?.v;
  if (typeof v === 'object' && v !== null) {
    return {
      total: num(v.tv),
      valid: num(v.vv ?? v.vvc),
      blank: num(v.vb),
      null: num(v.vn),
      nullTotal: num(v.tvn),
    };
  }
  return {
    total: num(block?.tv),
    valid: num(block?.vv ?? block?.vvc),
    blank: num(block?.vb),
    null: num(block?.vn),
    nullTotal: num(block?.tvn),
  };
}

function readTiming(block, payload) {
  const dg = block?.dg || payload?.dg;
  const hg = block?.hg || payload?.hg;
  const dt = block?.dt || payload?.dt;
  const ht = block?.ht || payload?.ht;
  return {
    date: dg || dt || '',
    time: hg || ht || '',
  };
}

function candidatesFromCarg(payload, cargoCode) {
  const code = String(cargoCode);
  const cargos = payload.carg || [];
  const cargo = cargos.find((c) => String(c.cd) === code) || cargos[0];
  if (!cargo) return [];
  const out = [];
  for (const agr of cargo.agr || []) {
    for (const par of agr.par || []) {
      for (const cand of par.cand || []) {
        if (!cand || cand.vap === undefined) continue;
        out.push({
          sqcand: cand.sqcand ? String(cand.sqcand) : '',
          number: String(cand.n || ''),
          name: String(cand.nmu || cand.nm || ''),
          votes: num(cand.vap),
          percentValid: pctNum(cand.pvap),
          status: cand.st || '',
        });
      }
    }
  }
  return out;
}

function candidatesFromAbr(block) {
  const list = block.cand || [];
  return list.map((cand) => ({
    sqcand: cand.sqcand ? String(cand.sqcand) : '',
    number: String(cand.n || ''),
    name: String(cand.nm || cand.nc || ''),
    votes: num(cand.vap),
    percentValid: pctNum(cand.pvap),
    status: cand.st || '',
  }));
}

/**
 * @param {object} payload JSON bruto do TSE
 * @param {{ cargo: number, scope: string }} ctx
 */
export function parseApuracaoPayload(payload, ctx) {
  const scope = String(ctx.scope || 'br').toLowerCase();
  const block = pickScope(payload, scope);
  if (!block && !payload?.carg) {
    return { state: 'waiting', scope: scope.toUpperCase(), candidates: [] };
  }

  const sections = readSections(block, payload);
  const electorate = readElectorate(block, payload);
  const votes = readVotes(block, payload);
  const updated = readTiming(block, payload);
  const closed = String(block?.and || payload?.and || '').toLowerCase() === 'f'
    || String(block?.tf || payload?.tf || '').toLowerCase() === 's';

  let candidates = [];
  if (payload.carg) candidates = candidatesFromCarg(payload, ctx.cargo);
  else candidates = candidatesFromAbr(block);

  candidates.sort((a, b) => b.votes - a.votes || a.name.localeCompare(b.name, 'pt-BR'));

  const hasVotes = candidates.some((c) => c.votes > 0);
  const counting = sections.percent > 0 || hasVotes;
  let state = 'waiting';
  if (counting) state = closed ? 'closed' : 'live';

  const blankPct = votes.valid > 0 ? (votes.blank / votes.valid) * 100 : 0;
  const nullPct = votes.valid > 0 ? (votes.null / votes.valid) * 100 : 0;

  return {
    state,
    scope: scope.toUpperCase(),
    cargo: ctx.cargo,
    sections,
    electorate,
    votes,
    blankPct,
    nullPct,
    updated,
    closed,
    candidates,
    electionId: String(payload.ele || block?.ele || ''),
  };
}

export function buildTseResultUrl(config, role, uf) {
  const base = config.baseUrl.replace(/\/$/, '');
  const cycle = config.cycle;
  const spec = config.elections[role];
  if (!spec?.pathId || !spec?.fileId) return null;

  const pathId = spec.pathId;
  const fileId = String(spec.fileId).padStart(6, '0');
  const cargo = String(spec.cargo).padStart(4, '0');

  let folder;
  let prefix;
  if (role === 'presidente') {
    folder = spec.folder || 'br';
    prefix = spec.prefix || 'br';
  } else {
    const code = String(uf || 'SP').toLowerCase();
    folder = code;
    prefix = code;
  }

  const suffix = (config.suffixes && config.suffixes[0]) || 'u';
  return `${base}/${cycle}/${pathId}/dados/${folder}/${prefix}-c${cargo}-e${fileId}-${suffix}.json`;
}

export function buildTseResultUrls(config, role, uf) {
  const urls = [];
  const spec = config.elections[role];
  if (!spec?.pathId || !spec?.fileId) return urls;
  const one = buildTseResultUrl(config, role, uf);
  if (!one) return urls;
  const base = one.replace(/-(u|v|r)\.json$/, '');
  for (const suffix of config.suffixes || ['u']) {
    urls.push(`${base}-${suffix}.json`);
  }
  return [...new Set(urls)];
}
