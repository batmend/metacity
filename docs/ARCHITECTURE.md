# Meta City — Архитектур

## 1. Зорилго ба хязгаарлалт

| Шаардлага | Шийдэл |
|---|---|
| Иргэд вэб + апп-аар орно | Нэг кодын сан: PWA (вэб = суулгаж болох апп). Дэлгүүрт зориулж Capacitor багцлал (ROADMAP). |
| Улаанбаатарын 3D хуулбар, 2D/3D сонголт | Vector tile дээрх барилгын `height`/`levels`-ээс fill-extrusion. 2D/3D нь нэг өгөгдөл; зөвхөн давхаргын харагдац + камер солигдоно. |
| Татах хэмжээ хамгийн бага | Апп-д өгөгдөл байхгүй; shell ≈ 450 KB gzip. Газрын зураг HTTP Range-аар tile тус бүрээр. |
| Map-ийг өөрсдөө бүтээнэ | Өөрийн tile схем, өөрийн PMTiles бичигч, өөрийн загвар, өөрийн glyph фонт. Гадны SDK/API түлхүүр үгүй. MapLibre GL (BSD, нээлттэй) зөвхөн render engine. |
| Хот томроход апп/дата өсөхгүй | Tile budget + zoom-ийн ерөнхийлөлт; §4. |
| Хамгийн сүүлийн технологи | MapLibre GL JS 6 (module worker, globe/3D), PMTiles v3, Vite 8 (Rolldown), Preact 10 + signals, TypeScript 5.9, Workbox 7. |

## 2. Бүрэлдэхүүн

```
            ┌──────────────────────────────┐
  OSM ─────►│ packages/tiles               │
  GeoJSON ─►│  planetiler (OSM) / өөрийн   │──► ub.pmtiles ──► CDN / статик хостинг
  seed ────►│  GeoJSON→MVT→PMTiles бичигч  │        │
            └──────────────────────────────┘        │ HTTP Range (zxy → байт муж)
            ┌──────────────────────────────┐        ▼
            │ packages/schema  (гэрээ)     │   ┌──────────────────────────────┐
            │ packages/style   (загвар)    │──►│ apps/web  (PWA)              │
            │ packages/services (каталог)  │   │  MapLibre GL + pmtiles       │
            └──────────────────────────────┘   │  2D/3D, хайлт, үйлчилгээ,    │
                                               │  гомдол мэдээлэх             │
                                               └──────────────────────────────┘
```

### 2.1 `@metacity/schema` — гэрээ
Давхаргын нэр, атрибут, zoom-ийн хүрээ (`LAYER_ZOOM`), tile budget, `includeAtZoom()` ерөнхийлөлт.
Tile үйлдвэр, загвар, апп гурвуулаа үүнийг import хийнэ: нэг газар өөрчилбөл бүгд дагана.
PMTiles metadata-д `metacity:schema` хувилбар бичигдэнэ.

### 2.2 `@metacity/tiles` — газрын зургийн үйлдвэр
- **PMTiles v3 бичигч** (`src/pmtiles/writer.ts`): header, Hilbert tile ID, run-length + давхардлыг нэгтгэсэн
  directory, root 16 KB-д багтахгүй бол leaf directory. Протомапсын албан ёсны уншигчтай тест (`pnpm test`).
- **Кодлогч** (`src/encode.ts`): zoom бүр дээр давхарга тус бүрийг `includeAtZoom`-оор шүүж, `@maplibre/geojson-vt`-ээр
  зүсэж, `@maplibre/vt-pbf`-ээр MVT болгоно. `TILE_BUDGET` хэтэрвэл build унана.
- **Seed** (`src/seed/ub.ts`): демо өгөгдөл (ойролцоо). **Planetiler схем** (`planetiler/metacity.yml`): бодит OSM.
- **Хайлтын индекс** (`src/search-index.ts`): ямар ч PMTiles архиваас нэртэй объектуудыг гаргана.

### 2.3 `@metacity/style` — загвар
MapLibre style = TypeScript функц `buildStyle({theme, mode})`. Өдөр/шөнө палитр, 2D (`fill`) ба 3D (`fill-extrusion`)
барилгын давхарга, feature-state (hover/selected), монгол нэр түрүүлж (`coalesce(name, name_en)`), Noto Sans glyph
(Кирилл Ө/Ү багтсан) өөрийн серверээс. Барилгын нэр polygon дээр биш POI цэгээс гарна (tile-ийн зааг дээр
давхардахгүй). `pnpm style:build` → JSON (native клиентэд).

