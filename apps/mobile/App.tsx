/**
 * Meta City — гар утасны апп (Expo + MapLibre Native).
 *
 * Вэбтэй ижил суурь: ижил PMTiles архив, ижил загвар (@metacity/style), ижил үйлчилгээний
 * каталог (@metacity/services). Апп дотор газрын зургийн өгөгдөл байхгүй — зөвхөн харж буй
 * tile-уудыг HTTP Range-аар татна. 3D барилга native fill-extrusion-оор босдог.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, useColorScheme } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Camera, GeoJSONSource, Layer, Map, UserLocation, type CameraRef, type MapRef, type StyleSpecification } from '@maplibre/maplibre-react-native';
import type { Feature, FeatureCollection } from 'geojson';
import { buildStyle, CAMERA_2D, CAMERA_3D, LAYER_ID, PALETTES, type Theme, type ViewMode } from '@metacity/style';
import { DEMO_BOUNDS, UB_CENTER, padBounds, type TilesMeta } from '@metacity/schema';
import { parseServiceIds, servicesByCategory, getService, type Service } from '@metacity/services';
import { GLYPHS_URL, TILES_META_URL, TILES_URL } from './src/config';
import { COLORS, type ThemeColors } from './src/theme';
import { BUILDING_CLASS_LABEL, PLACE_CLASS_LABEL, POI_CLASS_LABEL } from './src/labels';
import { Sheet } from './src/ui/Sheet';
import { ServiceRow } from './src/ui/ServiceList';
import { search, whereIs, type SearchEntry } from './src/search';

type Panel = { kind: 'info'; f: Selected } | { kind: 'services'; focus?: Service } | null;

interface Selected {
  kind: 'building' | 'poi' | 'place';
  name: string;
  name_en?: string;
  class: string;
  props: Record<string, unknown>;
  lngLat: [number, number];
  geometry?: Feature['geometry'];
}

const EMPTY: FeatureCollection = { type: 'FeatureCollection', features: [] };
const TAPPABLE = [LAYER_ID.poi, LAYER_ID.poiLabel, LAYER_ID.building3d, LAYER_ID.building2d, LAYER_ID.placeLabel];

export default function App() {
  return (
    <SafeAreaProvider>
      <MetaCity />
    </SafeAreaProvider>
  );
}

function MetaCity() {
  const scheme = useColorScheme();
  const [theme, setTheme] = useState<Theme>(scheme === 'dark' ? 'dark' : 'light');
  const [mode, setMode] = useState<ViewMode>('3d');
  const [panel, setPanel] = useState<Panel>(null);
  const [loaded, setLoaded] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<SearchEntry[]>([]);
  const [selectedShape, setSelectedShape] = useState<FeatureCollection>(EMPTY);
  const [meta, setMeta] = useState<TilesMeta | null>(null);

  // Архивын мета: бодит хил (бүх хот), attribution
  useEffect(() => {
    fetch(TILES_META_URL)
      .then((r) => (r.ok ? (r.json() as Promise<TilesMeta>) : null))
      .then((m) => m && setMeta(m))
      .catch(() => {});
  }, []);
  const mapRef = useRef<MapRef>(null);
  const camRef = useRef<CameraRef>(null);
  const insets = useSafeAreaInsets();
  const c = COLORS[theme];

  // Style-spec-ийн төрлийн хувилбар RN сангийнхаас шинэ тул cast (runtime-д ижил JSON)
  const mapStyle = useMemo(
    () => buildStyle({ tilesUrl: TILES_URL, glyphsUrl: GLYPHS_URL, theme, mode, attribution: meta?.attribution }) as unknown as StyleSpecification,
    [theme, mode, meta?.attribution],
  );
  const bounds = padBounds(meta?.bounds ?? DEMO_BOUNDS);

  useEffect(() => {
    let alive = true;
    search(q).then((r) => alive && setHits(r));
    return () => {
      alive = false;
    };
  }, [q]);

  const easeCamera = useCallback(async (opts: { center?: [number, number]; zoom?: number; pitch?: number; bearing?: number }) => {
    const center = opts.center ?? (await mapRef.current?.getCenter()) ?? [UB_CENTER.lng, UB_CENTER.lat];
    camRef.current?.easeTo({ center, ...opts, duration: 900 });
  }, []);

  const toggleMode = () => {
    const next: ViewMode = mode === '3d' ? '2d' : '3d';
    setMode(next);
    const cam = next === '3d' ? CAMERA_3D : CAMERA_2D;
    void easeCamera({ pitch: cam.pitch, bearing: cam.bearing });
  };

  const selectFeature = (f: Feature, lngLat: [number, number]) => {
    const p = (f.properties ?? {}) as Record<string, unknown>;
    const layer = String((p as { layer?: unknown })['layer'] ?? '');
    const isPoint = f.geometry.type === 'Point';
    const point = isPoint ? ((f.geometry as { coordinates: unknown }).coordinates as [number, number]) : lngLat;
    const kind: Selected['kind'] = p['rank'] !== undefined && p['height'] === undefined ? (p['admin_level'] !== undefined || p['class'] === 'city' || p['class'] === 'district' || p['class'] === 'khoroo' || p['class'] === 'square' || p['class'] === 'neighbourhood' ? 'place' : 'poi') : 'building';
    void layer;
    const sel: Selected = { kind, name: String(p['name'] ?? ''), name_en: p['name_en'] as string | undefined, class: String(p['class']), props: p, lngLat: point, geometry: f.geometry };
    setPanel({ kind: 'info', f: sel });
    setSelectedShape(kind === 'building' ? { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: f.geometry, properties: { height: p['height'] ?? 10 } }] } : EMPTY);
  };

  const onPress = async (e: { nativeEvent: { lngLat: [number, number]; point: [number, number] } }) => {
    const { lngLat, point } = e.nativeEvent;
    const feats = (await mapRef.current?.queryRenderedFeatures([point[0], point[1]], { layers: TAPPABLE })) ?? [];
    const f = feats[0];
    if (!f) {
      setPanel(null);
      setSelectedShape(EMPTY);
      return;
    }
    selectFeature(f, lngLat);
  };

  const goTo = (e: SearchEntry) => {
    setQ('');
    setHits([]);
    void easeCamera({ center: [e.lng, e.lat], zoom: e.type === 'place' ? 15.5 : 17 });
    setPanel({ kind: 'info', f: { kind: e.type === 'road' ? 'place' : e.type, name: e.name, name_en: e.name_en, class: e.class, props: { ...e, id: e.featureId }, lngLat: [e.lng, e.lat] } });
    setSelectedShape(EMPTY);
  };

  const onWhere = async (id: string) => {
    const hit = await whereIs(id);
    if (hit) goTo(hit);
  };

  const P = PALETTES[theme];

  return (
    <View style={{ flex: 1, backgroundColor: P.background }}>
      <StatusBar style={theme === 'dark' ? 'light' : 'dark'} />
      <Map
        ref={mapRef}
        style={{ flex: 1 }}
        mapStyle={mapStyle}
        onPress={(e) => void onPress(e as never)}
        onDidFinishLoadingMap={() => setLoaded(true)}
        logo={false}
        attribution
        attributionPosition={{ bottom: 8 + insets.bottom, right: 8 }}
        compass
        compassPosition={{ top: 110 + insets.top, right: 12 }}
        scaleBar={false}
      >
        <Camera
          ref={camRef}
          initialViewState={{ center: [UB_CENTER.lng, UB_CENTER.lat], zoom: 15.4, pitch: CAMERA_3D.pitch, bearing: CAMERA_3D.bearing }}
          maxBounds={[bounds.west, bounds.south, bounds.east, bounds.north]}
          minZoom={11}
          maxZoom={19.5}
        />
        <UserLocation />
        {/* Сонгосон барилгын тодруулга: tile-ийн feature-state-ийн оронд тусдаа GeoJSON давхарга */}
        <GeoJSONSource id="selected" data={selectedShape}>
          {mode === '3d' ? (
            <Layer id="selected-3d" type="fill-extrusion" paint={{ 'fill-extrusion-color': P.buildingSelected, 'fill-extrusion-height': ['get', 'height'], 'fill-extrusion-opacity': 0.95 }} />
          ) : (
            <Layer id="selected-2d" type="line" paint={{ 'line-color': P.buildingSelected, 'line-width': 3 }} />
          )}
        </GeoJSONSource>
      </Map>

      {/* Дээд самбар */}
      <View style={[s.top, { top: insets.top + 8 }]}>
        <View style={[s.search, { backgroundColor: c.bg, borderColor: c.line }]}>
          <TextInput value={q} onChangeText={setQ} placeholder="Барилга, гудамж хайх…" placeholderTextColor={c.muted} style={[s.input, { color: c.fg }]} />
          {hits.length > 0 && (
            <View style={[s.results, { borderColor: c.line }]}>
              {hits.map((h) => (
                <Pressable key={h.id} onPress={() => goTo(h)} style={[s.result, { borderColor: c.line }]}>
                  <Text style={{ color: c.fg, fontWeight: '600' }}>{h.name}</Text>
                  <Text style={{ color: c.muted, fontSize: 12 }}>{h.type === 'building' ? BUILDING_CLASS_LABEL[h.class] : h.type === 'poi' ? POI_CLASS_LABEL[h.class] : h.type === 'place' ? PLACE_CLASS_LABEL[h.class] : 'Зам'}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        <View style={s.actions}>
          <Btn c={c} active={mode === '3d'} onPress={toggleMode} label={mode === '3d' ? '3D' : '2D'} />
          <Btn c={c} active={panel?.kind === 'services'} onPress={() => setPanel(panel?.kind === 'services' ? null : { kind: 'services' })} label="🏛️ Үйлчилгээ" />
          <Btn c={c} onPress={() => setTheme(theme === 'light' ? 'dark' : 'light')} label={theme === 'light' ? '🌙' : '☀️'} />
        </View>
      </View>

      {!loaded && (
        <View style={s.loading}>
          <ActivityIndicator color={c.accent} />
          <Text style={{ color: c.muted, marginTop: 8 }}>Газрын зураг ачаалж байна…</Text>
        </View>
      )}

      {panel?.kind === 'info' && <InfoSheet c={c} f={panel.f} onClose={() => { setPanel(null); setSelectedShape(EMPTY); }} onZoom={() => void easeCamera({ center: panel.f.lngLat, zoom: 18 })} />}
      {panel?.kind === 'services' && <ServicesSheet c={c} focus={panel.focus} onClose={() => setPanel(null)} onWhere={onWhere} />}
    </View>
  );
}

function Btn({ c, label, active, onPress }: { c: ThemeColors; label: string; active?: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.btn, { backgroundColor: active ? c.accent : c.bg, borderColor: active ? c.accent : c.line }]}>
      <Text style={{ color: active ? c.accentFg : c.fg, fontWeight: '600' }}>{label}</Text>
    </Pressable>
  );
}

function InfoSheet({ c, f, onClose, onZoom }: { c: ThemeColors; f: Selected; onClose: () => void; onZoom: () => void }) {
  const label = f.kind === 'building' ? BUILDING_CLASS_LABEL[f.class] : f.kind === 'poi' ? POI_CLASS_LABEL[f.class] : PLACE_CLASS_LABEL[f.class];
  const services = parseServiceIds(f.props['services'] as string | undefined);
  const height = typeof f.props['height'] === 'number' ? (f.props['height'] as number) : undefined;
  const levels = typeof f.props['levels'] === 'number' ? (f.props['levels'] as number) : undefined;
  return (
    <Sheet c={c} eyebrow={label ?? f.class} title={f.name || (f.kind === 'building' ? `Барилга #${String(f.props['id'] ?? '')}` : label ?? '')} onClose={onClose}>
      {f.name_en && <Text style={{ color: c.muted }}>{f.name_en}</Text>}
      {f.props['addr'] !== undefined && <Text style={{ color: c.fg, marginTop: 6 }}>📍 {String(f.props['addr'])}</Text>}
      {(height !== undefined || levels !== undefined) && (
        <View style={[s.facts, { backgroundColor: c.bg2 }]}>
          {height !== undefined && <Fact c={c} k="Өндөр" v={`${height} м`} />}
          {levels !== undefined && <Fact c={c} k="Давхар" v={String(levels)} />}
        </View>
      )}
      <Text style={[s.h3, { color: c.muted }]}>ЭНД АВАХ БОЛОМЖТОЙ ҮЙЛЧИЛГЭЭ</Text>
      {services.length === 0 ? <Text style={{ color: c.muted }}>Энэ байршилд бүртгэгдсэн үйлчилгээ алга.</Text> : services.map((sv) => <ServiceRow key={sv.id} s={sv} c={c} />)}
      <Pressable onPress={onZoom} style={[s.btn, { borderColor: c.line, marginTop: 12, alignSelf: 'flex-start' }]}>
        <Text style={{ color: c.fg }}>🎯 Ойртох</Text>
      </Pressable>
    </Sheet>
  );
}

function Fact({ c, k, v }: { c: ThemeColors; k: string; v: string }) {
  return (
    <View style={{ marginRight: 18 }}>
      <Text style={{ color: c.muted, fontSize: 11 }}>{k}</Text>
      <Text style={{ color: c.fg, fontWeight: '700', fontSize: 16 }}>{v}</Text>
    </View>
  );
}

function ServicesSheet({ c, focus, onClose, onWhere }: { c: ThemeColors; focus?: Service; onClose: () => void; onWhere: (id: string) => void }) {
  const groups = servicesByCategory();
  const [filter, setFilter] = useState<string | null>(focus?.category ?? null);
  return (
    <Sheet c={c} eyebrow="Иргэдийн үйлчилгээ" title="Үйлчилгээний каталог" onClose={onClose}>
      <View style={s.chips}>
        <Chip c={c} on={filter === null} label="Бүгд" onPress={() => setFilter(null)} />
        {groups.map((g) => (
          <Chip key={g.category} c={c} on={filter === g.category} label={`${g.icon} ${g.label}`} onPress={() => setFilter(g.category)} />
        ))}
      </View>
      {focus && getService(focus.id) && <ServiceRow s={focus} c={c} onWhere={onWhere} />}
      {groups
        .filter((g) => filter === null || g.category === filter)
        .map((g) => (
          <View key={g.category}>
            <Text style={[s.h3, { color: c.muted }]}>{g.icon} {g.label.toUpperCase()}</Text>
            {g.services.map((sv) => (
              <ServiceRow key={sv.id} s={sv} c={c} onWhere={onWhere} />
            ))}
          </View>
        ))}
    </Sheet>
  );
}

function Chip({ c, on, label, onPress }: { c: ThemeColors; on: boolean; label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, { backgroundColor: on ? c.accent : c.bg2, borderColor: on ? c.accent : c.line }]}>
      <Text style={{ color: on ? c.accentFg : c.fg, fontSize: 12 }}>{label}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  top: { position: 'absolute', left: 10, right: 10, gap: 8 },
  search: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  input: { height: 42, paddingHorizontal: 14, fontSize: 15 },
  results: { borderTopWidth: 1 },
  result: { paddingHorizontal: 14, paddingVertical: 9, borderBottomWidth: 1 },
  actions: { flexDirection: 'row', gap: 6 },
  btn: { height: 36, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  loading: { position: 'absolute', left: 0, right: 0, top: '45%', alignItems: 'center' },
  facts: { flexDirection: 'row', padding: 10, borderRadius: 10, marginTop: 10 },
  h3: { fontSize: 12, fontWeight: '700', letterSpacing: 0.8, marginTop: 16, marginBottom: 6 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  chip: { paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999, borderWidth: 1 },
});
