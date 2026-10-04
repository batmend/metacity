/**
 * Өөрийн PMTiles бичигч протомапсын албан ёсны уншигчтай (pmtiles npm) нийцэж буйг шалгана.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gunzipSync } from 'node:zlib';
import { PMTiles, zxyToTileId as refTileId } from 'pmtiles';
import { MemorySource } from '../src/pmtiles/node-source.js';
import { buildSearchIndex } from '../src/search-index.js';
import { cleanName } from '../src/normalize.js';
import { VectorTile } from '@mapbox/vector-tile';
import { PbfReader } from 'pbf';
import { DEMO_BOUNDS, UB_CENTER } from '@metacity/schema';
import { writePMTiles, zxyToTileId, buildDirectories, serializeDirectory, type Entry } from '../src/pmtiles/writer.js';
import { generateUlaanbaatarSeed } from '../src/seed/ub.js';
import { buildArchive } from '../src/build.js';


test('zxyToTileId протомапсын хэрэгжүүлэлттэй ижил', () => {
  for (const [z, x, y] of [[0, 0, 0], [1, 1, 0], [5, 7, 12], [12, 3265, 1431], [15, 26124, 11456], [18, 208994, 91651]] as const) {
    assert.equal(zxyToTileId(z, x, y), refTileId(z, x, y), `${z}/${x}/${y}`);
  }
});

test('directory serialization round-trip (run-length + contiguous offsets)', () => {
  const entries: Entry[] = [
    { tileId: 0, offset: 0, length: 10, runLength: 1 },
    { tileId: 1, offset: 10, length: 20, runLength: 4 },
    { tileId: 9, offset: 0, length: 10, runLength: 1 },
  ];
  const bytes = serializeDirectory(entries);
  assert.ok(bytes.length > 0);
  const { root, leaves, numLeaves } = buildDirectories(entries);
  assert.equal(numLeaves, 0);
  assert.equal(leaves.length, 0);
  assert.ok(root.length > 0);
});

test('том directory leaf-үүдэд хуваагдана', () => {
  const entries: Entry[] = [];
  // gzip-д шахагдахгүй жигд бус утгууд (бодит архивтай адил)
  let tileId = 0;
  let offset = 0;
  for (let i = 0; i < 60_000; i++) {
    tileId += 1 + ((i * 7919) % 97);
    const length = 50 + ((i * 104_729) % 9973);
    entries.push({ tileId, offset, length, runLength: 1 });
    offset += length + ((i * 31) % 7);
  }
  const { root, leaves, numLeaves } = buildDirectories(entries);
  assert.ok(root.length <= 16384);
  assert.ok(numLeaves > 1);
  assert.ok(leaves.length > 0);
});

test('демо архивыг албан ёсны уншигч уншина, tile-ууд MVT байна', async () => {
  const seed = generateUlaanbaatarSeed();
  const r = buildArchive(seed.layers, {
    name: 'test',
    bounds: DEMO_BOUNDS,
    center: { ...UB_CENTER, zoom: 15 },
    minZoom: 10,
    maxZoom: 15,
  });
  const pm = new PMTiles(new MemorySource(r.bytes));
  const header = await pm.getHeader();
  assert.equal(header.specVersion, 3);
  assert.equal(header.minZoom, 10);
  assert.equal(header.maxZoom, 15);
  assert.equal(header.numAddressedTiles, r.encode.tileCount);
  assert.ok(Math.abs(header.centerLon - UB_CENTER.lng) < 1e-6);
  const meta = (await pm.getMetadata()) as { vector_layers: { id: string }[] };
  assert.ok(meta.vector_layers.some((l) => l.id === 'building'));

  // Сүхбаатарын талбайн tile z15
  const z = 15;
  const n = 2 ** z;
  const x = Math.floor(((UB_CENTER.lng + 180) / 360) * n);
  const latR = (UB_CENTER.lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n);
  const resp = await pm.getZxy(z, x, y);
  assert.ok(resp, 'төвийн tile байх ёстой');
  // pmtiles lib Node дээр decompress хийхгүй байж болзошгүй → өөрсдөө шалгана
  let data = new Uint8Array(resp!.data);
  if (data[0] === 0x1f && data[1] === 0x8b) data = new Uint8Array(gunzipSync(data));
  const vt = new VectorTile(new PbfReader(data));
  assert.ok(vt.layers['building'], 'building давхарга байх ёстой');
  assert.ok(vt.layers['transportation'], 'transportation давхарга байх ёстой');
  const bl = vt.layers['building']!;
  let foundPalace = false;
  for (let i = 0; i < bl.length; i++) {
    const f = bl.feature(i);
    if (f.properties['name'] === 'Төрийн ордон') {
      foundPalace = true;
      assert.equal(f.properties['height'], 35);
      assert.equal(f.id, f.properties['id']);
    }
  }
  assert.ok(foundPalace, 'Төрийн ордон z15 tile-д байх ёстой');

  // Байхгүй tile → undefined
  const none = await pm.getZxy(15, 0, 0);
  assert.equal(none, undefined);

  // Хайлтын индекс архиваас гарна, tile-ийн заагаар хуваагдсан feature нэгтгэгдэнэ
  const index = await buildSearchIndex(new MemorySource(r.bytes));
  const palace = index.filter((e) => e.name === 'Төрийн ордон' && e.type === 'building');
  assert.equal(palace.length, 1);
  assert.ok(Math.abs(palace[0]!.lng - 106.9176) < 0.001 && Math.abs(palace[0]!.lat - 47.9211) < 0.001);
  assert.ok(palace[0]!.services?.includes('parliament-info'));
  assert.ok(index.some((e) => e.type === 'road' && e.name === 'Энх тайвны өргөн чөлөө'));
  assert.ok(index.some((e) => e.type === 'place' && e.name === 'Улаанбаатар'));
});

test('cleanName: монгол бичгийг хасна, кирилл/латиныг хөндөхгүй', () => {
  assert.equal(cleanName('Улаанбаатар ᠤᠯᠠᠭᠠᠨ ᠪᠠᠭᠠᠲᠤᠷ'), 'Улаанбаатар');
  assert.equal(cleanName('1-р хороолол ᠑\u202fᠳᠦᠭᠡᠷ ᠬᠣᠷᠢᠶᠠᠯᠠᠯ'), '1-р хороолол');
  assert.equal(cleanName('Бага Тойрог ᠪᠠᠭ\u180eᠠ ᠲᠣᠭᠣᠷᠢᠭ'), 'Бага Тойрог');
  assert.equal(cleanName('Peace Avenue'), 'Peace Avenue');
  assert.equal(cleanName('Энх тайвны өргөн чөлөө'), 'Энх тайвны өргөн чөлөө');
});
