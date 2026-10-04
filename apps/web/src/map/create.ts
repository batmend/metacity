/**
 * Газрын зургийн цөм: MapLibre + PMTiles протокол + Meta City загвар.
 */
import {
  Map as MLMap,
  Marker,
  NavigationControl,
  GeolocateControl,
  ScaleControl,
  addProtocol,
  setWorkerUrl,
  type AddProtocolAction,
  type GeoJSONSource,
  type MapGeoJSONFeature,
  type MapMouseEvent,
} from 'maplibre-gl';
import type { FeatureCollection } from 'geojson';
// MapLibre 6: tile боловсруулалт тусдаа module worker-т явагдана. Vite worker-ийг
// хамаарлынх нь хамт нэг файл болгож bundle хийж, URL-ийг нь өгнө.
import mapWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import { Protocol } from 'pmtiles';
import {
  buildStyle,
  CAMERA_2D,
  CAMERA_3D,
  LAYER_ID,
  LAYERS_2D_ONLY,
  LAYERS_3D_ONLY,
  SOURCE_ID,
  type Theme,
  type ViewMode,
} from '@metacity/style';
import { DEMO_BOUNDS, UB_CENTER, padBounds, type TilesMeta } from '@metacity/schema';
import { mapReady, mode, pickingLocation, reportDraftLocation, reports, select, theme, tilesMeta, type CitizenReport } from '../state/store';
import { effect } from '@preact/signals';

const BASE = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
/** Tile архив: VITE_TILES (бүтэн URL эсвэл BASE-д харьцангуй зам). Анхдагч: демо архив. */
const TILES_FILE = (import.meta.env['VITE_TILES'] as string | undefined) ?? 'tiles/ub-demo.pmtiles';
export const TILES_URL = `pmtiles://${/^https?:/.test(TILES_FILE) ? TILES_FILE : `${location.origin}${BASE}${TILES_FILE}`}`;
export const GLYPHS_URL = `${location.origin}${BASE}fonts/{fontstack}/{range}.pbf`;
const META_URL = `${BASE}data/tiles-meta.json`;

let protocol: Protocol | null = null;
function ensureProtocol(): void {
  if (protocol) return;
  setWorkerUrl(mapWorkerUrl);
  protocol = new Protocol({ metadata: true });
  addProtocol('pmtiles', protocol.tilev4 as unknown as AddProtocolAction);
}

export function styleFor(t: Theme, m: ViewMode) {
  // attribution-ийг архивын metadata-аас (TileJSON) авна: демо → Meta City, OSM → © OpenStreetMap
  return buildStyle({ tilesUrl: TILES_URL, glyphsUrl: GLYPHS_URL, theme: t, mode: m, attribution: tilesMeta.value?.attribution });
}

const BUILDING_LAYERS = [LAYER_ID.building3d, LAYER_ID.building2d];
const CLICKABLE = [LAYER_ID.poi, LAYER_ID.poiLabel, ...BUILDING_LAYERS, LAYER_ID.placeLabel, LAYER_ID.roadLabel];

export interface MetaCityMap {
  map: MLMap;
  setMode(m: ViewMode): void;
  setTheme(t: Theme): void;
  highlightBuilding(id: number | null): void;
  flyTo(lngLat: [number, number], zoom?: number): void;
  setMarker(lngLat: [number, number] | null): void;
  destroy(): void;
}

const boundsArray = (b: { west: number; south: number; east: number; north: number }): [[number, number], [number, number]] => [
  [b.west, b.south],
  [b.east, b.north],
];

