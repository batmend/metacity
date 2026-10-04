/**
 * PMTiles архиваас хайлтын индекс үүсгэнэ.
 *
 * Эх сурвалж (seed / OSM / хотын GIS) ямар ч байсан ижил ажиллана: z=MAX_TILE_ZOOM
 * tile-уудыг уншиж нэртэй барилга, POI, газар, замын нэрийг төв цэгтэй нь цуглуулна.
 * Дараагийн шатанд энэ индекс API/хайлтын сервер (жишээ: Typesense) руу орно.
 */
import { gunzipSync } from 'node:zlib';
import { PMTiles, type Source } from 'pmtiles';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import type { Position } from 'geojson';
import { MAX_TILE_ZOOM, type LngLatBounds } from '@metacity/schema';
import { tileRange, round } from './geo.js';

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

const LAYER_TYPE: Record<string, SearchEntry['type']> = {
  building: 'building',
  poi: 'poi',
  place: 'place',
  transportation: 'road',
};

function centroid(coords: unknown): Position {
  let sx = 0;
  let sy = 0;
  let n = 0;
  const visit = (c: unknown): void => {
    if (Array.isArray(c) && typeof c[0] === 'number') {
      sx += c[0] as number;
      sy += c[1] as number;
      n++;
    } else if (Array.isArray(c)) for (const x of c) visit(x);
  };
  visit(coords);
  return n ? [round(sx / n, 6), round(sy / n, 6)] : [0, 0];
}

export async function buildSearchIndex(source: Source, opts: { bounds?: LngLatBounds; zoom?: number } = {}): Promise<SearchEntry[]> {
  const pm = new PMTiles(source);
  const header = await pm.getHeader();
  const zoom = Math.min(opts.zoom ?? MAX_TILE_ZOOM, header.maxZoom);
  const bounds = opts.bounds ?? { west: header.minLon, south: header.minLat, east: header.maxLon, north: header.maxLat };
  const r = tileRange(zoom, bounds);

  // нэр+класс(+id) → entry; tile-ийн зааг дээр хуваагдсан feature-үүдийг нэгтгэнэ
  const acc = new Map<string, { e: SearchEntry; sx: number; sy: number; n: number }>();

  for (let x = r.minX; x <= r.maxX; x++) {
    for (let y = r.minY; y <= r.maxY; y++) {
      const resp = await pm.getZxy(zoom, x, y);
      if (!resp) continue;
      let data = new Uint8Array(resp.data);
      if (data[0] === 0x1f && data[1] === 0x8b) data = new Uint8Array(gunzipSync(data));
      const vt = new VectorTile(new PbfReader(data));
      for (const [layerName, type] of Object.entries(LAYER_TYPE)) {
        const layer = vt.layers[layerName];
        if (!layer) continue;
        for (let i = 0; i < layer.length; i++) {
          const f = layer.feature(i);
          const p = f.properties;
          const name = p['name'];
          if (typeof name !== 'string' || !name) continue;
          const cls = String(p['class'] ?? '');
          if (type === 'road' && (cls === 'service' || cls === 'path')) continue;
          const key = `${type}|${cls}|${name}|${f.id ?? ''}`;
          const [lng, lat] = centroid((f.toGeoJSON(x, y, zoom).geometry as { coordinates?: unknown }).coordinates);
          const cur = acc.get(key);
          if (cur) {
            cur.sx += lng!;
            cur.sy += lat!;
            cur.n++;
          } else {
            const e: SearchEntry = { id: `${type[0]}-${f.id ?? acc.size}`, type, name, class: cls, lng: lng!, lat: lat! };
            if (typeof p['name_en'] === 'string') e.name_en = p['name_en'];
            if (typeof f.id === 'number') e.featureId = f.id;
            if (typeof p['services'] === 'string') e.services = p['services'];
            if (typeof p['addr'] === 'string') e.addr = p['addr'];
            acc.set(key, { e, sx: lng!, sy: lat!, n: 1 });
          }
        }
      }
    }
  }

  const out: SearchEntry[] = [];
  for (const { e, sx, sy, n } of acc.values()) out.push({ ...e, lng: round(sx / n, 6), lat: round(sy / n, 6) });
  // Чухал нь түрүүнд: газар → барилга → POI → зам, дараа нь нэрээр
  const order: Record<SearchEntry['type'], number> = { place: 0, building: 1, poi: 2, road: 3 };
  out.sort((a, b) => order[a.type] - order[b.type] || a.name.localeCompare(b.name, 'mn'));
  return out;
}