### 2.4 `apps/web` — PWA
- MapLibre GL JS 6: tile боловсруулалт module worker-т (`?worker&url` + `setWorkerUrl`).
- `pmtiles` протокол: `pmtiles://…/ub.pmtiles` → TileJSON + Range хүсэлт.
- Preact + signals: горим, өнгө, сонголт, панел, гомдлын жагсаалт (одоохондоо localStorage).
- Workbox SW: shell precache; фонт CacheFirst; өгөгдөл StaleWhileRevalidate; **PMTiles-ийг SW cache хийхгүй**
  (Range хүсэлт; CDN/HTTP cache ашиглана).
- Өгөгдлийн хэмжүүр (`map/meter.ts`): tile/фонт/өгөгдлийн татсан байтыг хэрэглэгчид ил харуулна.

## 3. Яагаад PMTiles + MapLibre?

| Хувилбар | Дүгнэлт |
|---|---|
| Google/Mapbox SDK | Хэрэглээний төлбөр, түлхүүр, өгөгдөл бидний биш. "Map-ийг өөрсдөө бүтээнэ" зарчимд харш. |
| Tile сервер (Martin, tileserver-gl) | Ажиллана, гэхдээ сервер + DB ашиглалт. PMTiles статик → CDN, ~0 сервер, масштаблах хялбар. Хэрэгтэй бол go-pmtiles `serve`-ээр zxy endpoint ч гаргаж болно. |
| Cesium / 3D Tiles | Фотореалистик mesh-д сайн, гэхдээ client 2 MB+, өгөгдөл маш том. Эхний ээлжинд extrusion хангалттай; 3D Tiles-ийг зөвхөн сонгосон дурсгалт барилгад давхарга болгон нэмнэ (ROADMAP). |
| Raster tile | 3D боломжгүй, өнгө/нэршил солиход дахин render, хэмжээ том. |
| MLT (MapLibre Tiles) | MVT-ээс 2–3× шахалттай шинэ формат; MapLibre 6 + PMTiles 4 аль хэдийн дэмждэг. Хот бүхэлдээ орж ирэхэд `tileType: Mlt` руу шилжих боломж бэлэн. |

## 4. "Хот томроход өсөхгүй" баталгаа

1. **Tile budget**: `TILE_BUDGET.maxTileBytes`, `maxFeaturesPerTile` build-ийн хатуу хязгаар.
2. **Ерөнхийлөлт**: `includeAtZoom(layer, zoom, props, {area, length})`. z13 зөвхөн том/өндөр/нэртэй барилга,
   z14 дунд, z15 бүгд; замууд ангиллаараа z6…z14; POI rank-аараа; place rank-аараа.
3. **Overzoom**: maxzoom 15; z16–19 дээр tile дахин татагдахгүй (клиент ижил tile-ийг томруулна).
4. **Клиент tile cache**: `maxTileCacheSize`; хэрэглэгч буцаж харахад дахин татахгүй.
5. **Фонт мужаар**: зөвхөн шаардлагатай Unicode муж (256 тэмдэгт тутамд нэг файл) татагдана.
6. **Shell тогтмол**: апп-ын JS/CSS-д өгөгдөл, координат, нэр байхгүй. Үйлчилгээний каталог тусдаа JSON/API.

Хэмжээний хяналт: CI (`.github/workflows/ci.yml`) build бүрт bundle + архивын хэмжээг тайлагнана.

## 5. Өгөгдлийн загвар (schema v1)

| Давхарга | Геометр | Zoom | Гол атрибут |
|---|---|---|---|
| `landuse` | polygon | 9–15 | class, name |
| `water` / `waterway` | polygon / line | 6–15 / 9–15 | class, name |
| `transportation` | line | 6–15 | class, name, name_en, oneway, bridge, tunnel, lanes |
| `building` | polygon | 13–15 | id, class, height, min_height, levels, name, addr, services |
| `poi` | point | 12–15 | id, class, name, rank, services, building |
| `place` | point | 6–15 | class, name, rank |
| `boundary` | line | 6–15 | admin_level, name |

`services` = `@metacity/services` каталогийн ID-ууд (таслалаар). Барилга/POI ↔ үйлчилгээ холбоос:
OSM-д байхгүй тул энэ атрибутыг **хотын өөрийн бүртгэл** (байгууллага ↔ барилга) бүрдүүлнэ (DATA-PIPELINE §4).

## 6. Аюулгүй байдал, хувийн мэдээлэл
- Апп гадны домэйн руу ямар ч хүсэлт илгээдэггүй (бүх asset ижил origin). CSP-г хостинг дээр `default-src 'self'` болгож болно.
- Байршил (geolocate) зөвхөн хэрэглэгч товч дарахад, зөвшөөрлөөр.
- Гомдол/санал одоохондоо төхөөрөмж дээр; API орж ирэхэд ДАН/e-Mongolia нэвтрэлтээр.
