import Constants from 'expo-constants';

/**
 * Газрын зургийн өгөгдлийн сервер (tile архив, glyph фонт, хайлтын индекс).
 * Апп дотор өгөгдөл байхгүй: вэбтэй яг ижил статик файлуудыг ашиглана.
 */
export const ASSETS_URL: string = (
  process.env['EXPO_PUBLIC_ASSETS_URL'] ??
  (Constants.expoConfig?.extra?.['assetsUrl'] as string | undefined) ??
  'http://localhost:4173'
).replace(/\/$/, '');

export const TILES_URL = `pmtiles://${ASSETS_URL}/tiles/ub-demo.pmtiles`;
export const GLYPHS_URL = `${ASSETS_URL}/fonts/{fontstack}/{range}.pbf`;
export const SEARCH_INDEX_URL = `${ASSETS_URL}/data/search-index.json`;
export const TILES_META_URL = `${ASSETS_URL}/data/tiles-meta.json`;
