/**
 * @metacity/style — Meta City-ийн өөрийн газрын зургийн загвар.
 *
 * MapLibre Style Spec-ийн дагуу StyleSpecification объект үүсгэнэ.
 * Нэг л эх сурвалж: вэб апп шууд import хийнэ, `pnpm style:build` нь
 * native апп/бусад клиентэд зориулж JSON болгож хадгална.
 *
 * Нэршил: барилгын нэр polygon дээр биш, POI (цэг) давхаргаас гарна — polygon
 * tile-ийн зааг дээр хуваагдахад нэр давхардахгүй.
 *
 * 2D/3D: барилга хоёр давхаргатай (fill = 2D, fill-extrusion = 3D).
 * Апп горим солихдоо зөвхөн visibility + camera pitch өөрчилнө — tile
 * өгөгдөл дахин татагдахгүй (3D-д тусдаа mesh татдаггүй, ижил vector tile).
 */
import type {
  DataDrivenPropertyValueSpecification,
  ExpressionSpecification,
  LayerSpecification,
  StyleSpecification,
} from '@maplibre/maplibre-gl-style-spec';
import { LAYER, MAX_TILE_ZOOM, MIN_TILE_ZOOM, type BuildingClass } from '@metacity/schema';

export type Theme = 'light' | 'dark';
export type ViewMode = '2d' | '3d';

export interface StyleOptions {
  /** PMTiles архивын URL. Жишээ: "pmtiles://https://cdn.metacity.mn/ub.pmtiles" */
  tilesUrl: string;
  /** Глиф URL загвар. Жишээ: "/fonts/{fontstack}/{range}.pbf" */
  glyphsUrl: string;
  theme?: Theme;
  mode?: ViewMode;
  attribution?: string;
}

export const SOURCE_ID = 'metacity';
export const FONT_REGULAR = 'Noto Sans Regular';
export const FONT_BOLD = 'Noto Sans Bold';

/** Давхаргын ID-ууд (апп эдгээрийг ашиглана). */
export const LAYER_ID = {
  background: 'background',
  landuse: 'landuse',
  water: 'water',
  waterway: 'waterway',
  boundary: 'boundary',
  roadCasing: 'road-casing',
  road: 'road',
  rail: 'rail',
  building2d: 'building-2d',
  building2dOutline: 'building-2d-outline',
  building3d: 'building-3d',
  poi: 'poi',
  poiMinor: 'poi-minor',
  poiLabel: 'poi-label',
  poiLabelMinor: 'poi-label-minor',
  roadLabel: 'road-label',
  placeLabel: 'place-label',
  waterLabel: 'water-label',
} as const;

/** 3D горимд л харагдах давхаргууд / 2D горимд л харагдах давхаргууд. */
export const LAYERS_3D_ONLY: string[] = [LAYER_ID.building3d];
export const LAYERS_2D_ONLY: string[] = [LAYER_ID.building2d, LAYER_ID.building2dOutline];

/** 3D горимын камер */
export const CAMERA_3D = { pitch: 58, bearing: -17 } as const;
export const CAMERA_2D = { pitch: 0, bearing: 0 } as const;

// ---------------------------------------------------------------------------
// Өнгөний палитр
// ---------------------------------------------------------------------------

interface Palette {
  background: string;
  landuse: Record<string, string>;
  water: string;
  waterLabel: string;
  boundary: string;
  road: Record<'primary' | 'secondary' | 'minor' | 'service' | 'path' | 'rail', { fill: string; casing: string }>;
  building: Record<BuildingClass, string>;
  buildingOutline: string;
  buildingSelected: string;
  buildingHover: string;
  text: string;
  textHalo: string;
  placeText: string;
  poi: Record<string, string>;
  sky: { sky: string; horizon: string; fog: string };
}

