/**
 * Архивын нэршил цэвэрлэх алхам (OSM гаралтад).
 *
 * Монголын OSM өгөгдөлд `name` тагт кирилл + монгол бичиг хамт бичигдсэн тохиолдол олон
 * ("Улаанбаатар ᠤᠯᠠᠭᠠᠨ ᠪᠠᠭᠠᠲᠤᠷ"). Монгол бичиг босоо бичигддэг тул газрын зургийн
 * хэвтээ шошгонд тохирохгүй, фонтын муж ч тусдаа. Энэ алхам бүх tile-ийн
 * name/name_en-ээс монгол бичгийн тэмдэгтийг (U+1800–U+18AF, U+202F, U+180E) хасна.
 * Цэвэрлэсэн tile-уудыг ижил metadata-тай шинэ архивт бичнэ (өөрийн бичигчээр).
 */
import { gunzipSync } from 'node:zlib';
import { PMTiles, type Source } from 'pmtiles';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { fromVectorTileJs } from '@maplibre/vt-pbf';
import { tileRange } from './geo.js';
import { writePMTiles, zxyToTileId, type WriteResult } from './pmtiles/writer.js';
import type { BuildingCorrections } from '@metacity/schema';

// Монгол бичиг (U+1800–U+18AF), Mongolian Supplement (U+11660–U+1167F), NNBSP (U+202F), MVS (U+180E)
const MONGOLIAN = /[\u{1800}-\u{18AF}\u{11660}-\u{1167F}\u{202F}\u{180E}]/gu;

export function cleanName(v: string): string {
  return v.replace(MONGOLIAN, '').replace(/\s+/g, ' ').trim();
}

const NAME_KEYS = ['name', 'name_en'];

export interface NormalizeOptions {
  /** Барилгын id → атрибутын залруулга (жишээ: Төрийн ордны давхар OSM-д 1 гэж буруу орсон) */
  corrections?: BuildingCorrections;
  log?: (m: string) => void;
}

export async function normalizeArchive(source: Source, opts: NormalizeOptions | ((m: string) => void) = {}): Promise<WriteResult & { changed: number; corrected: number }> {
  const { corrections = {}, log = () => {} } = typeof opts === 'function' ? { log: opts } : opts;
  let corrected = 0;
  const pm = new PMTiles(source);
  const h = await pm.getHeader();
  const metadata = (await pm.getMetadata()) as Record<string, unknown>;
  const bounds = { west: h.minLon, south: h.minLat, east: h.maxLon, north: h.maxLat };
  const tiles = new Map<number, Uint8Array>();
  let changed = 0;

  for (let z = h.minZoom; z <= h.maxZoom; z++) {
    const r = tileRange(z, bounds);
    let count = 0;
    for (let x = r.minX; x <= r.maxX; x++) {
      for (let y = r.minY; y <= r.maxY; y++) {
        const resp = await pm.getZxy(z, x, y);
        if (!resp) continue;
        let data = new Uint8Array(resp.data);
        if (data[0] === 0x1f && data[1] === 0x8b) data = new Uint8Array(gunzipSync(data));
        const vt = new VectorTile(new PbfReader(data));
        let dirty = false;
        // layer.feature(i) дуудлага бүрт ШИНЭ объект үүсгэдэг тул өөрчилсөн feature-үүдийг
        // cache-лэж, дахин кодлогчид тэднийг өгнө (үгүй бол өөрчлөлт алдагдана)
        const cached: Record<string, { layer: (typeof vt.layers)[string]; features: ReturnType<(typeof vt.layers)[string]['feature']>[] }> = {};
        for (const [name, layer] of Object.entries(vt.layers)) {
          const features = Array.from({ length: layer.length }, (_, i) => layer.feature(i));
          cached[name] = { layer, features };
          for (const f of features) {
            const p = f.properties;
            if (name === 'building' && typeof p['id'] === 'number' && corrections[String(p['id'])]) {
              Object.assign(p, corrections[String(p['id'])]);
              dirty = true;
              corrected++;
            }
            for (const k of NAME_KEYS) {
              const v = p[k];
              if (typeof v === 'string' && MONGOLIAN.test(v)) {
                MONGOLIAN.lastIndex = 0;
                const c = cleanName(v);
                if (c) p[k] = c;
                else delete p[k];
                dirty = true;
                changed++;
              }
              MONGOLIAN.lastIndex = 0;
            }
          }
        }
        if (dirty) {
          const layers: Record<string, { version: number; name: string; extent: number; length: number; feature: (i: number) => never }> = {};
          for (const [name, { layer, features }] of Object.entries(cached)) {
            layers[name] = { version: layer.version, name: layer.name, extent: layer.extent, length: layer.length, feature: (i) => features[i] as never };
          }
          tiles.set(zxyToTileId(z, x, y), fromVectorTileJs({ layers }));
        } else {
          tiles.set(zxyToTileId(z, x, y), data);
        }
        count++;
      }
    }
    log(`z${z}: ${count} tile`);
  }

  const result = writePMTiles({
    tiles,
    metadata,
    minZoom: h.minZoom,
    maxZoom: h.maxZoom,
    bounds,
    center: { lng: h.centerLon, lat: h.centerLat, zoom: h.centerZoom },
    tileType: h.tileType as never,
  });
  return { ...result, changed, corrected };
}
