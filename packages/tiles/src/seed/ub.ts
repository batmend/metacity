/**
 * Улаанбаатар — Сүхбаатарын талбайн орчмын ДЕМО seed өгөгдөл.
 *
 * АНХААР: Энэ бол бодит хэмжилт БИШ. Томоохон барилга, гудамжны байршлыг
 * ойролцоогоор (±50–100 м), бусад барилгыг процедурын аргаар үүсгэсэн.
 * Зорилго: tile үйлдвэр, загвар, 2D/3D апп-ын бүх гинжийг бодит OSM
 * өгөгдөл орж ирэхээс өмнө ажиллуулж, хэмжиж, турших. `pnpm tiles:osm`
 * (docs/DATA-PIPELINE.md) ажиллуулахад энэ өгөгдөл бүрэн солигдоно.
 *
 * Бүх feature `demo: 1` тэмдэгтэй.
 */
import type { Feature, FeatureCollection, Geometry, LineString, Point, Polygon, Position } from 'geojson';
import {
  DEMO_BOUNDS,
  type BuildingClass,
  type BuildingProps,
  type LanduseProps,
  type PoiClass,
  type PoiProps,
  type PlaceProps,
  type RoadClass,
  type RoadProps,
  type WaterProps,
  type BoundaryProps,
  type WaterwayProps,
} from '@metacity/schema';
import type { LayerCollections } from '../encode.js';
import { metersPerDegree, rect, round } from '../geo.js';

// ---------------------------------------------------------------------------
// Туслахууд
// ---------------------------------------------------------------------------

/** Давтагдах (deterministic) санамсаргүй тоо — mulberry32 */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const B = DEMO_BOUNDS;
const MPD = metersPerDegree((B.north + B.south) / 2);

function toLocal([lng, lat]: Position): [number, number] {
  return [(lng! - B.west) * MPD.lng, (lat! - B.south) * MPD.lat];
}

function pointInRing(p: Position, ring: Position[]): boolean {
  const [x, y] = p;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]!;
    const [xj, yj] = ring[j]!;
    const intersect = yi! > y! !== yj! > y! && x! < ((xj! - xi!) * (y! - yi!)) / (yj! - yi!) + xi!;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Цэгээс шугам хүртэлх хамгийн бага зай (м) */
function distToLine(p: Position, line: Position[]): number {
  const [px, py] = toLocal(p);
  let best = Infinity;
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = toLocal(line[i - 1]!);
    const [bx, by] = toLocal(line[i]!);
    const dx = bx - ax;
    const dy = by - ay;
    const l2 = dx * dx + dy * dy || 1;
    let t = ((px - ax) * dx + (py - ay) * dy) / l2;
    t = Math.max(0, Math.min(1, t));
    const cx = ax + t * dx;
    const cy = ay + t * dy;
    best = Math.min(best, Math.hypot(px - cx, py - cy));
  }
  return best;
}

function lineAngle(line: Position[], p: Position): number {
  // хамгийн ойрын сегментийн өнцөг (градус)
  const [px, py] = toLocal(p);
  let best = Infinity;
  let ang = 0;
  for (let i = 1; i < line.length; i++) {
    const [ax, ay] = toLocal(line[i - 1]!);
    const [bx, by] = toLocal(line[i]!);
    const mx = (ax + bx) / 2;
    const my = (ay + by) / 2;
    const d = Math.hypot(px - mx, py - my);
    if (d < best) {
      best = d;
      ang = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI;
    }
  }
  return ang;
}

type F<G extends Geometry, P> = Feature<G, P & { demo: 1 }>;
const feat = <G extends Geometry, P>(geometry: G, properties: P, id?: number): F<G, P> =>
  ({ type: 'Feature', ...(id !== undefined ? { id } : {}), geometry, properties: { ...properties, demo: 1 } }) as F<G, P>;

// ---------------------------------------------------------------------------
// 1. Гудамж, зам
// ---------------------------------------------------------------------------

interface RoadDef {
  name: string;
  name_en?: string;
  class: RoadClass;
  lanes?: number;
  coords: Position[];
}