const LIGHT: Palette = {
  background: '#eceee9',
  landuse: {
    park: '#cfe6c1',
    grass: '#d9ebcb',
    residential: '#e6e4df',
    commercial: '#ece5db',
    industrial: '#e2e0e5',
    school: '#f0e8d0',
    hospital: '#f5dfdf',
    cemetery: '#d5e2ce',
    pedestrian: '#e4ddd2',
    parking: '#dedede',
  },
  water: '#a6cbe6',
  waterLabel: '#3b6f94',
  boundary: '#9a7cb8',
  road: {
    primary: { fill: '#fbe4a8', casing: '#d9bf7c' },
    secondary: { fill: '#fff3cf', casing: '#d8cfb2' },
    minor: { fill: '#ffffff', casing: '#cfcbc1' },
    service: { fill: '#f7f6f2', casing: '#dcd8cf' },
    path: { fill: '#b9b3a6', casing: '#b9b3a6' },
    rail: { fill: '#8f8c86', casing: '#ffffff' },
  },
  building: {
    residential: '#d8d3c8',
    commercial: '#ead1a6',
    office: '#b9cee4',
    government: '#c6b4e0',
    cultural: '#e6b6a0',
    education: '#efe09c',
    health: '#f1b7b7',
    hotel: '#d6b6d5',
    religious: '#d9c48f',
    industrial: '#c2c7cd',
    other: '#cfcbc3',
  },
  buildingOutline: '#b5afa2',
  buildingSelected: '#2f6fed',
  buildingHover: '#7aa2f0',
  text: '#2b2b2b',
  textHalo: 'rgba(255,255,255,0.9)',
  placeText: '#4a4a4a',
  poi: {
    government: '#6b4fbb',
    culture: '#c2552f',
    museum: '#c2552f',
    theatre: '#c2552f',
    post: '#d08a1d',
    bank: '#2a7f62',
    hospital: '#d13b3b',
    pharmacy: '#d13b3b',
    school: '#b8860b',
    kindergarten: '#b8860b',
    university: '#b8860b',
    police: '#2d4f8f',
    bus_stop: '#1f78b4',
    parking: '#4f6b8f',
    hotel: '#8a4f9e',
    shop: '#c97b1a',
    restaurant: '#c97b1a',
    park: '#3c8d3c',
    monument: '#555555',
    temple: '#a0522d',
    office: '#3b6ea5',
  },
  sky: { sky: '#b9d3ec', horizon: '#e4ebf2', fog: '#eceee9' },
};

const DARK: Palette = {
  ...LIGHT,
  background: '#1b1e24',
  landuse: {
    park: '#1f3326',
    grass: '#22362a',
    residential: '#20242b',
    commercial: '#262529',
    industrial: '#23252c',
    school: '#2a2a22',
    hospital: '#2c2224',
    cemetery: '#20302a',
    pedestrian: '#2a2a2e',
    parking: '#24262a',
  },
  water: '#1d3a57',
  waterLabel: '#8fb6d8',
  boundary: '#8c7ab0',
  road: {
    primary: { fill: '#4d4634', casing: '#2a2824' },
    secondary: { fill: '#3f3c33', casing: '#262523' },
    minor: { fill: '#34373d', casing: '#22252a' },
    service: { fill: '#2c2f35', casing: '#202328' },
    path: { fill: '#55595f', casing: '#55595f' },
    rail: { fill: '#777b82', casing: '#1b1e24' },
  },
  building: {
    residential: '#3a3e46',
    commercial: '#4b4336',
    office: '#34414f',
    government: '#43395a',
    cultural: '#4f3a33',
    education: '#4b4733',
    health: '#4e3537',
    hotel: '#47364a',
    religious: '#4a4232',
    industrial: '#3b4046',
    other: '#383b41',
  },
  buildingOutline: '#4b505a',
  buildingSelected: '#5b8dff',
  buildingHover: '#3f6fd9',
  text: '#e6e8ec',
  textHalo: 'rgba(20,22,27,0.9)',
  placeText: '#c9ccd3',
  sky: { sky: '#0e1420', horizon: '#1e2633', fog: '#1b1e24' },
};

export const PALETTES: Record<Theme, Palette> = { light: LIGHT, dark: DARK };

// ---------------------------------------------------------------------------
// Expression туслахууд
// ---------------------------------------------------------------------------

