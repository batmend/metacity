/**
 * @metacity/schema
 *
 * Meta City-ийн газрын зургийн "давхарга" (vector tile layer) схем.
 * Энэ файл бол tile үйлдвэр (packages/tiles), загвар (packages/style) ба
 * апп (apps/web)-ын хооронд байгуулсан ГЭРЭЭ. Давхаргын нэр, атрибут,
 * zoom-ийн хүрээг зөвхөн эндээс өөрчилнө.
 */

/** Схемийн хувилбар — PMTiles metadata-д бичигдэнэ. */
export const TILE_SCHEMA_VERSION = 1;

/** Tile-ийн дотоод координатын нягтрал (MVT extent). */
export const TILE_EXTENT = 4096;

/**
 * Хот томрох тусам апп/дата хэмжээ өсөхгүй байх үндсэн баталгаа:
 * ямар ч zoom дээр нэг tile-д орох өгөгдлийн дээд хэмжээ ТОГТМОЛ.
 * Эдгээр тоо tile үйлдвэр дээр шалгагдана (хэтэрвэл build унана).
 */
export const TILE_BUDGET = {
  /** Нэг tile-ийн шахаагүй дээд хэмжээ (байт). */
  maxTileBytes: 500 * 1024,
  /** Нэг tile-д орох feature-ийн дээд тоо. */
  maxFeaturesPerTile: 20_000,
} as const;

/** Давхаргын нэрс. */
export const LAYER = {
  landuse: 'landuse',
  water: 'water',
  waterway: 'waterway',
  transportation: 'transportation',
  building: 'building',
  poi: 'poi',
  place: 'place',
  boundary: 'boundary',
} as const;
export type LayerName = (typeof LAYER)[keyof typeof LAYER];

/** Давхарга бүрийн zoom-ийн хүрээ (minzoom..maxzoom, maxzoom-оос дээш overzoom хийнэ). */
export const LAYER_ZOOM: Record<LayerName, { min: number; max: number }> = {
  landuse: { min: 9, max: 15 },
  water: { min: 6, max: 15 },
  waterway: { min: 9, max: 15 },
  transportation: { min: 6, max: 15 },
  building: { min: 13, max: 15 },
  poi: { min: 12, max: 15 },
  place: { min: 6, max: 15 },
  boundary: { min: 6, max: 15 },
};

/** Хамгийн дээд tile zoom. Үүнээс дээш апп overzoom хийнэ (өгөгдөл нэмэгдэхгүй). */
export const MAX_TILE_ZOOM = 15;
export const MIN_TILE_ZOOM = 6;

// ---------------------------------------------------------------------------
// Атрибутын төрлүүд
// ---------------------------------------------------------------------------

export type LanduseClass =
  | 'park'
  | 'grass'
  | 'residential'
  | 'commercial'
  | 'industrial'
  | 'school'
  | 'hospital'
  | 'cemetery'
  | 'pedestrian'
  | 'parking';

export interface LanduseProps {
  class: LanduseClass;
  name?: string;
}

export interface WaterProps {
  class: 'river' | 'lake' | 'pond';
  name?: string;
}

export interface WaterwayProps {
  class: 'river' | 'stream' | 'canal';
  name?: string;
}

export type RoadClass =
  | 'motorway'
  | 'trunk'
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'residential'
  | 'service'
  | 'path'
  | 'rail';

export interface RoadProps {
  class: RoadClass;
  name?: string;
  /** Нэг чиглэлтэй эсэх */
  oneway?: 0 | 1;
  bridge?: 0 | 1;
  tunnel?: 0 | 1;
  /** Эгнээний тоо */
  lanes?: number;
}

export type BuildingClass =
  | 'residential'
  | 'commercial'
  | 'office'
  | 'government'
  | 'cultural'
  | 'education'
  | 'health'
  | 'hotel'
  | 'religious'
  | 'industrial'
  | 'other';

