# Өгөгдлийн pipeline

```
 эх сурвалж            боловсруулалт                        гаралт
 ─────────             ─────────────                        ──────
 seed (демо)   ──┐
 GeoJSON (GIS) ──┼──► @metacity/tiles (TS)  ─────────────┐
                 │     encode.ts → writer.ts               ├──► ub*.pmtiles → apps/web/public/tiles/ эсвэл CDN
 OSM (.pbf)    ──┴──► planetiler + metacity.yml ───────────┘      search-index.json → apps/web/public/data/
```

Хоёр зам нэг схемд (`@metacity/schema`) гаралт өгнө. Апп аль архив гэдгийг `VITE_TILES`-ээр мэднэ.

## 1. Демо (seed)

```bash
pnpm tiles:demo
# [tiles] seed: {"transportation":23,"building":859,"poi":82,...}
# [tiles] demo: 37 tile, архив 82 KB; хамгийн том tile 14 KB
```
Гаралт: `apps/web/public/tiles/ub-demo.pmtiles`, `apps/web/public/data/search-index.json`,
debug GeoJSON: `packages/tiles/out/seed-*.geojson` (QGIS дээр нээж болно).

Seed-ийн геометр **ойролцоо** (±50–100 м), процедурын барилгууд зохиомол. Бүгд `demo: 1` тэмдэгтэй.

## 2. Бодит OSM → PMTiles (planetiler)

```bash
cd packages/tiles
scripts/verify-schema.sh                 # схемийн тестүүд (OSM татахгүй)
scripts/build-osm.sh                     # демо bbox; эсвэл:
BBOX=106.70,47.80,107.15,48.00 scripts/build-osm.sh    # бүх Улаанбаатар (~4 GB RAM, хэдэн минут)
```
Юу хийдэг вэ: `planetiler.jar` татна (93 MB, нэг удаа) → `geofabrik:mongolia` хуулбар татна →
`planetiler/metacity.yml` схемээр `--bounds` доторх tile үүсгэнэ (z6–15) → `apps/web/public/tiles/ub.pmtiles`
→ хайлтын индекс гаргана. Дараа нь `apps/web/.env`: `VITE_TILES=tiles/ub.pmtiles`.

Схемийн тест: `planetiler/metacity.spec.yml` (OSM tag → давхарга/атрибут/zoom-ийн хүлээгдэх үр дүн).

> Энэ репо-г бэлтгэсэн орчинд OSM серверүүд (Geofabrik, Overpass) хаалттай байсан тул planetiler-ийг бодит
> өгөгдөл дээр **ажиллуулж шалгаагүй**; схемийн тестүүд (`verify-schema`) л ажилласан. Эхний ажиллуулалтад гарч
> ирэх зөрүүг `metacity.yml` дээр засах шаардлагатай байж болно.

## 3. Хотын өөрийн GIS давхарга (GeoJSON → PMTiles)

```bash
cd packages/tiles
pnpm exec tsx src/cli.ts geojson /path/to/dir     # dir/{landuse,water,building,poi,...}.geojson
```
Файл бүр `@metacity/schema`-ийн атрибуттай FeatureCollection байх ёстой (`LayerPropsMap`). Кадастр, инженерийн шугам,
хог тээвэрлэлтийн маршрут зэрэг **OSM-д байхгүй** давхаргуудыг ингэж оруулна. Шинэ давхарга нэмэх = `schema`-д
нэр + атрибут + zoom нэмэх, `style`-д давхарга нэмэх.

## 4. Үйлчилгээ ↔ барилга холбоос

`building.services`, `poi.services` атрибут = `@metacity/services`-ийн ID-ууд. OSM-д ийм мэдээлэл байхгүй тул
бодит хувилбарт **байгууллагын бүртгэл** (нэр, хаяг, OSM building id, үйлчилгээний ID-ууд) гэсэн хүснэгт/CSV-ээс
tile build хийх үед нэгтгэнэ (planetiler-д `type: csv` source эсвэл TS pipeline-д join). Демо seed-д гараар.

## 5. Хэмжээний хяналт

- Build бүрт: tile тоо, zoom бүрийн нийт байт, хамгийн том tile, feature тоо хэвлэгдэнэ.
- `TILE_BUDGET` хэтэрвэл build унана → `includeAtZoom`-ийг чангална, `LAYER_ZOOM.min`-ийг нэмнэ.
- Хот бүхэлдээ: z15 дээр budget-д багтахгүй бол z14/13-ын ерөнхийлөлтийг чангалж, z15 дээр барилгын геометрийг
  хялбарчилна (`tolerance`).

## 6. Фонт

`apps/web/public/fonts/Noto Sans {Regular,Bold}/{0-255,256-511,1024-1279,8192-8447}.pbf`: Латин + Кирилл (Ө, Ү) + цэг тэмдэг.
Монгол бичиг (Unicode 1800–18AF) хэрэгтэй бол `scripts/fetch-fonts.sh 6144-6399` (Noto Sans дотор байхгүй бол
Noto Sans Mongolian-аас `build-glyphs`-ээр үүсгэнэ).
