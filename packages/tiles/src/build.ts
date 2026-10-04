/**
 * Build pipeline: давхаргууд → tiles → PMTiles файл.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  MAX_TILE_ZOOM,
  MIN_TILE_ZOOM,
  TILE_SCHEMA_VERSION,
  VECTOR_LAYERS,
  type LngLatBounds,
} from '@metacity/schema';
import { encodeTiles, type LayerCollections } from './encode.js';
import { writePMTiles, type WriteResult } from './pmtiles/writer.js';

export interface BuildOptions {
  name: string;
  description?: string;
  attribution?: string;
  bounds: LngLatBounds;
  center: { lng: number; lat: number; zoom: number };
  minZoom?: number;
  maxZoom?: number;
  log?: (msg: string) => void;
}

export function buildArchive(layers: LayerCollections, opts: BuildOptions): WriteResult & { encode: ReturnType<typeof encodeTiles>['stats'] } {
  const minZoom = opts.minZoom ?? MIN_TILE_ZOOM;
  const maxZoom = opts.maxZoom ?? MAX_TILE_ZOOM;
  const encoded = encodeTiles(layers, { bounds: opts.bounds, minZoom, maxZoom, log: opts.log });

  // vector_layers.fields — давхарга бүрийн атрибутын нэрсийг бодит өгөгдлөөс цуглуулна
  const vectorLayers = VECTOR_LAYERS.map((vl) => {
    const fields: Record<string, string> = {};
    for (const f of layers[vl.id]?.features ?? []) {
      for (const [k, v] of Object.entries(f.properties ?? {})) {
        if (!(k in fields)) fields[k] = typeof v === 'number' ? 'Number' : typeof v === 'boolean' ? 'Boolean' : 'String';
      }
    }
    return { ...vl, fields };
  });

  const metadata = {
    name: opts.name,
    description: opts.description ?? '',
    attribution: opts.attribution ?? '© Meta City',
    type: 'baselayer',
    version: '1',
    format: 'pbf',
    generator: '@metacity/tiles',
    'metacity:schema': TILE_SCHEMA_VERSION,
    vector_layers: vectorLayers,
  };

  const result = writePMTiles({
    tiles: encoded.tiles,
    metadata,
    minZoom,
    maxZoom,
    bounds: opts.bounds,
    center: opts.center,
  });
  return { ...result, encode: encoded.stats };
}

export function writeFile(path: string, bytes: Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
}
