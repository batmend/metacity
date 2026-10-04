import { SEARCH_INDEX_URL } from './config';

export interface SearchEntry {
  id: string;
  type: 'building' | 'poi' | 'place' | 'road';
  name: string;
  name_en?: string;
  class: string;
  lng: number;
  lat: number;
  featureId?: number;
  services?: string;
  addr?: string;
}

let cache: Promise<SearchEntry[]> | null = null;
export function loadIndex(): Promise<SearchEntry[]> {
  cache ??= fetch(SEARCH_INDEX_URL)
    .then((r) => r.json() as Promise<SearchEntry[]>)
    .catch(() => {
      cache = null;
      return [];
    });
  return cache;
}

export async function search(q: string, limit = 8): Promise<SearchEntry[]> {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  const idx = await loadIndex();
  return idx.filter((e) => e.name.toLowerCase().includes(needle) || e.name_en?.toLowerCase().includes(needle)).slice(0, limit);
}

export async function whereIs(serviceId: string): Promise<SearchEntry | undefined> {
  const idx = await loadIndex();
  return idx.find((e) => e.services?.split(',').includes(serviceId));
}