const ROADS: RoadDef[] = [
  {
    name: 'Энх тайвны өргөн чөлөө',
    name_en: 'Peace Avenue',
    class: 'primary',
    lanes: 6,
    coords: [
      [B.west, 47.9166],
      [106.9100, 47.9167],
      [106.9160, 47.9168],
      [106.9260, 47.9168],
      [B.east, 47.9166],
    ],
  },
  {
    name: 'Чингисийн өргөн чөлөө',
    name_en: 'Chinggis Avenue',
    class: 'primary',
    lanes: 6,
    coords: [
      [106.9160, 47.9168],
      [106.9150, 47.9120],
      [106.9138, 47.9060],
      [106.9125, B.south],
    ],
  },
  { name: 'Нарны зам', name_en: 'Narnii Road', class: 'primary', lanes: 6, coords: [[B.west, 47.9098], [B.east, 47.9102]] },
  { name: 'Сөүлийн гудамж', name_en: 'Seoul Street', class: 'secondary', lanes: 4, coords: [[106.9000, 47.9143], [106.9300, 47.9143]] },
  {
    name: 'Бага тойруу',
    name_en: 'Baga Toiruu',
    class: 'secondary',
    lanes: 4,
    coords: [
      [106.9090, 47.9168],
      [106.9090, 47.9232],
      [106.9270, 47.9232],
      [106.9270, 47.9168],
    ],
  },
  {
    name: 'Их тойруу',
    name_en: 'Ikh Toiruu',
    class: 'secondary',
    lanes: 4,
    coords: [
      [106.9010, 47.9166],
      [106.9010, 47.9285],
      [106.9350, 47.9285],
      [106.9350, 47.9166],
    ],
  },
  { name: 'Сүхбаатарын гудамж', name_en: 'Sukhbaatar Street', class: 'tertiary', coords: [[106.9150, 47.9168], [106.9150, 47.9285]] },
  { name: 'Олимпийн гудамж', name_en: 'Olympic Street', class: 'tertiary', coords: [[106.9240, 47.9100], [106.9240, 47.9232]] },
  { name: 'Жамъян гүний гудамж', name_en: 'Jamyan Gun Street', class: 'tertiary', coords: [[106.9010, 47.9252], [106.9350, 47.9252]] },
  { name: 'Ж.Самбуугийн гудамж', name_en: 'J. Sambuu Street', class: 'tertiary', coords: [[B.west, 47.9205], [106.9150, 47.9205]] },
  { name: 'Жуулчны гудамж', name_en: 'Juulchin Street', class: 'tertiary', coords: [[106.9050, 47.9168], [106.9050, 47.9285]] },
  { name: 'Ерөнхий сайд Амарын гудамж', name_en: 'Amar Street', class: 'tertiary', coords: [[106.9090, 47.9220], [106.9270, 47.9220]] },
  // орон сууцны гудамжууд
  { name: 'Гудамж 1', class: 'residential', coords: [[106.9200, 47.9232], [106.9200, 47.9285]] },
  { name: 'Гудамж 2', class: 'residential', coords: [[106.9300, 47.9168], [106.9300, 47.9285]] },
  { name: 'Гудамж 3', class: 'residential', coords: [[106.9010, 47.9268], [106.9350, 47.9268]] },
  { name: 'Гудамж 4', class: 'residential', coords: [[106.9050, 47.9125], [106.9350, 47.9125]] },
  { name: 'Гудамж 5', class: 'residential', coords: [[106.9180, 47.9102], [106.9180, 47.9143]] },
  { name: 'Гудамж 6', class: 'residential', coords: [[106.9060, 47.9102], [106.9060, 47.9166]] },
  { name: 'Гудамж 7', class: 'residential', coords: [[106.9320, 47.9102], [106.9320, 47.9166]] },
  { name: 'Гудамж 8', class: 'residential', coords: [[106.9010, 47.9188], [106.9090, 47.9188]] },
  { name: 'Гудамж 9', class: 'residential', coords: [[106.9270, 47.9205], [106.9350, 47.9205]] },
  // талбайн эргэн тойрны үйлчилгээний зам
  { name: 'Талбайн тойрог зам', class: 'service', coords: [[106.9158, 47.9172], [106.9158, 47.9206], [106.9197, 47.9206], [106.9197, 47.9172], [106.9158, 47.9172]] },
  // төмөр зам
  { name: 'Улаанбаатар төмөр зам', name_en: 'Ulaanbaatar Railway', class: 'rail', coords: [[B.west, 47.9076], [106.9150, 47.9080], [B.east, 47.9078]] },
];

