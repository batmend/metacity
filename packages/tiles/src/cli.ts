#!/usr/bin/env tsx
/**
 * Хэрэглээ:
 *   tsx src/cli.ts demo            — демо seed-ээс PMTiles үүсгэнэ
 *   tsx src/cli.ts geojson <dir>   — <dir>/{layer}.geojson файлуудаас PMTiles үүсгэнэ
 *                                    (хотын өөрийн GIS давхаргууд: кадастр, инженерийн шугам г.м.)
 *   tsx src/cli.ts models            — нарийвчилсан 3D загварууд (glTF) үүсгэнэ
 *   tsx src/cli.ts normalize <in.pmtiles> <out.pmtiles>
 *                                  — OSM гаралтын нэршил цэвэрлэх (монгол бичиг хасах)
 *   tsx src/cli.ts search-index <archive.pmtiles> [out.json]
 *                                  — ямар ч архиваас хайлтын индекс (OSM гаралтад ч ажиллана)
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { FeatureCollection } from 'geojson';
import { DEMO_BOUNDS, LAYER, UB_CENTER, type LayerName } from '@metacity/schema';
import { buildArchive, writeFile } from './build.js';
import { generateUlaanbaatarSeed } from './seed/ub.js';
import type { LayerCollections } from './encode.js';
import { buildSearchIndex } from './search-index.js';
import { PMTiles } from 'pmtiles';
import { normalizeArchive } from './normalize.js';
import { buildPalace } from './models/palace.js';
import { MemorySource, NodeFileSource } from './pmtiles/node-source.js';

const here = dirname(fileURLToPath(import.meta.url));
const pkgRoot = resolve(here, '..');
const repoRoot = resolve(pkgRoot, '../..');
const OUT_DIR = join(pkgRoot, 'out');
const WEB_TILES = join(repoRoot, 'apps/web/public/tiles');
const WEB_DATA = join(repoRoot, 'apps/web/public/data');

const log = (m: string) => console.log(`[tiles] ${m}`);

function fmtKB(n: number): string {
  return `${(n / 1024).toFixed(1)} KB`;
}

function report(name: string, r: ReturnType<typeof buildArchive>): void {
  log(`${name}: ${r.encode.tileCount} tile, архив ${fmtKB(r.bytes.length)} (tile data ${fmtKB(r.stats.tileDataBytes)}, ` +
    `root dir ${fmtKB(r.stats.rootDirBytes)}, leaf ${r.stats.numLeaves})`);
  log(`хамгийн том tile: ${fmtKB(r.encode.maxTileBytes)}, хамгийн олон feature: ${r.encode.maxTileFeatures}`);
}

async function demo(): Promise<void> {
  const seed = generateUlaanbaatarSeed();
  log(`seed: ${JSON.stringify(seed.counts)}`);
  mkdirSync(OUT_DIR, { recursive: true });
  // Debug: давхарга бүрийг GeoJSON-оор хадгална (QGIS г.м. дээр нээж шалгахад)
  for (const [name, fc] of Object.entries(seed.layers)) {
    writeFileSync(join(OUT_DIR, `seed-${name}.geojson`), JSON.stringify(fc));
  }
  const r = buildArchive(seed.layers, {
    name: 'Meta City — Улаанбаатар демо',
    description: 'Сүхбаатарын талбайн орчим, демо seed өгөгдөл (ойролцоо)',
    attribution: '© Meta City (демо өгөгдөл)',
    bounds: DEMO_BOUNDS,
    center: { ...UB_CENTER, zoom: 15 },
    log,
  });
  report('demo', r);
  writeFile(join(OUT_DIR, 'ub-demo.pmtiles'), r.bytes);
  writeFile(join(WEB_TILES, 'ub-demo.pmtiles'), r.bytes);
  const index = await buildSearchIndex(new MemorySource(r.bytes));
  mkdirSync(WEB_DATA, { recursive: true });
  writeFileSync(join(WEB_DATA, 'search-index.json'), JSON.stringify(index));
  await writeTilesMeta(new MemorySource(r.bytes), join(WEB_DATA, 'tiles-meta.json'));
  log(`бичлээ: ${join(WEB_TILES, 'ub-demo.pmtiles')}, search-index.json (${index.length} бичлэг)`);
}

/**
 * Архивын header/metadata → апп-д хэрэгтэй товч мэдээлэл (хил, төв, нэр, attribution).
 * Вэб болон гар утасны апп үүнийг уншиж maxBounds, эхний камер, attribution-оо тохируулна.
 */
