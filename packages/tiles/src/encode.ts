/**
 * GeoJSON давхаргууд → MVT (Mapbox Vector Tile) → tileId→bytes.
 *
 * Хоёр л зарчим:
 *  1. Давхарга бүр өөрийн zoom хүрээтэй (schema.LAYER_ZOOM).
 *  2. Zoom бүр дээр `includeAtZoom` ерөнхийлөлт хийж, tile-ийн хэмжээг
 *     TILE_BUDGET дотор барина. Хэтэрвэл build алдаа өгнө — "дараа засна"
 *     гэж орхихгүй.
 */
import { GeoJSONVT } from '@maplibre/geojson-vt';
import { fromGeojsonVt } from '@maplibre/vt-pbf';
import type { GeoJSONVTTile } from '@maplibre/geojson-vt';
import type { Feature, FeatureCollection, Geometry } from 'geojson';
import {
  LAYER_ZOOM,
  TILE_BUDGET,
  TILE_EXTENT,
  includeAtZoom,
  type LayerName,
  type LngLatBounds,
} from '@metacity/schema';
import { featureArea, lineLength, tileRange } from './geo.js';
import { zxyToTileId } from './pmtiles/writer.js';

export type LayerCollections = Partial<Record<LayerName, FeatureCollection>>;

export interface EncodeOptions {
  bounds: LngLatBounds;
  minZoom: number;
  maxZoom: number;
  /** Zoom бүрийн геометрийн хялбарчлалын tolerance (tile нэгж). */
  tolerance?: number;
  log?: (msg: string) => void;
}

export interface EncodeResult {
  tiles: Map<number, Uint8Array>;
  stats: {
    tileCount: number;
    maxTileBytes: number;
    maxTileFeatures: number;
    bytesByZoom: Record<number, number>;
    tilesByZoom: Record<number, number>;
  };
}

function metricsOf(f: Feature): { area?: number; length?: number } {
  const g: Geometry = f.geometry;
  if (g.type === 'Polygon' || g.type === 'MultiPolygon') return { area: featureArea(f as never) };
  if (g.type === 'LineString' || g.type === 'MultiLineString') return { length: lineLength(f as never) };
  return {};
}

export function encodeTiles(layers: LayerCollections, opts: EncodeOptions): EncodeResult {
  const log = opts.log ?? (() => {});
  const tiles = new Map<number, Uint8Array>();
  const bytesByZoom: Record<number, number> = {};
  const tilesByZoom: Record<number, number> = {};
  let maxTileBytes = 0;
  let maxTileFeatures = 0;

  for (let z = opts.minZoom; z <= opts.maxZoom; z++) {
    // Zoom бүр дээр давхарга тус бүрийг ерөнхийлж, тусдаа индекслэнэ.
    const indexes: Partial<Record<LayerName, GeoJSONVT>> = {};
    for (const [name, fc] of Object.entries(layers) as [LayerName, FeatureCollection][]) {
      const zr = LAYER_ZOOM[name];
      if (z < zr.min || z > zr.max) continue;
      const features = fc.features.filter((f) =>
        includeAtZoom(name, z, (f.properties ?? {}) as Record<string, unknown>, metricsOf(f)),
      );
      if (features.length === 0) continue;
      indexes[name] = new GeoJSONVT(
        { type: 'FeatureCollection', features },
        {
          maxZoom: z,
          indexMaxZoom: z,
          indexMaxPoints: 0,
          tolerance: opts.tolerance ?? 3,
          extent: TILE_EXTENT,
          buffer: 64,
        },
      );
    }

    const r = tileRange(z, opts.bounds);
    let count = 0;
    for (let x = r.minX; x <= r.maxX; x++) {
      for (let y = r.minY; y <= r.maxY; y++) {
        const layerTiles: Record<string, GeoJSONVTTile> = {};
        let nFeatures = 0;
        for (const [name, idx] of Object.entries(indexes) as [LayerName, GeoJSONVT][]) {
          const t = idx.getTile(z, x, y);
          if (t && t.features.length > 0) {
            layerTiles[name] = t;
            nFeatures += t.features.length;
          }
        }
        if (nFeatures === 0) continue;
        const bytes = fromGeojsonVt(layerTiles, { version: 2, extent: TILE_EXTENT });
        if (bytes.length > TILE_BUDGET.maxTileBytes || nFeatures > TILE_BUDGET.maxFeaturesPerTile) {
          throw new Error(
            `Tile ${z}/${x}/${y} хэтэрлээ: ${bytes.length} байт, ${nFeatures} feature ` +
              `(хязгаар ${TILE_BUDGET.maxTileBytes} байт / ${TILE_BUDGET.maxFeaturesPerTile}). ` +
              `includeAtZoom ерөнхийлөлтийг чангалах хэрэгтэй.`,
          );
        }
        tiles.set(zxyToTileId(z, x, y), bytes);
        count++;
        bytesByZoom[z] = (bytesByZoom[z] ?? 0) + bytes.length;
        maxTileBytes = Math.max(maxTileBytes, bytes.length);
        maxTileFeatures = Math.max(maxTileFeatures, nFeatures);
      }
    }
    tilesByZoom[z] = count;
    log(`z${z}: ${count} tile, ${((bytesByZoom[z] ?? 0) / 1024).toFixed(1)} KB`);
  }

  return { tiles, stats: { tileCount: tiles.size, maxTileBytes, maxTileFeatures, bytesByZoom, tilesByZoom } };
}