// ---------------------------------------------------------------------------
// 2. Нэртэй барилгууд (ойролцоо байршил)
// ---------------------------------------------------------------------------

interface LandmarkDef {
  name: string;
  name_en: string;
  class: BuildingClass;
  poi: PoiClass;
  rank: PoiProps['rank'];
  center: Position;
  w: number;
  h: number;
  angle?: number;
  height: number;
  levels: number;
  addr: string;
  services: string[];
}

const LANDMARKS: LandmarkDef[] = [
  { name: 'Төрийн ордон', name_en: 'Government Palace', class: 'government', poi: 'government', rank: 1, center: [106.9176, 47.9211], w: 260, h: 100, height: 35, levels: 6, addr: 'Сүхбаатар дүүрэг, Сүхбаатарын талбай 1', services: ['parliament-info', 'president-reception'] },
  { name: 'Соёлын төв өргөө', name_en: 'Central Cultural Palace', class: 'cultural', poi: 'culture', rank: 2, center: [106.9205, 47.9200], w: 110, h: 70, height: 28, levels: 5, addr: 'Сүхбаатар дүүрэг, Сүхбаатарын талбай', services: ['library-card', 'museum-ticket'] },
  { name: 'Улсын дуурь бүжгийн эрдмийн театр', name_en: 'State Opera and Ballet Theatre', class: 'cultural', poi: 'theatre', rank: 2, center: [106.9200, 47.9177], w: 90, h: 60, height: 22, levels: 3, addr: 'Сүхбаатар дүүрэг, Сүхбаатарын талбай', services: ['theatre-ticket'] },
  { name: 'Төв шуудан', name_en: 'Central Post Office', class: 'office', poi: 'post', rank: 2, center: [106.9155, 47.9175], w: 80, h: 40, height: 18, levels: 4, addr: 'Сүхбаатар дүүрэг, Энх тайвны өргөн чөлөө', services: ['post-parcel', 'post-tracking', 'bill-pay'] },
  { name: 'Монголын хөрөнгийн бирж', name_en: 'Mongolian Stock Exchange', class: 'office', poi: 'office', rank: 3, center: [106.9155, 47.9185], w: 50, h: 35, height: 16, levels: 3, addr: 'Сүхбаатар дүүрэг, Сүхбаатарын талбай', services: ['stock-info'] },
  { name: 'Голомт банк', name_en: 'Golomt Bank', class: 'office', poi: 'bank', rank: 3, center: [106.9155, 47.9195], w: 60, h: 35, height: 24, levels: 6, addr: 'Сүхбаатар дүүрэг, Сүхбаатарын талбай', services: ['bank-account', 'bank-loan'] },
  { name: 'Сентрал Тауэр', name_en: 'Central Tower', class: 'office', poi: 'office', rank: 2, center: [106.9210, 47.9188], w: 60, h: 40, height: 100, levels: 25, addr: 'Сүхбаатар дүүрэг, Сүхбаатарын талбай 2', services: ['office-rent'] },
  { name: 'Блю Скай Тауэр', name_en: 'Blue Sky Tower', class: 'hotel', poi: 'hotel', rank: 2, center: [106.9190, 47.9157], w: 60, h: 30, height: 105, levels: 25, addr: 'Сүхбаатар дүүрэг, Энх тайвны өргөн чөлөө 17', services: ['hotel-booking'] },
  { name: 'Чойжин ламын сүм музей', name_en: 'Choijin Lama Temple Museum', class: 'religious', poi: 'temple', rank: 2, center: [106.9213, 47.9160], w: 40, h: 30, height: 12, levels: 1, addr: 'Сүхбаатар дүүрэг, Жамъян гүний гудамж', services: ['museum-ticket'] },
  { name: 'Шангри-Ла зочид буудал', name_en: 'Shangri-La Hotel', class: 'hotel', poi: 'hotel', rank: 3, center: [106.9232, 47.9150], w: 90, h: 45, height: 80, levels: 20, addr: 'Сүхбаатар дүүрэг, Олимпийн гудамж 19', services: ['hotel-booking'] },
  { name: 'Шангри-Ла молл', name_en: 'Shangri-La Mall', class: 'commercial', poi: 'shop', rank: 3, center: [106.9250, 47.9158], w: 120, h: 70, height: 22, levels: 4, addr: 'Сүхбаатар дүүрэг, Олимпийн гудамж', services: ['parking-pay'] },
  { name: 'Үндэсний түүхийн музей', name_en: 'National Museum of Mongolia', class: 'cultural', poi: 'museum', rank: 2, center: [106.9146, 47.9214], w: 70, h: 50, height: 20, levels: 3, addr: 'Чингэлтэй дүүрэг, Жуулчны гудамж 1', services: ['museum-ticket'] },
  { name: 'Улсын драмын эрдмийн театр', name_en: 'State Academic Drama Theatre', class: 'cultural', poi: 'theatre', rank: 3, center: [106.9140, 47.9156], w: 70, h: 50, height: 22, levels: 3, addr: 'Сүхбаатар дүүрэг, Чингисийн өргөн чөлөө', services: ['theatre-ticket'] },
  { name: 'Нийслэлийн Засаг захиргааны байр', name_en: 'Ulaanbaatar City Hall', class: 'government', poi: 'government', rank: 1, center: [106.9108, 47.9179], w: 90, h: 40, height: 30, levels: 7, addr: 'Чингэлтэй дүүрэг, Энх тайвны өргөн чөлөө', services: ['civil-registration', 'property-tax', 'land-permit', 'complaint-311', 'water-outage', 'heating-outage'] },
  { name: 'Нийслэлийн эмнэлэг (демо)', name_en: 'City Hospital (demo)', class: 'health', poi: 'hospital', rank: 2, center: [106.9062, 47.9122], w: 100, h: 40, height: 20, levels: 5, addr: 'Чингэлтэй дүүрэг (демо)', services: ['hospital-appointment', 'emergency-103'] },
  { name: 'Ерөнхий боловсролын сургууль (демо)', name_en: 'Secondary School (demo)', class: 'education', poi: 'school', rank: 3, center: [106.9232, 47.9262], w: 90, h: 30, height: 12, levels: 3, addr: 'Сүхбаатар дүүрэг (демо)', services: ['school-enroll'] },
  { name: 'Цэцэрлэг (демо)', name_en: 'Kindergarten (demo)', class: 'education', poi: 'kindergarten', rank: 4, center: [106.9205, 47.9262], w: 40, h: 25, height: 8, levels: 2, addr: 'Сүхбаатар дүүрэг (демо)', services: ['kindergarten-enroll'] },
  { name: 'Цагдаагийн хэлтэс (демо)', name_en: 'Police Department (demo)', class: 'government', poi: 'police', rank: 3, center: [106.9070, 47.9241], w: 50, h: 30, height: 12, levels: 3, addr: 'Чингэлтэй дүүрэг (демо)', services: ['police-report', 'emergency-102'] },
  { name: 'Их сургууль (демо)', name_en: 'University (demo)', class: 'education', poi: 'university', rank: 3, center: [106.9300, 47.9218], w: 120, h: 40, height: 24, levels: 6, addr: 'Сүхбаатар дүүрэг (демо)', services: ['university-apply', 'library-card'] },
  { name: 'Эмийн сан (демо)', name_en: 'Pharmacy (demo)', class: 'commercial', poi: 'pharmacy', rank: 4, center: [106.9120, 47.9152], w: 25, h: 15, height: 6, levels: 1, addr: 'Сүхбаатар дүүрэг (демо)', services: ['pharmacy-order'] },
];

