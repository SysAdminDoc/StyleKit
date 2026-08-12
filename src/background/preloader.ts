import {
  getUserstylesIndex,
  matchesUserstylesDomain,
} from './userstyles-provider';
import { recordDiagnostic } from './diagnostics';

const THUMB_LOCAL_KEY = 'stylekit-usw-thumbs';

async function fetchDataUrl(url: string): Promise<string> {
  try {
    const res = await fetch(url, { referrerPolicy: 'no-referrer' });
    if (!res.ok) return '';
    const buffer = await res.arrayBuffer();
    const uint8 = new Uint8Array(buffer);
    const CHUNK = 8192;
    let binary = '';
    for (let i = 0; i < uint8.length; i += CHUNK) {
      binary += String.fromCharCode(
        ...Array.from(uint8.subarray(i, i + CHUNK))
      );
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
  if (!domain || domain.startsWith('chrome') || domain.startsWith('edge'))
    return;

  try {
    const { data: index } = await getUserstylesIndex();

    const dom = domain.toLowerCase().replace(/^www\./, '');
    const matches = index
      .filter(e => matchesUserstylesDomain(e, dom))
      .sort((a, b) => b.w - a.w || b.t - a.t)
      .slice(0, 150);

    if (!matches.length) return;

    const thumbResult = await chrome.storage.local.get(THUMB_LOCAL_KEY);
    const thumbs =
      (thumbResult[THUMB_LOCAL_KEY] as Record<number, string>) || {};

    const toFetch = matches.filter(s => s.sn && !thumbs[s.i]).slice(0, 10);
    if (!toFetch.length) return;

    const fetched = await Promise.all(
      toFetch.map(async s => ({ id: s.i, url: await fetchDataUrl(s.sn) }))
    );

    for (const { id, url } of fetched) {
      if (url) thumbs[id] = url;
    }

    await chrome.storage.local.set({ [THUMB_LOCAL_KEY]: thumbs });
  } catch (error) {
    await recordDiagnostic({
      category: 'provider',
      operation: 'thumbnail-preload',
      error,
      level: 'warning',
    }).catch(() => undefined);
  }
}