export function createMap(container: HTMLElement): MetaCityMap {
  ensureProtocol();
  const map = new MLMap({
    container,
    style: styleFor(theme.value, mode.value),
    center: [UB_CENTER.lng, UB_CENTER.lat],
    zoom: 15.4,
    pitch: mode.value === '3d' ? CAMERA_3D.pitch : 0,
    bearing: mode.value === '3d' ? CAMERA_3D.bearing : 0,
    minZoom: 11,
    maxZoom: 19.5,
    maxPitch: 72,
    hash: true,
    maxBounds: boundsArray(padBounds(DEMO_BOUNDS)),
    attributionControl: { compact: true },
    canvasContextAttributes: { antialias: true },
    maxTileCacheSize: 256,
  });

  // Архивын мета: бодит хил (бүх хот гэх мэт), attribution. Демо хил нь зөвхөн анхны утга.
  fetch(META_URL)
    .then((r) => (r.ok ? (r.json() as Promise<TilesMeta>) : null))
    .then((meta) => {
      if (!meta) return;
      tilesMeta.value = meta;
      map.setMaxBounds(boundsArray(padBounds(meta.bounds)));
      const src = map.getSource(SOURCE_ID);
      if (src && 'setAttribution' in src) (src as unknown as { setAttribution?: (a: string) => void }).setAttribution?.(meta.attribution);
    })
    .catch(() => {});

  map.addControl(new NavigationControl({ visualizePitch: true }), 'bottom-right');
  map.addControl(new GeolocateControl({ positionOptions: { enableHighAccuracy: true }, trackUserLocation: false }), 'bottom-right');
  map.addControl(new ScaleControl({ maxWidth: 120, unit: 'metric' }), 'bottom-left');

  let hoverId: number | null = null;
  let selectedId: number | null = null;
  const fs = (id: number, state: Record<string, boolean>) =>
    map.setFeatureState({ source: SOURCE_ID, sourceLayer: 'building', id }, state);

  const marker = new Marker({ color: '#2f6fed' });
  let markerOn = false;
  const setMarker = (lngLat: [number, number] | null) => {
    if (lngLat) {
      marker.setLngLat(lngLat);
      if (!markerOn) {
        marker.addTo(map);
        markerOn = true;
      }
    } else if (markerOn) {
      marker.remove();
      markerOn = false;
    }
  };

  const highlightBuilding = (id: number | null) => {
    if (selectedId !== null) fs(selectedId, { selected: false });
    selectedId = id;
    if (id !== null) fs(id, { selected: true });
  };

  // --- Иргэдийн мэдээлсэн асуудлууд (reports) давхарга ---
  const reportsGeoJSON = (list: CitizenReport[]): FeatureCollection => ({
    type: 'FeatureCollection',
    features: list.map((r) => ({
      type: 'Feature',
      id: r.id,
      geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
      properties: { category: r.category, text: r.text, status: r.status },
    })),
  });
  const addReportsLayer = () => {
    if (map.getSource('reports')) return;
    map.addSource('reports', { type: 'geojson', data: reportsGeoJSON(reports.value) });
    map.addLayer({
      id: 'reports',
      type: 'circle',
      source: 'reports',
      paint: {
        'circle-radius': 7,
        'circle-color': ['match', ['get', 'status'], 'done', '#2a9d5c', 'in_progress', '#e9a23b', '#e5484d'],
        'circle-stroke-color': '#ffffff',
        'circle-stroke-width': 2,
      },
    });
    map.addLayer({
      id: 'reports-label',
      type: 'symbol',
      source: 'reports',
      layout: { 'text-field': '!', 'text-font': ['Noto Sans Bold'], 'text-size': 10, 'text-allow-overlap': true },
      paint: { 'text-color': '#ffffff' },
    });
  };

  map.on('load', () => {
    addReportsLayer();
    mapReady.value = true;
  });
  // Загвар солигдоход (theme) reports давхаргыг сэргээнэ
  map.on('style.load', () => {
    if (map.loaded()) addReportsLayer();
  });
  const disposeReports = effect(() => {
    const data = reportsGeoJSON(reports.value);
    const src = map.getSource('reports') as GeoJSONSource | undefined;
    src?.setData(data);
  });

  // --- Hover ---
  map.on('mousemove', (e: MapMouseEvent) => {
    if (pickingLocation.value) {
      map.getCanvas().style.cursor = 'crosshair';
      return;
    }
    const feats = map.queryRenderedFeatures(e.point, { layers: CLICKABLE.filter((l) => map.getLayer(l)) });
    const f = feats[0];
    map.getCanvas().style.cursor = f ? 'pointer' : '';
    const b = feats.find((x) => BUILDING_LAYERS.includes(x.layer.id as never));
    const id = b && typeof b.id === 'number' ? b.id : null;
    if (id !== hoverId) {
      if (hoverId !== null) fs(hoverId, { hover: false });
      hoverId = id;
      if (id !== null) fs(id, { hover: true });
    }
  });
  map.on('mouseout', () => {
    if (hoverId !== null) fs(hoverId, { hover: false });
    hoverId = null;
  });

  // --- Click ---
  map.on('click', (e: MapMouseEvent) => {
    if (pickingLocation.value) {
      reportDraftLocation.value = [e.lngLat.lng, e.lngLat.lat];
      pickingLocation.value = false;
      setMarker([e.lngLat.lng, e.lngLat.lat]);
      return;
    }
    const feats = map.queryRenderedFeatures(e.point, { layers: CLICKABLE.filter((l) => map.getLayer(l)) });
    const f = feats[0];
    if (!f) {
      highlightBuilding(null);
      setMarker(null);
      select(null);
      return;
    }
    selectFeature(f, [e.lngLat.lng, e.lngLat.lat]);
  });

  const selectFeature = (f: MapGeoJSONFeature, lngLat: [number, number]) => {
    const p = f.properties as Record<string, unknown>;
    const layer = f.layer.id;
    const point = f.geometry.type === 'Point' ? (f.geometry.coordinates as [number, number]) : lngLat;
    if (layer === LAYER_ID.poi || layer === LAYER_ID.poiLabel) {
      const buildingId = typeof p['building'] === 'number' ? (p['building'] as number) : null;
      highlightBuilding(buildingId);
      setMarker(point);
      select({ kind: 'poi', featureId: Number(p['id']), name: String(p['name'] ?? ''), name_en: p['name_en'] as string | undefined, class: String(p['class']), props: p, lngLat: point });
    } else if (BUILDING_LAYERS.includes(layer as never)) {
      const id = typeof f.id === 'number' ? f.id : Number(p['id']);
      highlightBuilding(id);
      setMarker(null);
      select({ kind: 'building', featureId: id, name: String(p['name'] ?? ''), name_en: p['name_en'] as string | undefined, class: String(p['class']), props: p, lngLat });
    } else if (layer === LAYER_ID.placeLabel) {
      highlightBuilding(null);
      setMarker(point);
      select({ kind: 'place', name: String(p['name']), name_en: p['name_en'] as string | undefined, class: String(p['class']), props: p, lngLat: point });
    } else if (layer === LAYER_ID.roadLabel) {
      highlightBuilding(null);
      setMarker(null);
      select({ kind: 'road', name: String(p['name']), name_en: p['name_en'] as string | undefined, class: String(p['class']), props: p, lngLat });
    }
  };

  const setMode = (m: ViewMode) => {
    for (const id of LAYERS_3D_ONLY) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', m === '3d' ? 'visible' : 'none');
    for (const id of LAYERS_2D_ONLY) if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', m === '2d' ? 'visible' : 'none');
    const cam = m === '3d' ? CAMERA_3D : CAMERA_2D;
    map.easeTo({ pitch: cam.pitch, bearing: cam.bearing, duration: 900 });
  };

  const setTheme = (t: Theme) => {
    map.setStyle(styleFor(t, mode.value), { diff: true });
  };

  return {
    map,
    setMode,
    setTheme,
    highlightBuilding,
    setMarker,
    flyTo: (lngLat, zoom = 17) => map.flyTo({ center: lngLat, zoom, duration: 1200, essential: true }),
    destroy: () => {
      disposeReports();
      map.remove();
    },
  };
}
