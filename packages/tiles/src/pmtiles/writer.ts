/**
 * PMTiles v3 бичигч — Meta City-ийн өөрийн хэрэгжүүлэлт.
 *
 * PMTiles бол нэг файлд багтсан tile архив: клиент HTTP Range хүсэлтээр
 * зөвхөн өөрт хэрэгтэй tile-уудаа татна. Tile сервер хэрэггүй, CDN дээр
 * статик файл болгон байршуулна. Хот томроход файл томорно, харин
 * хэрэглэгчийн татах өгөгдөл ТОМРОХГҮЙ (зөвхөн харж буй хэсгээ татна).
 *
 * Спек: https://github.com/protomaps/PMTiles/blob/main/spec/v3/spec.md
 */
import { gzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';

export const enum Compression {
  Unknown = 0,
  None = 1,
  Gzip = 2,
  Brotli = 3,
  Zstd = 4,
}

export const enum TileType {
  Unknown = 0,
  Mvt = 1,
  Png = 2,
  Jpeg = 3,
  Webp = 4,
  Avif = 5,
  Mlt = 6,
}

export interface Entry {
  tileId: number;
  offset: number;
  length: number;
  runLength: number;
}

export interface WriteOptions {
  /** tileId → шахаагүй tile агуулга */
  tiles: Map<number, Uint8Array>;
  /** JSON metadata (TileJSON vector_layers гэх мэт) */
  metadata: Record<string, unknown>;
  minZoom: number;
  maxZoom: number;
  bounds: { west: number; south: number; east: number; north: number };
  center: { lng: number; lat: number; zoom: number };
  tileType?: TileType;
  /** Tile агуулгыг gzip-лэх эсэх (MVT-д үргэлж тийм). */
  tileCompression?: Compression.None | Compression.Gzip;
}

const HEADER_SIZE = 127;
const ROOT_DIR_MAX_BYTES = 16_384;

// ---------------------------------------------------------------------------
// Tile ID: Hilbert муруй (спекийн дагуу). Протомапсын lib-тэй яг ижил үр дүн өгнө.
// ---------------------------------------------------------------------------

function rotate(n: number, xy: [number, number], rx: number, ry: number): void {
  if (ry === 0) {
    if (rx === 1) {
      xy[0] = n - 1 - xy[0];
      xy[1] = n - 1 - xy[1];
    }
    const t = xy[0];
    xy[0] = xy[1];
    xy[1] = t;
  }
}

export function zxyToTileId(z: number, x: number, y: number): number {
  if (z > 26) throw new Error('Tile zoom level exceeds max safe number limit (26)');
  if (x > 2 ** z - 1 || y > 2 ** z - 1) throw new Error('tile x/y outside zoom level bounds');
  let acc = 0;
  for (let t = 0; t < z; t++) acc += 4 ** t;
  const n = 2 ** z;
  let d = 0;
  const xy: [number, number] = [x, y];
  let s = n / 2;
  while (s > 0) {
    const rx = (xy[0] & s) > 0 ? 1 : 0;
    const ry = (xy[1] & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    rotate(s, xy, rx, ry);
    s = s / 2;
  }
  return acc + d;
}

// ---------------------------------------------------------------------------
// Varint + directory serialization
// ---------------------------------------------------------------------------

class ByteWriter {
  private buf = new Uint8Array(1024);
  private pos = 0;
  private ensure(n: number): void {
    if (this.pos + n <= this.buf.length) return;
    let size = this.buf.length * 2;
    while (size < this.pos + n) size *= 2;
    const nb = new Uint8Array(size);
    nb.set(this.buf.subarray(0, this.pos));
    this.buf = nb;
  }
  varint(v: number): void {
    if (v < 0 || !Number.isSafeInteger(v)) throw new Error(`invalid varint ${v}`);
    this.ensure(10);
    // 64-бит хүртэлх утга: доод 32 битийг bit ops-оор, дээд хэсгийг хуваалтаар
    while (v >= 0x80) {
      this.buf[this.pos++] = (v % 0x80) | 0x80;
      v = Math.floor(v / 0x80);
    }
    this.buf[this.pos++] = v;
  }
  bytes(): Uint8Array {
    return this.buf.slice(0, this.pos);
  }
}

export function serializeDirectory(entries: Entry[]): Uint8Array {
  const w = new ByteWriter();
  w.varint(entries.length);
  let last = 0;
  for (const e of entries) {
    w.varint(e.tileId - last);
    last = e.tileId;
  }
  for (const e of entries) w.varint(e.runLength);
  for (const e of entries) w.varint(e.length);
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i]!;
    const prev = entries[i - 1];
    if (i > 0 && prev && e.offset === prev.offset + prev.length) w.varint(0);
    else w.varint(e.offset + 1);
  }
  return w.bytes();
}

