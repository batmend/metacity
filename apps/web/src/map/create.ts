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
import { landmark, landmarkLoading, mapReady, mode, nearby, pickingLocation, reportDraftLocation, reports, select, theme, tilesMeta, type CitizenReport } from '../state/store';
import { findLandmark } from '../landmarks';
import { ModelLayer, MODEL_LAYER_ID } from './models';
import type { LandmarkModel } from '@metacity/schema';
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
const POI_LAYERS = [LAYER_ID.poi, LAYER_ID.poiMinor, LAYER_ID.poiLabel, LAYER_ID.poiLabelMinor];
const CLICKABLE = [...POI_LAYERS, ...BUILDING_LAYERS, LAYER_ID.placeLabel, LAYER_ID.roadLabel];

export interface MetaCityMap {
  map: MLMap;
  setMode(m: ViewMode): void;
  setTheme(t: Theme): void;
  highlightBuilding(id: number | null): void;
  flyTo(lngLat: [number, number], zoom?: number): void;
  /** Барилга сонгох (хайлт, панел г.м.-ээс): тодруулах + дурсгалт бол загвар, камер */
  focusBuilding(featureId: number | undefined, buildingId: number | undefined, lngLat: [number, number]): void;
  clearSelection(): void;
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
    if (selectedId !== null) fs(selectedId, { selected: false, hidden: false });
    selectedId = id;
    if (id !== null) fs(id, { selected: true });
  };

  // --- Нарийвчилсан 3D загвар + кино камер (fly-in → удаан эргэлт) ---
  const modelLayer = new ModelLayer();
  let orbitFrame = 0;
  const stopOrbit = () => {
    if (orbitFrame) cancelAnimationFrame(orbitFrame);
    orbitFrame = 0;
  };
  const startOrbit = () => {
    stopOrbit();
    let last = performance.now();
    const tick = (now: number) => {
      const dt = now - last;
      last = now;
      map.setBearing(map.getBearing() + dt * 0.004); // ~4°/сек
      orbitFrame = requestAnimationFrame(tick);
    };
    orbitFrame = requestAnimationFrame(tick);
  };
  for (const ev of ['mousedown', 'touchstart', 'wheel', 'dragstart'] as const) map.on(ev, stopOrbit);

  const clearLandmark = () => {
    stopOrbit();
    modelLayer.hide();
    landmark.value = null;
  };

  const showLandmark = async (def: LandmarkModel, featureId: number | undefined) => {
    landmark.value = def;
    landmarkLoading.value = true;
    if (!map.getLayer(MODEL_LAYER_ID)) map.addLayer(modelLayer);
    if (featureId !== undefined) fs(featureId, { selected: true, hidden: true });
    map.flyTo({ center: def.camera.center, zoom: def.camera.zoom, pitch: def.camera.pitch, bearing: def.camera.bearing, duration: 2200, essential: true });
    try {
      await modelLayer.show(def);
    } finally {
      landmarkLoading.value = false;
    }
    map.once('moveend', () => {
      if (landmark.value?.id === def.id) startOrbit();
    });
  };

  /** Сонгосон цэгийн эргэн тойрны (~150 м) POI-ууд — панелд "Ойролцоох" хэсэгт */
  const collectNearby = (lngLat: [number, number]) => {
    const p = map.project(lngLat);
    const r = 110;
    const feats = map.queryRenderedFeatures([[p.x - r, p.y - r], [p.x + r, p.y + r]], { layers: POI_LAYERS.filter((l) => map.getLayer(l)) });
    const seen = new Set<string>();
    const out: { name: string; class: string; dist: number }[] = [];
    for (const f of feats) {
      const name = String(f.properties['name'] ?? '');
      if (!name || seen.has(name) || f.geometry.type !== 'Point') continue;
      seen.add(name);
      const [lng, lat] = f.geometry.coordinates as [number, number];
      const dist = Math.hypot((lng - lngLat[0]) * 74_000, (lat - lngLat[1]) * 111_000);
      out.push({ name, class: String(f.properties['class'] ?? ''), dist: Math.round(dist) });
    }
    nearby.value = out.sort((a, b) => a.dist - b.dist).slice(0, 8);
  };

  const focusBuilding = (featureId: number | undefined, buildingId: number | undefined, lngLat: [number, number]) => {
    clearLandmark();
    highlightBuilding(featureId ?? null);
    collectNearby(lngLat);
    void findLandmark(buildingId).then((def) => {
      if (def) void showLandmark(def, featureId);
    });
  };

  const clearSelection = () => {
    clearLandmark();
    highlightBuilding(null);
    setMarker(null);
    nearby.value = [];
    select(null);
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
      clearSelection();
      return;
    }
    selectFeature(f, [e.lngLat.lng, e.lngLat.lat]);
  });

  const selectFeature = (f: MapGeoJSONFeature, lngLat: [number, number]) => {
    const p = f.properties as Record<string, unknown>;
    const layer = f.layer.id;
    const point = f.geometry.type === 'Point' ? (f.geometry.coordinates as [number, number]) : lngLat;
    if (POI_LAYERS.includes(layer as never)) {
      // POI-ийн холбоотой барилга (building атрибут = OSM id); хайлтаар тодруулахад MVT id хэрэгтэй — тодруулахгүй
      const buildingId = typeof p['building'] === 'number' ? (p['building'] as number) : undefined;
      clearLandmark();
      highlightBuilding(null);
      setMarker(point);
      collectNearby(point);
      select({ kind: 'poi', featureId: Number(p['id']), name: String(p['name'] ?? ''), name_en: p['name_en'] as string | undefined, class: String(p['class']), props: p, lngLat: point });
      void findLandmark(buildingId).then((def) => {
        if (def) void showLandmark(def, undefined);
      });
    } else if (BUILDING_LAYERS.includes(layer as never)) {
      const id = typeof f.id === 'number' ? f.id : Number(p['id']);
      setMarker(null);
      select({ kind: 'building', featureId: id, name: String(p['name'] ?? ''), name_en: p['name_en'] as string | undefined, class: String(p['class']), props: p, lngLat });
      focusBuilding(id, typeof p['id'] === 'number' ? (p['id'] as number) : undefined, lngLat);
    } else if (layer === LAYER_ID.placeLabel) {
      clearLandmark();
      highlightBuilding(null);
      setMarker(point);
      nearby.value = [];
      select({ kind: 'place', name: String(p['name']), name_en: p['name_en'] as string | undefined, class: String(p['class']), props: p, lngLat: point });
    } else if (layer === LAYER_ID.roadLabel) {
      clearLandmark();
      highlightBuilding(null);
      setMarker(null);
      nearby.value = [];
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
    focusBuilding,
    clearSelection,
    flyTo: (lngLat, zoom = 17) => {
      stopOrbit();
      map.flyTo({ center: lngLat, zoom, duration: 1200, essential: true });
    },
    destroy: () => {
      stopOrbit();
      disposeReports();
      map.remove();
    },
  };
}