export interface BuildingProps {
  /** Барилгын тогтвортой ID (OSM way id эсвэл өөрсдийн кадастрын дугаар). */
  id: number;
  class: BuildingClass;
  /** Өндөр (метр). 3D дээр fill-extrusion-height-д ашиглана. */
  height: number;
  /** Суурийн өндөр (метр), давхарласан хэлбэртэй барилгад. */
  min_height?: number;
  /** Давхрын тоо */
  levels?: number;
  name?: string;
  name_en?: string;
  /** Хаяг (дүүрэг, хороо, гудамж, байр) */
  addr?: string;
  /** Тухайн барилгад үзүүлдэг үйлчилгээний ID-ууд, таслалаар (@metacity/services каталог). */
  services?: string;
  /** Демо/ойролцоо өгөгдөл эсэх (бодит OSM өгөгдөл орж ирэхэд арилна). */
  demo?: 1;
}

export type PoiClass =
  | 'government'
  | 'culture'
  | 'museum'
  | 'theatre'
  | 'post'
  | 'bank'
  | 'hospital'
  | 'pharmacy'
  | 'school'
  | 'kindergarten'
  | 'university'
  | 'police'
  | 'bus_stop'
  | 'parking'
  | 'hotel'
  | 'shop'
  | 'restaurant'
  | 'park'
  | 'monument'
  | 'temple'
  | 'office';

export interface PoiProps {
  id: number;
  class: PoiClass;
  name: string;
  name_en?: string;
  /** 1 (хамгийн чухал) .. 5. Бага zoom дээр зөвхөн rank бага нь харагдана. */
  rank: 1 | 2 | 3 | 4 | 5;
  /** Үйлчилгээний ID-ууд, таслалаар. */
  services?: string;
  /** Холбоотой барилгын ID */
  building?: number;
  demo?: 1;
}

export type PlaceClass = 'city' | 'district' | 'khoroo' | 'neighbourhood' | 'square';

export interface PlaceProps {
  class: PlaceClass;
  name: string;
  name_en?: string;
  rank: 1 | 2 | 3 | 4 | 5;
}

export interface BoundaryProps {
  /** 4 = аймаг/нийслэл, 6 = дүүрэг, 8 = хороо */
  admin_level: 4 | 6 | 8;
  name?: string;
}

export interface LayerPropsMap {
  landuse: LanduseProps;
  water: WaterProps;
  waterway: WaterwayProps;
  transportation: RoadProps;
  building: BuildingProps;
  poi: PoiProps;
  place: PlaceProps;
  boundary: BoundaryProps;
}

// ---------------------------------------------------------------------------
// Ерөнхийлөлт (generalization): бага zoom дээр юу орохыг шийднэ.
// Энэ бол "tile-ийн хэмжээ хотын хэмжээнээс хамаарахгүй" баталгааны хоёр дахь тал.
// ---------------------------------------------------------------------------

const ROAD_MIN_ZOOM: Record<RoadClass, number> = {
  motorway: 6,
  trunk: 6,
  primary: 8,
  secondary: 10,
  tertiary: 11,
  residential: 12,
  service: 14,
  path: 14,
  rail: 9,
};

/**
 * Тухайн zoom дээр feature tile-д орох эсэх.
 * `area` — полигоны талбай (м²), `length` — шугамын урт (м); байхгүй бол шалгахгүй.
 */
export function includeAtZoom(
  layer: LayerName,
  zoom: number,
  props: Record<string, unknown>,
  metrics: { area?: number; length?: number } = {},
): boolean {
  switch (layer) {
    case 'transportation': {
      const cls = props['class'] as RoadClass;
      return zoom >= (ROAD_MIN_ZOOM[cls] ?? 12);
    }
    case 'building': {
      if (zoom >= 15) return true;
      const h = Number(props['height'] ?? 0);
      const a = metrics.area ?? Infinity;
      // z13: зөвхөн том эсвэл өндөр барилга; z14: дунд хэмжээнээс дээш
      if (zoom === 13) return h >= 30 || a >= 2500 || props['name'] !== undefined;
      return h >= 12 || a >= 600 || props['name'] !== undefined;
    }
    case 'poi': {
      const rank = Number(props['rank'] ?? 5);
      if (zoom >= 15) return true;
      if (zoom === 14) return rank <= 3;
      if (zoom === 13) return rank <= 2;
      return rank <= 1;
    }
    case 'landuse': {
      const a = metrics.area ?? Infinity;
      if (zoom >= 14) return true;
      if (zoom >= 12) return a >= 2_000;
      return a >= 20_000;
    }
    case 'place': {
      const rank = Number(props['rank'] ?? 5);
      if (zoom <= 8) return rank <= 1;
      if (zoom <= 11) return rank <= 2;
      if (zoom <= 13) return rank <= 3;
      return true;
    }
    case 'boundary': {
      const lvl = Number(props['admin_level'] ?? 8);
      if (zoom <= 9) return lvl <= 4;
      if (zoom <= 12) return lvl <= 6;
      return true;
    }
    default:
      return true;
  }
}