// ---------------------------------------------------------------------------
// 3. Газар ашиглалт, ус
// ---------------------------------------------------------------------------

const SQUARE: Position[][] = [[[106.9162, 47.9175], [106.9192, 47.9175], [106.9192, 47.9203], [106.9162, 47.9203], [106.9162, 47.9175]]];
const PARK: Position[][] = [[[106.9215, 47.9088], [106.9300, 47.9088], [106.9300, 47.9138], [106.9215, 47.9138], [106.9215, 47.9088]]];
const PARK_LAKE: Position[][] = [[[106.9235, 47.9098], [106.9280, 47.9095], [106.9290, 47.9112], [106.9265, 47.9122], [106.9240, 47.9118], [106.9230, 47.9108], [106.9235, 47.9098]]];
const TEMPLE_GARDEN: Position[][] = rect([106.9213, 47.9160], 110, 90);
const CEMETERY_NONE = null;
void CEMETERY_NONE;

/** Туул гол — өмнөд захаар, зүүнээс баруун тийш урсана */
const RIVER: Position[][] = (() => {
  const top: Position[] = [];
  const bottom: Position[] = [];
  for (let i = 0; i <= 16; i++) {
    const lng = B.west + ((B.east - B.west) * i) / 16;
    const wobble = Math.sin(i * 1.3) * 0.0006;
    top.push([round(lng), round(47.9018 + wobble)]);
    bottom.push([round(lng), round(47.8992 + wobble * 0.7)]);
  }
  return [[...top, ...bottom.reverse(), top[0]!]];
})();