/**
 * Root directory 16KB-д багтахгүй бол leaf directory-д хуваана
 * (go-pmtiles-ийн optimize_directories алгоритм).
 */
export function buildDirectories(entries: Entry[]): { root: Uint8Array; leaves: Uint8Array; numLeaves: number } {
  const rootOnly = gzipSync(serializeDirectory(entries));
  if (rootOnly.length <= ROOT_DIR_MAX_BYTES) {
    return { root: rootOnly, leaves: new Uint8Array(0), numLeaves: 0 };
  }
  let leafSize = 4096;
  for (;;) {
    const rootEntries: Entry[] = [];
    const leafChunks: Uint8Array[] = [];
    let leafOffset = 0;
    for (let i = 0; i < entries.length; i += leafSize) {
      const chunk = entries.slice(i, i + leafSize);
      const bytes = gzipSync(serializeDirectory(chunk));
      rootEntries.push({ tileId: chunk[0]!.tileId, offset: leafOffset, length: bytes.length, runLength: 0 });
      leafChunks.push(bytes);
      leafOffset += bytes.length;
    }
    const root = gzipSync(serializeDirectory(rootEntries));
    if (root.length <= ROOT_DIR_MAX_BYTES) {
      return { root, leaves: concat(leafChunks), numLeaves: leafChunks.length };
    }
    leafSize *= 2;
  }
}

function concat(chunks: Uint8Array[]): Uint8Array {
  let total = 0;
  for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const c of chunks) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

function writeHeader(h: {
  rootOffset: number;
  rootLength: number;
  metadataOffset: number;
  metadataLength: number;
  leafOffset: number;
  leafLength: number;
  tileDataOffset: number;
  tileDataLength: number;
  numAddressedTiles: number;
  numTileEntries: number;
  numTileContents: number;
  clustered: boolean;
  internalCompression: Compression;
  tileCompression: Compression;
  tileType: TileType;
  minZoom: number;
  maxZoom: number;
  bounds: WriteOptions['bounds'];
  center: WriteOptions['center'];
}): Uint8Array {
  const buf = new Uint8Array(HEADER_SIZE);
  const dv = new DataView(buf.buffer);
  const magic = 'PMTiles';
  for (let i = 0; i < magic.length; i++) buf[i] = magic.charCodeAt(i);
  buf[7] = 3;
  const u64 = (off: number, v: number) => dv.setBigUint64(off, BigInt(v), true);
  u64(8, h.rootOffset);
  u64(16, h.rootLength);
  u64(24, h.metadataOffset);
  u64(32, h.metadataLength);
  u64(40, h.leafOffset);
  u64(48, h.leafLength);
  u64(56, h.tileDataOffset);
  u64(64, h.tileDataLength);
  u64(72, h.numAddressedTiles);
  u64(80, h.numTileEntries);
  u64(88, h.numTileContents);
  buf[96] = h.clustered ? 1 : 0;
  buf[97] = h.internalCompression;
  buf[98] = h.tileCompression;
  buf[99] = h.tileType;
  buf[100] = h.minZoom;
  buf[101] = h.maxZoom;
  const e7 = (v: number) => Math.round(v * 1e7);
  dv.setInt32(102, e7(h.bounds.west), true);
  dv.setInt32(106, e7(h.bounds.south), true);
  dv.setInt32(110, e7(h.bounds.east), true);
  dv.setInt32(114, e7(h.bounds.north), true);
  buf[118] = h.center.zoom;
  dv.setInt32(119, e7(h.center.lng), true);
  dv.setInt32(123, e7(h.center.lat), true);
  return buf;
}