async function writeTilesMeta(source: import('pmtiles').Source, outFile: string): Promise<void> {
  const pm = new PMTiles(source);
  const h = await pm.getHeader();
  const m = (await pm.getMetadata()) as { name?: string; attribution?: string; description?: string };
  const meta = {
    name: m.name ?? 'Meta City',
    description: m.description ?? '',
    attribution: m.attribution ?? '',
    bounds: { west: h.minLon, south: h.minLat, east: h.maxLon, north: h.maxLat },
    center: { lng: h.centerLon, lat: h.centerLat, zoom: h.centerZoom },
    minzoom: h.minZoom,
    maxzoom: h.maxZoom,
    tiles: h.numAddressedTiles,
    generatedAt: new Date().toISOString(),
  };
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(meta, null, 2));
  log(`tiles-meta: ${meta.name}, ${meta.tiles} tile, z${meta.minzoom}–${meta.maxzoom} → ${outFile}`);
}

/** Ямар ч PMTiles архиваас (OSM/planetiler гаралт г.м.) хайлтын индекс + мета үүсгэнэ. */
async function searchIndexFrom(archive: string, outFile: string): Promise<void> {
  const src = new NodeFileSource(archive);
  const index = await buildSearchIndex(src);
  mkdirSync(dirname(outFile), { recursive: true });
  writeFileSync(outFile, JSON.stringify(index));
  log(`search-index: ${index.length} бичлэг → ${outFile}`);
  await writeTilesMeta(src, join(dirname(outFile), 'tiles-meta.json'));
  src.close();
}

function fromGeojsonDir(dir: string): void {
  const layers: LayerCollections = {};
  for (const name of Object.values(LAYER) as LayerName[]) {
    const p = join(dir, `${name}.geojson`);
    if (!existsSync(p)) continue;
    layers[name] = JSON.parse(readFileSync(p, 'utf8')) as FeatureCollection;
    log(`${name}: ${layers[name]!.features.length} feature`);
  }
  if (Object.keys(layers).length === 0) throw new Error(`${dir} дотор {layer}.geojson файл олдсонгүй`);
  // bounds-ийг өгөгдлөөс тооцно
  let west = 180, south = 90, east = -180, north = -90;
  const visit = (c: unknown): void => {
    if (typeof c?.[0 as never] === 'number') {
      const [x, y] = c as [number, number];
      west = Math.min(west, x); east = Math.max(east, x); south = Math.min(south, y); north = Math.max(north, y);
    } else if (Array.isArray(c)) for (const x of c) visit(x);
  };
  for (const fc of Object.values(layers)) for (const f of fc.features) visit((f.geometry as { coordinates?: unknown }).coordinates);
  const bounds = { west, south, east, north };
  const r = buildArchive(layers, {
    name: 'Meta City — custom',
    bounds,
    center: { lng: (west + east) / 2, lat: (south + north) / 2, zoom: 14 },
    log,
  });
  report('geojson', r);
  writeFile(join(OUT_DIR, 'custom.pmtiles'), r.bytes);
}

/** OSM гаралтын нэршлийг цэвэрлэж (монгол бичиг хасах) шинэ архив бичнэ. */
async function normalize(input: string, output: string): Promise<void> {
  const src = new NodeFileSource(input);
  const corrPath = join(pkgRoot, 'corrections/ub.json');
  const corrections = existsSync(corrPath) ? (JSON.parse(readFileSync(corrPath, 'utf8')) as import('@metacity/schema').BuildingCorrections) : {};
  const r = await normalizeArchive(src, { corrections, log });
  src.close();
  writeFile(output, r.bytes);
  log(`normalize: ${r.changed} нэр цэвэрлэв, ${r.corrected} барилга залруулав, ${r.stats.addressedTiles} tile → ${output} (${fmtKB(r.bytes.length)})`);
}

/** Нарийвчилсан 3D загварууд (glTF) + бүртгэл → apps/web/public/models/ */
function models(): void {
  const dir = join(repoRoot, 'apps/web/public/models');
  mkdirSync(dir, { recursive: true });
  const palace = buildPalace();
  writeFileSync(join(dir, 'government-palace.glb'), palace.glb);
  log(`government-palace.glb: ${fmtKB(palace.glb.length)}, ${palace.stats.triangles} гурвалжин, ${palace.stats.materials} материал`);
  writeFileSync(join(dir, 'registry.json'), JSON.stringify([palace.def], null, 2));
  log(`registry.json → ${dir}`);
}

const [cmd, arg, arg2] = process.argv.slice(2);
switch (cmd) {
  case 'models':
    models();
    break;
  case 'normalize':
    if (!arg || !arg2) throw new Error('normalize <in.pmtiles> <out.pmtiles>');
    await normalize(resolve(arg), resolve(arg2));
    break;
  case 'demo':
    await demo();
    break;
  case 'geojson':
    if (!arg) throw new Error('directory өгнө үү');
    fromGeojsonDir(resolve(arg));
    break;
  case 'search-index':
    if (!arg) throw new Error('archive.pmtiles өгнө үү');
    await searchIndexFrom(resolve(arg), resolve(arg2 ?? join(WEB_DATA, 'search-index.json')));
    break;
  default:
    console.error('Хэрэглээ: tsx src/cli.ts demo | geojson <dir> | normalize <in> <out> | search-index <archive.pmtiles> [out.json]');
    process.exit(1);
}