// ---------------------------------------------------------------------------
// Демо талбай: Улаанбаатар, Сүхбаатарын талбайн орчим (~3 x 3 км)
// ---------------------------------------------------------------------------

export interface LngLatBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export const UB_CENTER = { lng: 106.9176, lat: 47.9188 } as const;

export const DEMO_BOUNDS: LngLatBounds = {
  west: 106.898,
  south: 47.9,
  east: 106.938,
  north: 47.93,
};

/** PMTiles metadata дотор хадгалагдах "vector_layers" тодорхойлолт (TileJSON 3.0). */
export const VECTOR_LAYERS = (Object.keys(LAYER) as LayerName[]).map((id) => ({
  id,
  minzoom: LAYER_ZOOM[id].min,
  maxzoom: LAYER_ZOOM[id].max,
  fields: {} as Record<string, string>,
}));

// ---------------------------------------------------------------------------
// Архивын мета (tiles-meta.json): `tsx src/cli.ts demo | search-index` үүсгэнэ,
// вэб ба гар утасны апп уншиж хил/төв/attribution-оо тохируулна.
// ---------------------------------------------------------------------------

export interface TilesMeta {
  name: string;
  description: string;
  attribution: string;
  bounds: LngLatBounds;
  center: { lng: number; lat: number; zoom: number };
  minzoom: number;
  maxzoom: number;
  tiles: number;
  generatedAt: string;
}

/** Хилийг margin-аар (градус) тэлнэ — камер хилийн яг захад гацахгүй. */
export function padBounds(b: LngLatBounds, margin = 0.02): LngLatBounds {
  return { west: b.west - margin, south: b.south - margin, east: b.east + margin, north: b.north + margin };
}

// ---------------------------------------------------------------------------
// Нарийвчилсан 3D загвар (LOD 2+): сонгосон/ойртсон барилгад л татагдана
// (models/registry.json). Суурь extrusion нь бүх хотод, загвар нь зөвхөн дурсгалт
// барилгуудад — апп/дата хэмжээ хотоос хамаарахгүй зарчим хадгалагдана.
// ---------------------------------------------------------------------------

export interface LandmarkModel {
  id: string;
  name: string;
  name_en: string;
  /** Tile дэх барилгын `id` атрибут (OSM way id, демо seed id) */
  buildingIds: number[];
  /** glTF/GLB файл (BASE-д харьцангуй) */
  url: string;
  /** Загварын гарал (0,0,0) газар дээр хаана байрлах */
  anchor: { lng: number; lat: number };
  /** Сонгоход камер ийм байрлалд очно */
  camera: { center: [number, number]; zoom: number; pitch: number; bearing: number };
  description: string;
  facts: { label: string; value: string }[];
  heightMeters: number;
  lod: 'procedural' | 'photogrammetry' | 'bim';
  /** Энэ барилгаас авах үйлчилгээний ID-ууд (@metacity/services) — OSM-д байхгүй мэдээлэл */
  services?: string[];
}

/** Өгөгдлийн залруулга: OSM-д буруу/дутуу орсон атрибутыг барилгын id-аар засна (normalize алхам). */
export type BuildingCorrections = Record<string, Partial<Pick<BuildingProps, 'height' | 'levels' | 'class' | 'name' | 'name_en' | 'addr' | 'services'>>>;