/** Дунд гол — жижиг горхи */
const DUND_GOL: Position[] = (() => {
  const pts: Position[] = [];
  for (let i = 0; i <= 12; i++) {
    const lng = B.west + ((B.east - B.west) * i) / 12;
    pts.push([round(lng), round(47.9052 + Math.sin(i * 0.9) * 0.0005)]);
  }
  return pts;
})();

const LANDUSE: { class: LanduseProps['class']; name?: string; coords: Position[][] }[] = [
  { class: 'pedestrian', name: 'Сүхбаатарын талбай', coords: SQUARE },
  { class: 'park', name: 'Үндэсний соёл амралтын хүрээлэн', coords: PARK },
  { class: 'park', coords: TEMPLE_GARDEN },
  { class: 'grass', name: 'Туул голын эрэг', coords: [[[B.west, 47.9022], [B.east, 47.9022], [B.east, 47.9040], [B.west, 47.9040], [B.west, 47.9022]]] },
  { class: 'industrial', coords: [[[B.west, 47.9060], [106.9100, 47.9060], [106.9100, 47.9095], [B.west, 47.9095], [B.west, 47.9060]]] },
  { class: 'school', coords: rect([106.9232, 47.9262], 160, 90) },
  { class: 'hospital', coords: rect([106.9062, 47.9122], 170, 110) },
  { class: 'parking', coords: rect([106.9250, 47.9178], 80, 40) },
  { class: 'commercial', coords: [[[106.9090, 47.9168], [106.9270, 47.9168], [106.9270, 47.9232], [106.9090, 47.9232], [106.9090, 47.9168]]] },
  { class: 'residential', coords: [[[106.9010, 47.9232], [106.9350, 47.9232], [106.9350, 47.9285], [106.9010, 47.9285], [106.9010, 47.9232]]] },
  { class: 'residential', coords: [[[106.9010, 47.9168], [106.9090, 47.9168], [106.9090, 47.9232], [106.9010, 47.9232], [106.9010, 47.9168]]] },
  { class: 'residential', coords: [[[106.9270, 47.9168], [106.9350, 47.9168], [106.9350, 47.9232], [106.9270, 47.9232], [106.9270, 47.9168]]] },
];

// ---------------------------------------------------------------------------
// 4. Нэршил, хил
// ---------------------------------------------------------------------------

const PLACES: (PlaceProps & { at: Position })[] = [
  { class: 'city', name: 'Улаанбаатар', name_en: 'Ulaanbaatar', rank: 1, at: [106.9176, 47.9188] },
  { class: 'district', name: 'Сүхбаатар дүүрэг', name_en: 'Sukhbaatar District', rank: 2, at: [106.9215, 47.9245] },
  { class: 'district', name: 'Чингэлтэй дүүрэг', name_en: 'Chingeltei District', rank: 2, at: [106.9035, 47.9238] },
  { class: 'district', name: 'Хан-Уул дүүрэг', name_en: 'Khan-Uul District', rank: 2, at: [106.9150, 47.8975] },
  { class: 'district', name: 'Баянзүрх дүүрэг', name_en: 'Bayanzurkh District', rank: 2, at: [106.9368, 47.9205] },
  { class: 'square', name: 'Сүхбаатарын талбай', name_en: 'Sukhbaatar Square', rank: 3, at: [106.9177, 47.9185] },
  { class: 'neighbourhood', name: 'Бага тойруу', rank: 4, at: [106.9120, 47.9212] },
  { class: 'neighbourhood', name: 'Их тойруу', rank: 4, at: [106.9100, 47.9272] },
  { class: 'khoroo', name: '1-р хороо (демо)', rank: 5, at: [106.9300, 47.9195] },
  { class: 'khoroo', name: '2-р хороо (демо)', rank: 5, at: [106.9040, 47.9195] },
];

