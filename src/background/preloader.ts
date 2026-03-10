const INDEX_SESSION_KEY = 'stylekit-usw-index';
const THUMB_LOCAL_KEY = 'stylekit-usw-thumbs';
const INDEX_TTL_MS = 60 * 60 * 1000; // 1 hour

interface USWEntry {
  i: number;
  n: string;
  c: string;
  w: number;
  t: number;
  sn: string;
}

async function fetchIndex(): Promise<USWEntry[]> {
  const res = await fetch('https://userstyles.world/api/index/uso-format', {
    referrerPolicy: 'no-referrer',
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  return json.data || [];
}

async function getIndex(): Promise<USWEntry[]> {
  const stored = await chrome.storage.session.get(INDEX_SESSION_KEY);
  const cached = stored[INDEX_SESSION_KEY] as
    | { data: USWEntry[]; ts: number }
    | undefined;
  if (cached && Date.now() - cached.ts < INDEX_TTL_MS) {
    return cached.data;
  }
  const data = await fetchIndex();
  await chrome.storage.session.set({ [INDEX_SESSION_KEY]: { data, ts: Date.now() } });
  return data;
}

function matchesDomain(entry: USWEntry, dom: string): boolean {
  const cat = (entry.c || '').toLowerCase().replace(/^www\./, '');
  if (!cat) return false;
  if (cat === dom) return true;
  if (dom.endsWith('.' + cat) || cat.endsWith('.' + dom)) return true;
  const domCore = dom.replace(/\.(com|org|net|io|co|edu|gov|me|app|dev)(\.\w+)?$/, '');
  const catCore = cat.replace(/\.(com|org|net|io|co|edu|gov|me|app|dev)(\.\w+)?$/, '');
  if (domCore === catCore) return true;
  return domCore.split('.').some(part => part === catCore || part === cat);
}

async function fetchDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { referrerPolicy: 'no-referrer' });
    if (!res.ok) return '';
    const buffer = await res.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    const CHUNK = 8192;
    let binary = '';
    for (let i = 0; i < uint8.length; i += CHUNK) {
      binary += String.fromCharCode(...Array.from(uint8.subarray(i, i + CHUNK)));
    }
    const contentType = res.headers.get('content-type') || 'image/webp';
    return `data:${contentType};base64,${btoa(binary)}`;
  } catch {
    return '';
  }
}

export async function getCachedThumb(styleId: number): Promise<string> {
  const result = await chrome.storage.local.get(THUMB_LOCAL_KEY);
  const cache = (result[THUMB_LOCAL_KEY] as Record<number, string>) || {};
  return cache[styleId] || '';
}

export async function setCachedThumb(
  styleId: number,
  dataUrl: string
): Promise<void> {
  const result = await chrome.storage.local.get(THUMB_LOCAL_KEY);
  const cache = (result[THUMB_LOCAL_KEY] as Record<number, string>) || {};
  cache[styleId] = dataUrl;
  await chrome.storage.local.set({ [THUMB_LOCAL_KEY]: cache });
}

export async function preloadForDomain(domain: string): Promise<void> {
  if (!domain || domain.startsWith('chrome') || domain.startsWith('edge')) return;

  try {
    const index = await getIndex();

    const dom = domain.toLowerCase().replace(/^www\./, '');
    const matches = index
      .filter(e => matchesDomain(e, dom))
      .sort((a, b) => b.w - a.w || b.t - a.t)
      .slice(0, 150);

    if (!matches.length) return;

    const thumbResult = await chrome.storage.local.get(THUMB_LOCAL_KEY);
    const thumbs = (thumbResult[THUMB_LOCAL_KEY] as Record<number, string>) || {};

    const toFetch = matches.filter(s => s.sn && !thumbs[s.i]).slice(0, 10);
    if (!toFetch.length) return;

    const fetched = await Promise.all(
      toFetch.map(async s => ({ id: s.i, url: await fetchDataUrl(s.sn) }))
    );

    for (const { id, url } of fetched) {
      if (url) thumbs[id] = url;
    }

    await chrome.storage.local.set({ [THUMB_LOCAL_KEY]: thumbs });
  } catch {
    // silent — background optimization only
  }
}
