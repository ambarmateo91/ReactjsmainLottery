// Cliente de la API pública de resultados (DGII API Cloud).
// Docs: https://dgiiapicloud.com/api/loterias
// Requiere API key gratuita (LOTERIAS_API_KEY) de https://dgiiapicloud.com/auth

const BASE = process.env.LOTERIAS_API_URL || 'https://pptonanntevatndjyzmk.supabase.co/functions/v1/loterias-api';

function headers() {
  const key = process.env.LOTERIAS_API_KEY || '';
  return { apikey: key, Authorization: `Bearer ${key}` };
}

async function getJSON(path) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${BASE}${path}`, { headers: headers(), signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) throw new Error(`Loterias API ${res.status} en ${path}`);
    return res.json();
  } catch (err) {
    clearTimeout(timeout);
    throw err;
  }
}

function asArray(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  if (payload && Array.isArray(payload.results)) return payload.results;
  if (payload && Array.isArray(payload.sorteos)) return payload.sorteos;
  return [];
}

function norm(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/** Extrae hasta 3 números (strings de 2 dígitos) de campos con varios formatos. */
export function extractNumbers(item) {
  const candidates = [
    item?.numeros,
    item?.numbers,
    item?.bolas,
    item?.resultado,
    item?.resultados,
    item?.premiados,
  ];
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) {
      const nums = c.map((n) => String(n).padStart(2, '0')).filter((n) => /^\d{2}$/.test(n));
      if (nums.length > 0) return nums.slice(0, 3);
    }
    if (typeof c === 'string' && c.trim()) {
      const nums = c.split(/[^0-9]+/).filter(Boolean).map((n) => n.padStart(2, '0').slice(-2));
      if (nums.length > 0) return nums.slice(0, 3);
    }
  }
  const direct = [item?.primero ?? item?.first ?? item?.primer_premio, item?.segundo ?? item?.second, item?.tercero ?? item?.third]
    .filter((n) => n !== undefined && n !== null && String(n).trim() !== '')
    .map((n) => String(n).padStart(2, '0').slice(-2));
  return direct.slice(0, 3);
}

function pickDate(item) {
  const raw = item?.fecha || item?.date || item?.draw_date || item?.created_at;
  if (!raw) return new Date().toISOString().slice(0, 10);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return new Date().toISOString().slice(0, 10);
  return d.toISOString().slice(0, 10);
}

/** Identifica a cuál de nuestras loterías corresponde un sorteo externo. */
export function matchLottery(item, lotteries) {
  const haystack = norm(
    [item?.slug, item?.sorteo, item?.loteria, item?.lottery, item?.nombre, item?.name, item?.compania, item?.company].join(' ')
  );
  const keys = [
    { match: ['primera'], code: 'LP' },
    { match: ['leidsa'], code: null },
    { match: ['loteka', 'loteca'], code: 'LK' },
    { match: ['real'], code: 'LR' },
    { match: ['gana mas', 'nacional'], code: 'LN' },
    { match: ['suerte'], code: 'LS' },
    { match: ['lotedom', 'lote dom'], code: 'LD' },
  ];
  for (const k of keys) {
    if (!k.match.some((m) => haystack.includes(m))) continue;
    const byName = lotteries.find((l) => k.match.some((m) => norm(l.name).includes(m)));
    if (byName) return byName;
    if (k.code) {
      const byCode = lotteries.find((l) => String(l.code || '').toUpperCase() === k.code);
      if (byCode) return byCode;
    }
  }
  return null;
}

export async function fetchLatest() {
  const payload = await getJSON('/latest');
  return asArray(payload);
}

export async function fetchByDate(yyyyMmDd) {
  const payload = await getJSON(`/fecha/${yyyyMmDd}`);
  return asArray(payload);
}

export function normalizeItem(item) {
  const numbers = extractNumbers(item);
  if (numbers.length === 0) return null;
  return {
    raw: item,
    draw_date: pickDate(item),
    first: numbers[0] || null,
    second: numbers[1] || null,
    third: numbers[2] || null,
  };
}