const BOUNDARIES: (BoundaryProps & { coords: Position[] })[] = [
  { admin_level: 6, name: 'Сүхбаатар / Чингэлтэй', coords: [[106.9095, B.north], [106.9095, 47.9168], [106.9160, 47.9168], [106.9150, 47.9120], [106.9138, 47.9060], [106.9125, 47.9018]] },
  { admin_level: 6, name: 'Хан-Уул', coords: RIVER[0]!.slice(0, 17) },
  { admin_level: 6, name: 'Сүхбаатар / Баянзүрх', coords: [[106.9355, B.north], [106.9355, 47.9018]] },
];

// ---------------------------------------------------------------------------
// 5. Процедурын барилгууд
// ---------------------------------------------------------------------------

interface Zone {
  ring: Position[];
  classes: BuildingClass[];
  levels: [number, number];
  spacing: number;
  size: [number, number, number, number]; // w min/max, h min/max
}

const ZONES: Zone[] = [
  // Төв — Бага тойруу дотор: оффис/худалдаа, 3–16 давхар
  { ring: [[106.9090, 47.9168], [106.9270, 47.9168], [106.9270, 47.9232], [106.9090, 47.9232]], classes: ['office', 'commercial', 'office', 'residential'], levels: [3, 16], spacing: 70, size: [25, 50, 15, 30] },
  // Хойд орон сууц: 4–12 давхар
  { ring: [[106.9010, 47.9232], [106.9350, 47.9232], [106.9350, 47.9285], [106.9010, 47.9285]], classes: ['residential', 'residential', 'residential', 'commercial'], levels: [4, 12], spacing: 62, size: [30, 60, 12, 18] },
  // Баруун ба зүүн орон сууц
  { ring: [[106.9010, 47.9168], [106.9090, 47.9168], [106.9090, 47.9232], [106.9010, 47.9232]], classes: ['residential', 'residential', 'office'], levels: [4, 9], spacing: 60, size: [25, 50, 12, 18] },
  { ring: [[106.9270, 47.9168], [106.9350, 47.9168], [106.9350, 47.9232], [106.9270, 47.9232]], classes: ['residential', 'residential', 'office'], levels: [4, 9], spacing: 60, size: [25, 50, 12, 18] },
  // Энх тайвны өргөн чөлөөнөөс Сөүлийн гудамж хүртэл: шинэ өндөр барилгууд
  { ring: [[106.9000, 47.9143], [106.9350, 47.9143], [106.9350, 47.9168], [106.9000, 47.9168]], classes: ['commercial', 'office', 'residential', 'hotel'], levels: [5, 20], spacing: 68, size: [20, 45, 15, 30] },
  // Сөүлийн гудамж — Нарны зам: холимог 2–9 давхар
  { ring: [[106.9000, 47.9100], [106.9350, 47.9100], [106.9350, 47.9143], [106.9000, 47.9143]], classes: ['residential', 'commercial', 'residential', 'other'], levels: [2, 9], spacing: 58, size: [20, 45, 12, 25] },
  // Үйлдвэрийн бүс (Нарны замаас урагш, баруун)
  { ring: [[B.west, 47.9060], [106.9100, 47.9060], [106.9100, 47.9095], [B.west, 47.9095]], classes: ['industrial', 'industrial', 'other'], levels: [1, 3], spacing: 90, size: [40, 90, 20, 40] },
  // Их тойруугаас гадна баруун/зүүн хэсэг
  { ring: [[B.west, 47.9168], [106.9010, 47.9168], [106.9010, 47.9285], [B.west, 47.9285]], classes: ['residential', 'other'], levels: [2, 5], spacing: 55, size: [15, 35, 10, 16] },
  { ring: [[106.9350, 47.9168], [B.east, 47.9168], [B.east, 47.9285], [106.9350, 47.9285]], classes: ['residential', 'other'], levels: [2, 5], spacing: 55, size: [15, 35, 10, 16] },
];

const ROAD_HALF_WIDTH: Record<RoadClass, number> = {
  motorway: 20,
  trunk: 18,
  primary: 16,
  secondary: 12,
  tertiary: 9,
  residential: 7,
  service: 4,
  path: 2,
  rail: 8,
};

// ---------------------------------------------------------------------------
// Үүсгэгч
// ---------------------------------------------------------------------------

export interface SeedResult {
  layers: LayerCollections;
  counts: Record<string, number>;
}

