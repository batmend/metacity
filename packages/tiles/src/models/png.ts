/** Маш энгийн PNG (RGBA, 8-бит) кодлогч + procedural texture үүсгэгчид. Node-ийн zlib-ээс өөр хамааралгүй. */
import { deflateSync } from 'node:zlib';

function crc32(buf: Uint8Array): number {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i]!;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

export function encodePNG(width: number, height: number, rgba: Uint8Array): Uint8Array {
  const raw = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0;
    raw.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  const chunk = (type: string, data: Uint8Array): Uint8Array => {
    const out = new Uint8Array(12 + data.length);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, data.length);
    out.set([type.charCodeAt(0), type.charCodeAt(1), type.charCodeAt(2), type.charCodeAt(3)], 4);
    out.set(data, 8);
    dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
    return out;
  };
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, width);
  dv.setUint32(4, height);
  ihdr.set([8, 6, 0, 0, 0], 8);
  const parts = [new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', new Uint8Array(0))];
  let n = 0;
  for (const p of parts) n += p.length;
  const out = new Uint8Array(n);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Давтагдах (deterministic) шуугиан */
function hash(x: number, y: number, seed: number): number {
  let h = (x * 374761393 + y * 668265263 + seed * 1442695041) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function smoothNoise(x: number, y: number, scale: number, seed: number): number {
  const gx = x / scale, gy = y / scale;
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = gx - x0, fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const a = hash(x0, y0, seed), b = hash(x0 + 1, y0, seed), c = hash(x0, y0 + 1, seed), d = hash(x0 + 1, y0 + 1, seed);
  return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy;
}

export type Texture = { png: Uint8Array; width: number; height: number };

function image(w: number, h: number, fn: (x: number, y: number) => [number, number, number]): Texture {
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const [r, g, b] = fn(x, y);
      const i = (y * w + x) * 4;
      rgba[i] = Math.max(0, Math.min(255, r | 0));
      rgba[i + 1] = Math.max(0, Math.min(255, g | 0));
      rgba[i + 2] = Math.max(0, Math.min(255, b | 0));
      rgba[i + 3] = 255;
    }
  return { png: encodePNG(w, h, rgba), width: w, height: h };
}

/** Шавардсан чулуун хана: цайвар шар-саарал, хэвтээ блокийн зураас, бага зэрэг толбо. 1 texture = 4×4 м */
export function plasterTexture(seed = 1): Texture {
  return image(256, 256, (x, y) => {
    const n = smoothNoise(x, y, 24, seed) * 0.5 + smoothNoise(x, y, 6, seed + 1) * 0.3 + hash(x, y, seed + 2) * 0.2;
    let v = 214 + (n - 0.5) * 22;
    const row = (y % 64) < 2 || (((y + 32) % 64) < 2 && ((x + Math.floor(y / 64) * 64) % 128) < 2); // блокийн заадас
    if (row) v -= 26;
    return [v + 8, v + 2, v - 12];
  });
}

/** Боржин: саарал, ширхэгтэй */
export function graniteTexture(seed = 7): Texture {
  return image(128, 128, (x, y) => {
    const n = hash(x, y, seed) * 0.55 + smoothNoise(x, y, 5, seed + 1) * 0.45;
    const v = 96 + n * 60;
    return [v, v, v + 4];
  });
}

/** Цагаан гантиг багана: босоо зураастай, бага зэрэг судалтай */
export function marbleTexture(seed = 3): Texture {
  return image(128, 256, (x, y) => {
    const vein = Math.sin((x * 0.05 + smoothNoise(x, y, 40, seed) * 6) * 1.2) * 0.5 + 0.5;
    const v = 236 - vein * 14 + (hash(x, y, seed + 1) - 0.5) * 8;
    return [v, v, v - 4];
  });
}

/** Тусгалтай хар хөх шил: цонхны хүрээ, хэвтээ хуваалт */
export function glassTexture(seed = 5): Texture {
  return image(128, 128, (x, y) => {
    const frame = x < 4 || x > 123 || y < 4 || y > 123 || Math.abs(y - 64) < 2 || Math.abs(x - 64) < 2;
    if (frame) return [230, 228, 222];
    const refl = smoothNoise(x, y, 48, seed) * 0.6 + (y / 128) * 0.4;
    return [40 + refl * 70, 58 + refl * 80, 82 + refl * 90];
  });
}

/** Хүрэл: ногоон туяатай бараан */
export function bronzeTexture(seed = 9): Texture {
  return image(64, 64, (x, y) => {
    const n = smoothNoise(x, y, 8, seed);
    return [92 + n * 40, 72 + n * 36, 40 + n * 30];
  });
}

/** Дээвэр: хар саарал бетон хавтан, заадастай */
export function roofTexture(seed = 11): Texture {
  return image(128, 128, (x, y) => {
    const seam = x % 64 < 2 || y % 64 < 2;
    const n = hash(x, y, seed) * 0.3 + smoothNoise(x, y, 10, seed) * 0.7;
    const v = (seam ? 88 : 118) + n * 24;
    return [v, v + 1, v + 4];
  });
}

/** Монгол хээ (өлзий/алхан хээ маягийн меандр) — алтлаг хээ бараан суурь дээр; фриз, хонгилын хүрээнд */
export function ornamentTexture(seed = 13): Texture {
  const w = 128, h = 64;
  return image(w, h, (x, y) => {
    const gx = x % 32, gy = y;
    // алхан хээ: 4 px өргөн зураасаар спираль маягийн меандр
    const t = 4;
    const inBand =
      (gy >= 8 && gy < 8 + t && gx >= 4 && gx < 28) ||
      (gy >= 8 && gy < 56 && gx >= 24 && gx < 24 + t) ||
      (gy >= 52 && gy < 56 && gx >= 8 && gx < 28) ||
      (gy >= 20 && gy < 56 && gx >= 8 && gx < 8 + t) ||
      (gy >= 20 && gy < 20 + t && gx >= 8 && gx < 20) ||
      (gy >= 20 && gy < 44 && gx >= 16 && gx < 16 + t) ||
      (gy >= 40 && gy < 44 && gx >= 12 && gx < 20) ||
      (gy >= 32 && gy < 40 && gx >= 12 && gx < 12 + t);
    const n = hash(x, y, seed) * 10;
    if (inBand) return [205 + n, 165 + n, 70 + n * 0.5];
    const base = 108 + hash(x, y, seed + 1) * 12;
    return [base, base - 6, base - 18];
  });
}

/** Шилэн фасад: хуваалтгүй, зөвхөн тусгалын градиент + бага зэрэг долгион (хуваалтыг геометрээр хийнэ) */
export function curtainGlassTexture(seed = 17): Texture {
  return image(128, 128, (x, y) => {
    const refl = smoothNoise(x, y, 40, seed) * 0.5 + (1 - y / 128) * 0.5;
    const wave = Math.sin((x / 128) * Math.PI * 2 + y * 0.03) * 0.08;
    const k = refl + wave;
    return [28 + k * 80, 52 + k * 95, 70 + k * 105];
  });
}