const get = (k: string): ExpressionSpecification => ['get', k];
const matchClass = (map: Record<string, string>, fallback: string): ExpressionSpecification => {
  const pairs: (string | string[])[] = [];
  for (const [k, v] of Object.entries(map)) pairs.push(k, v);
  return ['match', get('class'), ...pairs, fallback] as unknown as ExpressionSpecification;
};
const zoomInterp = (stops: [number, number][]): ExpressionSpecification =>
  ['interpolate', ['exponential', 1.4], ['zoom'], ...stops.flat()] as ExpressionSpecification;

/**
 * Барилгын өндөр (м): height → building:levels × 3.2 → ангиллын анхдагч.
 * OSM-д height ховор, levels заримдаа; үлдсэнд УБ-ын ердийн давхрын тоог ашиглана.
 */
const DEFAULT_LEVELS: ExpressionSpecification = ['match', get('class'), 'residential', 5, 'commercial', 3, 'office', 6, 'government', 4, 'hotel', 8, 'education', 3, 'health', 4, 'industrial', 1.5, 'cultural', 3, 'religious', 2, 3.5] as unknown as ExpressionSpecification;
const HEIGHT: ExpressionSpecification = [
  'coalesce',
  get('height'),
  ['case', ['>', ['coalesce', get('levels'), 0], 0], ['*', get('levels'), 3.2], ['*', DEFAULT_LEVELS, 3.2]],
] as unknown as ExpressionSpecification;

/** Монгол нэрийг түрүүлж, байхгүй бол англи. */
const NAME: ExpressionSpecification = ['coalesce', get('name'), get('name_en'), ''];

const inClasses = (classes: string[]): ExpressionSpecification => ['in', get('class'), ['literal', classes]] as ExpressionSpecification;

// Замын өргөн (пиксел), zoom-ээс хамаарна
const ROAD_WIDTH: Record<'primary' | 'secondary' | 'minor' | 'service' | 'path' | 'rail', [number, number][]> = {
  primary: [[8, 1], [12, 3], [15, 10], [18, 28]],
  secondary: [[10, 0.8], [13, 2.5], [15, 7], [18, 20]],
  minor: [[12, 0.6], [14, 1.5], [15, 4], [18, 14]],
  service: [[14, 0.5], [16, 2], [18, 7]],
  path: [[14, 0.5], [18, 2]],
  rail: [[9, 0.6], [14, 1.5], [18, 3]],
};

const ROAD_GROUP: Record<string, keyof typeof ROAD_WIDTH> = {
  motorway: 'primary',
  trunk: 'primary',
  primary: 'primary',
  secondary: 'secondary',
  tertiary: 'secondary',
  residential: 'minor',
  service: 'service',
  path: 'path',
  rail: 'rail',
};

function roadGroupExpr<T extends string | number>(pick: (g: keyof typeof ROAD_WIDTH) => T): ExpressionSpecification {
  const pairs: unknown[] = [];
  for (const [cls, g] of Object.entries(ROAD_GROUP)) pairs.push(cls, pick(g));
  return ['match', get('class'), ...pairs, pick('minor')] as unknown as ExpressionSpecification;
}

function roadWidthExpr(scale = 1, extra = 0): ExpressionSpecification {
  // zoom бүрт class-аар өргөн сонгоно
  const stops: unknown[] = [];
  for (const z of [8, 10, 12, 13, 14, 15, 16, 18]) {
    stops.push(
      z,
      roadGroupExpr((g) => {
        const s = ROAD_WIDTH[g];
        // шугаман интерполяци
        let w = s[0]![1];
        for (let i = 0; i < s.length; i++) {
          const [z0, w0] = s[i]!;
          const next = s[i + 1];
          if (z <= z0) {
            w = i === 0 ? w0 : w;
            break;
          }
          if (!next) {
            w = w0;
            break;
          }
          const [z1, w1] = next;
          if (z <= z1) {
            w = w0 + ((w1 - w0) * (z - z0)) / (z1 - z0);
            break;
          }
        }
        return Math.round((w * scale + extra) * 100) / 100;
      }),
    );
  }
  return ['interpolate', ['linear'], ['zoom'], ...(stops as never[])] as ExpressionSpecification;
}