export function generateUlaanbaatarSeed(seed = 20260101): SeedResult {
  const rand = rng(seed);
  const pick = <T>(arr: T[]): T => arr[Math.floor(rand() * arr.length)]!;
  const between = (a: number, b: number) => a + rand() * (b - a);

  // --- transportation ---
  const roads: Feature<LineString, RoadProps>[] = ROADS.map((r, i) => {
    const props: RoadProps & { name_en?: string } = { class: r.class, name: r.name };
    if (r.name_en) props.name_en = r.name_en;
    if (r.lanes) props.lanes = r.lanes;
    return feat({ type: 'LineString', coordinates: r.coords }, props, 100 + i) as Feature<LineString, RoadProps>;
  });

  // --- buildings: landmarks ---
  const buildings: Feature<Polygon, BuildingProps>[] = [];
  const pois: Feature<Point, PoiProps>[] = [];
  const exclusion: Position[][] = [SQUARE[0]!, PARK[0]!, TEMPLE_GARDEN[0]!, RIVER[0]!];
  let bid = 1000;
  let pid = 50_000;

  for (const l of LANDMARKS) {
    const ring = rect(l.center, l.w, l.h, l.angle ?? 0);
    exclusion.push(ring[0]!);
    const id = bid++;
    buildings.push(
      feat(
        { type: 'Polygon', coordinates: ring },
        {
          id,
          class: l.class,
          height: l.height,
          levels: l.levels,
          name: l.name,
          name_en: l.name_en,
          addr: l.addr,
          services: l.services.join(','),
        },
        id,
      ) as Feature<Polygon, BuildingProps>,
    );
    const poiId = pid++;
    pois.push(
      feat(
        { type: 'Point', coordinates: l.center },
        { id: poiId, class: l.poi, name: l.name, name_en: l.name_en, rank: l.rank, services: l.services.join(','), building: id },
        poiId,
      ) as Feature<Point, PoiProps>,
    );
  }

  // --- buildings: procedural ---
  const roadsForClearance = ROADS.map((r) => ({ coords: r.coords, half: ROAD_HALF_WIDTH[r.class] }));
  for (const zone of ZONES) {
    const minLng = Math.min(...zone.ring.map((p) => p[0]!));
    const maxLng = Math.max(...zone.ring.map((p) => p[0]!));
    const minLat = Math.min(...zone.ring.map((p) => p[1]!));
    const maxLat = Math.max(...zone.ring.map((p) => p[1]!));
    const dLng = zone.spacing / MPD.lng;
    const dLat = zone.spacing / MPD.lat;
    for (let lat = minLat + dLat / 2; lat < maxLat; lat += dLat) {
      for (let lng = minLng + dLng / 2; lng < maxLng; lng += dLng) {
        const c: Position = [round(lng + (rand() - 0.5) * dLng * 0.4), round(lat + (rand() - 0.5) * dLat * 0.4)];
        if (!pointInRing(c, zone.ring)) continue;
        if (c[0]! <= B.west || c[0]! >= B.east || c[1]! <= B.south || c[1]! >= B.north) continue;
        if (exclusion.some((ring) => pointInRing(c, ring))) continue;
        const w = between(zone.size[0], zone.size[1]);
        const h = between(zone.size[2], zone.size[3]);
        const margin = Math.max(w, h) / 2;
        // замаас зайтай байх
        let tooClose = false;
        let angle = 0;
        let nearest = Infinity;
        for (const r of roadsForClearance) {
          const d = distToLine(c, r.coords);
          if (d < r.half + margin + 4) {
            tooClose = true;
            break;
          }
          if (d < nearest) {
            nearest = d;
            angle = lineAngle(r.coords, c);
          }
        }
        if (tooClose) continue;
        // нэртэй барилгаас зайтай
        if (LANDMARKS.some((l) => Math.hypot((l.center[0]! - c[0]!) * MPD.lng, (l.center[1]! - c[1]!) * MPD.lat) < Math.max(l.w, l.h) / 2 + margin + 6)) continue;
        if (rand() < 0.12) continue; // хоосон талбай
        const levels = Math.round(between(zone.levels[0], zone.levels[1]));
        const cls = pick(zone.classes);
        const id = bid++;
        buildings.push(
          feat(
            { type: 'Polygon', coordinates: rect(c, w, h, angle) },
            { id, class: cls, height: Math.round(levels * (cls === 'industrial' ? 5 : 3.2) + 1), levels },
            id,
          ) as Feature<Polygon, BuildingProps>,
        );
        // зарим барилгад жижиг POI (дэлгүүр, эмийн сан, ресторан)
        if (rand() < 0.08 && (cls === 'commercial' || cls === 'office' || cls === 'residential')) {
          const kind = pick<[PoiClass, string]>([
            ['shop', 'Дэлгүүр'],
            ['restaurant', 'Ресторан'],
            ['pharmacy', 'Эмийн сан'],
            ['bank', 'Банкны салбар'],
            ['parking', 'Зогсоол'],
          ]);
          const poiId = pid++;
          pois.push(
            feat(
              { type: 'Point', coordinates: c },
              { id: poiId, class: kind[0], name: `${kind[1]} (демо)`, rank: 5, building: id, services: kind[0] === 'pharmacy' ? 'pharmacy-order' : kind[0] === 'parking' ? 'parking-pay' : kind[0] === 'bank' ? 'bank-account' : undefined },
              poiId,
            ) as Feature<Point, PoiProps>,
          );
        }
      }
    }
  }

  // --- автобусны буудлууд: Энх тайвны өргөн чөлөө, Нарны зам дагуу 400 м тутам ---
  for (const [lat, name] of [[47.9170, 'Энх тайвны өргөн чөлөө'], [47.9104, 'Нарны зам']] as [number, string][]) {
    for (let i = 1; i <= 7; i++) {
      const lng = round(B.west + ((B.east - B.west) * i) / 8);
      const poiId = pid++;
      pois.push(
        feat(
          { type: 'Point', coordinates: [lng, lat] },
          { id: poiId, class: 'bus_stop', name: `${name} — буудал ${i}`, rank: 4, services: 'bus-schedule' },
          poiId,
        ) as Feature<Point, PoiProps>,
      );
    }
  }
  // --- хөшөө дурсгал ---
  for (const m of [
    { name: 'Д.Сүхбаатарын хөшөө', name_en: 'Sukhbaatar Monument', at: [106.9177, 47.9188] as Position },
    { name: 'Чингис хааны хөшөө', name_en: 'Chinggis Khaan Monument', at: [106.9176, 47.9205] as Position },
  ]) {
    const poiId = pid++;
    pois.push(feat({ type: 'Point', coordinates: m.at }, { id: poiId, class: 'monument', name: m.name, name_en: m.name_en, rank: 2 }, poiId) as Feature<Point, PoiProps>);
  }

  // --- landuse / water / waterway ---
  const landuse = LANDUSE.map((l, i) =>
    feat({ type: 'Polygon', coordinates: l.coords }, { class: l.class, ...(l.name ? { name: l.name } : {}) } as LanduseProps, 300 + i),
  );
  const water: Feature<Polygon, WaterProps>[] = [
    feat({ type: 'Polygon', coordinates: RIVER }, { class: 'river', name: 'Туул гол' }, 400) as Feature<Polygon, WaterProps>,
    feat({ type: 'Polygon', coordinates: PARK_LAKE }, { class: 'lake', name: 'Хүүхдийн парк нуур' }, 401) as Feature<Polygon, WaterProps>,
  ];
  const waterway: Feature<LineString, WaterwayProps>[] = [
    feat({ type: 'LineString', coordinates: DUND_GOL }, { class: 'stream', name: 'Дунд гол' }, 450) as Feature<LineString, WaterwayProps>,
  ];

  // --- place / boundary ---
  const place = PLACES.map((p, i) => {
    const { at, ...props } = p;
    return feat({ type: 'Point', coordinates: at }, props, 500 + i);
  });
  const boundary = BOUNDARIES.map((b, i) => {
    const { coords, ...props } = b;
    return feat({ type: 'LineString', coordinates: coords }, props, 600 + i);
  });

  const fc = <T extends Feature>(features: T[]): FeatureCollection => ({ type: 'FeatureCollection', features });

  const layers: LayerCollections = {
    transportation: fc(roads),
    building: fc(buildings),
    poi: fc(pois),
    landuse: fc(landuse),
    water: fc(water),
    waterway: fc(waterway),
    place: fc(place),
    boundary: fc(boundary),
  };

  const counts = Object.fromEntries(Object.entries(layers).map(([k, v]) => [k, v.features.length]));
  return { layers, counts };
}