// ---------------------------------------------------------------------------
// Үндсэн бичигч
// ---------------------------------------------------------------------------

export interface WriteResult {
  bytes: Uint8Array;
  stats: {
    addressedTiles: number;
    tileEntries: number;
    tileContents: number;
    tileDataBytes: number;
    rootDirBytes: number;
    leafDirBytes: number;
    numLeaves: number;
  };
}

export function writePMTiles(opts: WriteOptions): WriteResult {
  const tileType = opts.tileType ?? TileType.Mvt;
  const tileCompression = opts.tileCompression ?? Compression.Gzip;

  // 1. tileId-аар эрэмбэлнэ (clustered = tile data нь id-ийн дарааллаар)
  const ids = [...opts.tiles.keys()].sort((a, b) => a - b);

  // 2. Давхардсан агуулгыг нэг л удаа бичнэ (hash → offset/length)
  const contentIndex = new Map<string, { offset: number; length: number }>();
  const dataChunks: Uint8Array[] = [];
  let dataOffset = 0;
  const entries: Entry[] = [];

  for (const id of ids) {
    const raw = opts.tiles.get(id)!;
    const data = tileCompression === Compression.Gzip ? gzipSync(raw) : raw;
    const hash = createHash('md5').update(data).digest('hex');
    let loc = contentIndex.get(hash);
    if (!loc) {
      loc = { offset: dataOffset, length: data.length };
      contentIndex.set(hash, loc);
      dataChunks.push(data);
      dataOffset += data.length;
    }
    // 3. Run-length: дараалсан id, ижил агуулга → нэг entry
    const last = entries[entries.length - 1];
    if (last && last.offset === loc.offset && last.length === loc.length && last.tileId + last.runLength === id) {
      last.runLength++;
    } else {
      entries.push({ tileId: id, offset: loc.offset, length: loc.length, runLength: 1 });
    }
  }

  const { root, leaves, numLeaves } = buildDirectories(entries);
  const metadataBytes = gzipSync(Buffer.from(JSON.stringify(opts.metadata), 'utf8'));
  const tileData = concat(dataChunks);

  const rootOffset = HEADER_SIZE;
  const metadataOffset = rootOffset + root.length;
  const leafOffset = metadataOffset + metadataBytes.length;
  const tileDataOffset = leafOffset + leaves.length;

  const header = writeHeader({
    rootOffset,
    rootLength: root.length,
    metadataOffset,
    metadataLength: metadataBytes.length,
    leafOffset,
    leafLength: leaves.length,
    tileDataOffset,
    tileDataLength: tileData.length,
    numAddressedTiles: ids.length,
    numTileEntries: entries.length,
    numTileContents: contentIndex.size,
    clustered: true,
    internalCompression: Compression.Gzip,
    tileCompression,
    tileType,
    minZoom: opts.minZoom,
    maxZoom: opts.maxZoom,
    bounds: opts.bounds,
    center: opts.center,
  });

  return {
    bytes: concat([header, root, metadataBytes, leaves, tileData]),
    stats: {
      addressedTiles: ids.length,
      tileEntries: entries.length,
      tileContents: contentIndex.size,
      tileDataBytes: tileData.length,
      rootDirBytes: root.length,
      leafDirBytes: leaves.length,
      numLeaves,
    },
  };
}