// ---------------------------------------------------------------------------
// Загвар
// ---------------------------------------------------------------------------

export function buildStyle(opts: StyleOptions): StyleSpecification {
  const theme = opts.theme ?? 'light';
  const mode = opts.mode ?? '2d';
  const P = PALETTES[theme];
  const vis = (on: boolean) => ({ visibility: on ? 'visible' : 'none' }) as const;

  // OSM-д ихэнх барилга building=yes (class=other) тул өндрөөр нь өнгийг зөөлөн ялгана:
  // намхан → дулаан саарал, өндөр → хүйтэн цайвар (бодит хотын харагдац)
  const otherByHeight: ExpressionSpecification = [
    'interpolate',
    ['linear'],
    HEIGHT,
    0,
    theme === 'light' ? '#d2cdc3' : '#353940',
    20,
    P.building.other,
    60,
    theme === 'light' ? '#c9d3dd' : '#3d4654',
    150,
    theme === 'light' ? '#b9c9db' : '#4a5569',
  ] as unknown as ExpressionSpecification;
  const buildingColor: DataDrivenPropertyValueSpecification<string> = [
    'case',
    ['boolean', ['feature-state', 'hidden'], false],
    'rgba(0,0,0,0)', // нарийвчилсан 3D загвар харуулж буй барилга: суурь extrusion бүрэн тунгалаг
    ['boolean', ['feature-state', 'selected'], false],
    P.buildingSelected,
    ['boolean', ['feature-state', 'hover'], false],
    P.buildingHover,
    ['==', get('class'), 'other'],
    otherByHeight,
    matchClass(P.building, P.building.other),
  ] as unknown as ExpressionSpecification;

  const layers: LayerSpecification[] = [
    { id: LAYER_ID.background, type: 'background', paint: { 'background-color': P.background } },
    {
      id: LAYER_ID.landuse,
      type: 'fill',
      source: SOURCE_ID,
      'source-layer': LAYER.landuse,
      paint: {
        'fill-color': matchClass(P.landuse, P.landuse['residential']!),
        'fill-opacity': ['interpolate', ['linear'], ['zoom'], 10, 0.6, 14, 1],
      },
    },
    {
      id: LAYER_ID.water,
      type: 'fill',
      source: SOURCE_ID,
      'source-layer': LAYER.water,
      paint: { 'fill-color': P.water },
    },
    {
      id: LAYER_ID.waterway,
      type: 'line',
      source: SOURCE_ID,
      'source-layer': LAYER.waterway,
      paint: { 'line-color': P.water, 'line-width': zoomInterp([[10, 0.5], [15, 2.5], [18, 6]]) },
      layout: { 'line-cap': 'round', 'line-join': 'round' },
    },
    {
      id: LAYER_ID.boundary,
      type: 'line',
      source: SOURCE_ID,
      'source-layer': LAYER.boundary,
      paint: {
        'line-color': P.boundary,
        'line-width': ['match', get('admin_level'), 4, 2, 6, 1.4, 0.8] as ExpressionSpecification,
        'line-dasharray': [3, 2],
        'line-opacity': 0.8,
      },
    },
    {
      id: LAYER_ID.roadCasing,
      type: 'line',
      source: SOURCE_ID,
      'source-layer': LAYER.transportation,
      filter: ['!=', get('class'), 'rail'] as ExpressionSpecification,
      minzoom: 11,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': roadGroupExpr((g) => P.road[g].casing),
        'line-width': roadWidthExpr(1, 1.6),
        'line-opacity': ['interpolate', ['linear'], ['zoom'], 11, 0, 13, 1],
      },
    },
    {
      id: LAYER_ID.road,
      type: 'line',
      source: SOURCE_ID,
      'source-layer': LAYER.transportation,
      filter: ['!=', get('class'), 'rail'] as ExpressionSpecification,
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': roadGroupExpr((g) => P.road[g].fill),
        'line-width': roadWidthExpr(),
      },
    },
    {
      id: LAYER_ID.rail,
      type: 'line',
      source: SOURCE_ID,
      'source-layer': LAYER.transportation,
      filter: ['==', get('class'), 'rail'] as ExpressionSpecification,
      paint: { 'line-color': P.road.rail.fill, 'line-width': zoomInterp([[9, 0.8], [14, 1.6], [18, 3.5]]), 'line-dasharray': [4, 2] },
    },
    // --- Барилга 2D ---
    {
      id: LAYER_ID.building2d,
      type: 'fill',
      source: SOURCE_ID,
      'source-layer': LAYER.building,
      minzoom: 13,
      layout: vis(mode === '2d'),
      paint: { 'fill-color': buildingColor, 'fill-opacity': ['interpolate', ['linear'], ['zoom'], 13, 0.5, 15, 0.95] },
    },
    {
      id: LAYER_ID.building2dOutline,
      type: 'line',
      source: SOURCE_ID,
      'source-layer': LAYER.building,
      minzoom: 14,
      layout: vis(mode === '2d'),
      paint: { 'line-color': P.buildingOutline, 'line-width': ['interpolate', ['linear'], ['zoom'], 14, 0.3, 17, 1] },
    },
    // --- Барилга 3D ---
    {
      id: LAYER_ID.building3d,
      type: 'fill-extrusion',
      source: SOURCE_ID,
      'source-layer': LAYER.building,
      minzoom: 13,
      layout: vis(mode === '3d'),
      paint: {
        'fill-extrusion-color': buildingColor,
        // height → байхгүй бол давхар × 3.2 м → байхгүй бол 10 м (OSM-д height ховор, building:levels элбэг)
        // feature-state.hidden: нарийвчилсан 3D загвар харуулж буй барилгын суурь extrusion-ийг нуух
        'fill-extrusion-height': ['interpolate', ['linear'], ['zoom'], 13, 0, 14.5, ['case', ['boolean', ['feature-state', 'hidden'], false], 0, HEIGHT]] as unknown as ExpressionSpecification,
        'fill-extrusion-base': ['interpolate', ['linear'], ['zoom'], 13, 0, 14.5, ['coalesce', get('min_height'), 0]] as ExpressionSpecification,
        'fill-extrusion-opacity': 0.92,
        'fill-extrusion-vertical-gradient': true,
      },
    },
    // --- POI: чухал (rank ≤ 3) z13-аас, бусад (дэлгүүр г.м.) зөвхөн z16-аас ---
    ...([
      [LAYER_ID.poi, LAYER_ID.poiLabel, ['<=', get('rank'), 3], 13, 14],
      [LAYER_ID.poiMinor, LAYER_ID.poiLabelMinor, ['>', get('rank'), 3], 16, 16.5],
    ] as [string, string, ExpressionSpecification, number, number][]).flatMap(([circleId, labelId, filter, circleZoom, labelZoom]): LayerSpecification[] => [
      {
        id: circleId,
        type: 'circle',
        source: SOURCE_ID,
        'source-layer': LAYER.poi,
        minzoom: circleZoom,
        filter,
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 13, 2.5, 16, 4.5, 19, 7],
          'circle-color': matchClass(P.poi, P.poi['office']!),
          'circle-stroke-color': theme === 'light' ? '#ffffff' : '#14161b',
          'circle-stroke-width': 1.5,
          'circle-opacity': ['interpolate', ['linear'], ['zoom'], circleZoom, 0.5, circleZoom + 1.5, 1],
        },
      },
      {
        id: labelId,
        type: 'symbol',
        source: SOURCE_ID,
        'source-layer': LAYER.poi,
        minzoom: labelZoom,
        filter,
        layout: {
          'text-field': NAME,
          'text-font': [FONT_REGULAR],
          'text-size': ['interpolate', ['linear'], ['zoom'], 14, 10, 18, 12.5],
          'text-offset': [0, 0.8],
          'text-anchor': 'top',
          'text-max-width': 8,
          'symbol-sort-key': get('rank'),
          'text-optional': true,
          'text-padding': 6,
        },
        paint: { 'text-color': matchClass(P.poi, P.text), 'text-halo-color': P.textHalo, 'text-halo-width': 1.4 },
      },
    ]),
    // --- Шошго ---
    {
      id: LAYER_ID.roadLabel,
      type: 'symbol',
      source: SOURCE_ID,
      'source-layer': LAYER.transportation,
      minzoom: 13,
      filter: ['all', ['has', 'name'], inClasses(['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'residential'])] as ExpressionSpecification,
      layout: {
        'symbol-placement': 'line',
        'text-field': NAME,
        'text-font': [FONT_REGULAR],
        'text-size': ['interpolate', ['linear'], ['zoom'], 13, 9, 16, 12, 19, 15],
        'text-letter-spacing': 0.03,
        'symbol-spacing': 350,
        'text-rotation-alignment': 'map',
        'text-pitch-alignment': 'viewport',
      },
      paint: { 'text-color': P.text, 'text-halo-color': P.textHalo, 'text-halo-width': 1.6 },
    },
    {
      id: LAYER_ID.waterLabel,
      type: 'symbol',
      source: SOURCE_ID,
      'source-layer': LAYER.water,
      minzoom: 12,
      filter: ['has', 'name'],
      layout: { 'text-field': NAME, 'text-font': [FONT_REGULAR], 'text-size': 12, 'symbol-placement': 'point' },
      paint: { 'text-color': P.waterLabel, 'text-halo-color': P.textHalo, 'text-halo-width': 1 },
    },
    {
      id: LAYER_ID.placeLabel,
      type: 'symbol',
      source: SOURCE_ID,
      'source-layer': LAYER.place,
      layout: {
        'text-field': NAME,
        'text-font': ['match', get('class'), 'city', ['literal', [FONT_BOLD]], 'district', ['literal', [FONT_BOLD]], ['literal', [FONT_REGULAR]]] as ExpressionSpecification,
        'text-size': ['match', get('class'), 'city', 20, 'district', 14, 'square', 13, 'neighbourhood', 12, 11] as ExpressionSpecification,
        'text-transform': ['match', get('class'), 'district', 'uppercase', 'none'] as ExpressionSpecification,
        'text-letter-spacing': ['match', get('class'), 'district', 0.12, 0.02] as ExpressionSpecification,
        'symbol-sort-key': get('rank'),
        'text-max-width': 8,
      },
      paint: {
        'text-color': P.placeText,
        'text-halo-color': P.textHalo,
        'text-halo-width': 1.6,
        // Хот нэрийг ойртоход нуух
        'text-opacity': ['interpolate', ['linear'], ['zoom'], 13, 1, 14.5, ['case', ['==', get('class'), 'city'], 0, 1]] as unknown as ExpressionSpecification,
      },
    },
  ];

  return {
    version: 8,
    name: `Meta City ${theme}`,
    metadata: { 'metacity:theme': theme, 'metacity:mode': mode },
    glyphs: opts.glyphsUrl,
    sources: {
      [SOURCE_ID]: {
        type: 'vector',
        url: opts.tilesUrl,
        minzoom: MIN_TILE_ZOOM,
        maxzoom: MAX_TILE_ZOOM,
        attribution: opts.attribution ?? '© Meta City',
      },
    },
    // Нарны гэрэл: баруун урдаас, налуу — ханануудын сүүдэр тодорч 3D бодит харагдана
    light: { anchor: 'map', color: theme === 'light' ? '#fff6e5' : '#c9d4ff', intensity: theme === 'light' ? 0.5 : 0.25, position: [1.3, 225, 40] },
    sky: {
      'sky-color': P.sky.sky,
      'horizon-color': P.sky.horizon,
      'fog-color': P.sky.fog,
      'fog-ground-blend': 0.6,
      'horizon-fog-blend': 0.8,
      'sky-horizon-blend': 0.7,
      'atmosphere-blend': ['interpolate', ['linear'], ['zoom'], 0, 1, 10, 1, 12, 0] as ExpressionSpecification,
    },
    layers,
  };
}
