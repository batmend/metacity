/** Жижиг геометрийн туслахууд (гадаад хамааралгүй). */
import type { Feature, Polygon, MultiPolygon, LineString, MultiLineString, Position } from 'geojson';

const R = 6_378_137;
const D2R = Math.PI / 180;

/** Web Mercator (м) руу */
export function toMercator([lng, lat]: Position): [number, number] {
  const x = R * (lng ?? 0) * D2R;
  const y = R * Math.log(Math.tan(Math.PI / 4 + ((lat ?? 0) * D2R) / 2));
  return [x, y];
}

/** Полигоны ойролцоо талбай (м²) — Mercator дээр shoelace, өргөрөгийн масштабыг засч. */
export function polygonArea(coords: Position[][], latHint?: number): number {
  let area = 0;
  for (let r = 0; r < coords.length; r++) {
    const ring = coords[r]!;
    let s = 0;
    for (let i = 0; i < ring.length - 1; i++) {
      const [x1, y1] = toMercator(ring[i]!);
      const [x2, y2] = toMercator(ring[i + 1]!);
      s += x1 * y2 - x2 * y1;
    }
    area += r === 0 ? Math.abs(s) / 2 : -Math.abs(s) / 2;
  }
  const lat = latHint ?? coords[0]?.[0]?.[1] ?? 0;
  const k = Math.cos(lat * D2R);
  return Math.max(0, area * k * k);
}

export function featureArea(f: Feature<Polygon | MultiPolygon>): number {
  if (f.geometry.type === 'Polygon') return polygonArea(f.geometry.coordinates);
  return f.geometry.coordinates.reduce((a, p) => a + polygonArea(p), 0);
}

/** Haversine зай (м) */
export function distance(a: Position, b: Position): number {
  const dLat = ((b[1]! - a[1]!) * D2R) / 2;
  const dLng = ((b[0]! - a[0]!) * D2R) / 2;
  const h =
    Math.sin(dLat) ** 2 + Math.cos(a[1]! * D2R) * Math.cos(b[1]! * D2R) * Math.sin(dLng) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function lineLength(f: Feature<LineString | MultiLineString>): number {
  const lines = f.geometry.type === 'LineString' ? [f.geometry.coordinates] : f.geometry.coordinates;
  let len = 0;
  for (const line of lines) for (let i = 1; i < line.length; i++) len += distance(line[i - 1]!, line[i]!);
  return len;
}

/** Нэг градус өргөрөг/уртрагт ногдох метр (өгөгдсөн өргөрөг дээр). */
export function metersPerDegree(lat: number): { lng: number; lat: number } {
  return { lat: 111_320, lng: 111_320 * Math.cos(lat * D2R) };
}

/** Төвөөс (lng,lat) зүүн тийш dx м, хойд тийш dy м-ийн цэг. */
export function offset([lng, lat]: Position, dx: number, dy: number): Position {
  const m = metersPerDegree(lat!);
  return [round(lng! + dx / m.lng), round(lat! + dy / m.lat)];
}

/** Төвтэй, өргөн/урттай (м), эргүүлсэн (градус) тэгш өнцөгт полигон. */
export function rect(center: Position, w: number, h: number, angleDeg = 0): Position[][] {
  const a = angleDeg * D2R;
  const cos = Math.cos(a);
  const sin = Math.sin(a);
  const corners: [number, number][] = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ];
  const ring = corners.map(([x, y]) => offset(center, x * cos - y * sin, x * sin + y * cos));
  ring.push(ring[0]!);
  return [ring];
}

export function round(v: number, digits = 7): number {
  const k = 10 ** digits;
  return Math.round(v * k) / k;
}

/** Web Mercator tile-ийн x/y хүрээ (bbox-д) */
export function tileRange(z: number, b: { west: number; south: number; east: number; north: number }) {
  const n = 2 ** z;
  const x = (lng: number) => Math.floor(((lng + 180) / 360) * n);
  const y = (lat: number) => {
    const r = lat * D2R;
    return Math.floor(((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * n);
  };
  const clamp = (v: number) => Math.min(n - 1, Math.max(0, v));
  return {
    minX: clamp(x(b.west)),
    maxX: clamp(x(b.east)),
    minY: clamp(y(b.north)),
    maxY: clamp(y(b.south)),
  };
}
