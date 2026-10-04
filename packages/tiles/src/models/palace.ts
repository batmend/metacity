/**
 * Төрийн ордон (Government Palace) — нарийвчилсан 3D загвар (LOD 2).
 *
 * Бодит OSM footprint (way/4432623) + урд фасадын гэрэл зураг дээр суурилсан procedural загвар.
 * Бүтэц (зургаас): бүх уртаараа өргөн боржин шат → 2 м тавцан; цайвар элсэн өнгийн нарийн
 * багана (алтан капитель) бүхий колоннад, ард нь бүтэн өндөр ХАР НОГООН ШИЛЭН фасад; энтаблатур
 * дээр алтан судал; хоёр зах + төвийн хоёр талд өндөрлөг шилэн павильон (хавтгай таг); төвд
 * нуман хонгил дотор Чингис хааны суугаа хөшөө, хоёр талд нь Боорчу, Мухулайн морьт хөшөө;
 * Өгэдэй, Хубилай хоёр захын павильонд; төвийн блок хамгийн өндөр, дээр нь туг.
 * Texture: элсэн чулуу, шил (хуваалттай), боржин, хүрэл; алт — металлик материал.
 *
 * Координат: загварын гарал (0,0) = footprint-ийн төв (anchor lng/lat), x=зүүн, y=хойд, метр.
 */
import type { Position } from 'geojson';
import { metersPerDegree } from '../geo.js';
import type { LandmarkModel } from '@metacity/schema';
import { GltfBuilder, signedArea, type Material } from './gltf.js';
import { bronzeTexture, curtainGlassTexture, glassTexture, graniteTexture, marbleTexture, ornamentTexture, plasterTexture, roofTexture } from './png.js';
import { equestrian, seatedFigure, type Frame } from './figures.js';

/** OSM way/4432623 (planetiler гаралтаас, WGS84) */
export const PALACE_FOOTPRINT: Position[][] = [
  [[106.91637843847275,47.921181105468634],[106.91660374403,47.92119908035036],[106.91660910844803,47.921164928069715],[106.91696584224701,47.92119548537451],[106.91696047782898,47.92122424517427],[106.91744059324265,47.92126378987288],[106.91744595766068,47.921233232608444],[106.91780537366867,47.92126199238723],[106.91780000925064,47.92129434711927],[106.91800385713577,47.92131052447769],[106.91802531480789,47.92119009291025],[106.91806018352509,47.921191890398404],[106.91810041666031,47.92096720389662],[106.918044090271,47.920963608904685],[106.91815137863159,47.92038301442497],[106.91822111606598,47.92038840697333],[106.91831767559052,47.91985633949287],[106.91767394542694,47.91980061589288],[106.91766321659088,47.91984914935432],[106.91720455884933,47.91980960357438],[106.91721260547638,47.91976646268904],[106.91657960414886,47.91971253653179],[106.91648036241531,47.920249998054004],[106.9165500998497,47.920255390616234],[106.91645085811615,47.92080003650619],[106.91639721393585,47.92079644150263],[106.91634893417358,47.921060673599925],[106.91639989614487,47.92106606607763],[106.91637843847275,47.921181105468634]],
  [[106.91744059324265,47.92072633888296],[106.91747814416885,47.92054299312079],[106.9174325466156,47.920537600588546],[106.91744327545166,47.92047468767075],[106.91749960184097,47.92048008020956],[106.91750228404999,47.9204603075645],[106.91788583993912,47.920494460310294],[106.91783219575882,47.92076228895621],[106.91744059324265,47.92072633888296]],
  [[106.91710263490677,47.9206993763116],[106.91673517227173,47.920670616220065],[106.916783452034,47.920404584615056],[106.91716969013214,47.920435142368945],[106.91716700792313,47.92045491502364],[106.91720992326736,47.92045851005096],[106.9171991944313,47.92052142298843],[106.91713750362396,47.92051603045391],[106.91710263490677,47.9206993763116]],
  [[106.91763907670975,47.92022842779946],[106.91766858100891,47.92007024565797],[106.91771417856216,47.920073840712035],[106.91772490739822,47.92003070004705],[106.91767662763596,47.9200253074614],[106.917684674263,47.91999474946539],[106.91802531480789,47.9200253074614],[106.91797971725464,47.9202589856574],[106.91763907670975,47.92022842779946]],
  [[106.91711068153381,47.92017629964718],[106.916783452034,47.9201475392648],[106.91682904958725,47.91992824082354],[106.91715627908707,47.919957001327816],[106.91711068153381,47.92017629964718]],
  [[106.91749691963196,47.92092226647918],[106.91779732704163,47.92094563394113],[106.91778928041458,47.920995963823316],[106.91782683134079,47.920999558813065],[106.91781342029572,47.92108044601551],[106.91747277975082,47.921053483628725],[106.91749691963196,47.92092226647918]],
  [[106.91697925329208,47.92102472373401],[106.91666007041931,47.92100135630781],[106.91667348146439,47.92091507648877],[106.91671639680862,47.92091867148409],[106.91672444343567,47.92086294902839],[106.91700339317322,47.92088272151952],[106.91697925329208,47.92102472373401]],
];

/** Чингис хааны хөшөө (OSM node) */
export const CHINGGIS_STATUE: Position = [106.91741645336151, 47.919933633419305];

export type ModelDef = LandmarkModel;

const M = {
  stone: { name: 'stone', color: [1, 1, 1], texture: plasterTexture(1), uvScale: 5, roughness: 0.85 } satisfies Material,
  stoneLight: { name: 'stone-light', color: [0.9, 0.87, 0.8], roughness: 0.75 } satisfies Material,
  roof: { name: 'roof', color: [1, 1, 1], texture: roofTexture(), uvScale: 6, roughness: 0.95 } satisfies Material,
  glass: { name: 'glass', color: [1, 1, 1], texture: curtainGlassTexture(), uvScale: 12, metallic: 0.3, roughness: 0.15 } satisfies Material,
  window: { name: 'window', color: [1, 1, 1], texture: glassTexture(), uvScale: 2.6, metallic: 0.2, roughness: 0.25 } satisfies Material,
  ornament: { name: 'ornament', color: [1, 1, 1], texture: ornamentTexture(), uvScale: 1.6, metallic: 0.5, roughness: 0.45 } satisfies Material,
  mullion: { name: 'mullion', color: [0.55, 0.55, 0.58], metallic: 0.9, roughness: 0.35 } satisfies Material,
  marble: { name: 'marble', color: [1, 1, 1], texture: marbleTexture(), uvScale: 3, roughness: 0.6 } satisfies Material,
  granite: { name: 'granite', color: [1, 1, 1], texture: graniteTexture(), uvScale: 2, roughness: 0.7 } satisfies Material,
  bronze: { name: 'bronze', color: [0.55, 0.5, 0.45], texture: bronzeTexture(), uvScale: 1.5, metallic: 0.5, roughness: 0.55 } satisfies Material,
  gold: { name: 'gold', color: [0.85, 0.68, 0.3], metallic: 0.85, roughness: 0.35 } satisfies Material,
  flag: { name: 'flag', color: [0.8, 0.12, 0.16] } satisfies Material,
  pole: { name: 'pole', color: [0.8, 0.8, 0.82], metallic: 0.8, roughness: 0.3 } satisfies Material,
  dark: { name: 'dark', color: [0.42, 0.4, 0.4], roughness: 0.7 } satisfies Material,
};

type P2 = [number, number];
const add = (a: P2, b: P2, k = 1): P2 => [a[0] + b[0] * k, a[1] + b[1] * k];

export function buildPalace(): { glb: Uint8Array; def: ModelDef; stats: ReturnType<GltfBuilder['stats']> } {
  const outer = PALACE_FOOTPRINT[0]!;
  const n = outer.length - 1;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += outer[i]![0]!; sy += outer[i]![1]!; }
  const anchor = { lng: sx / n, lat: sy / n };
  const mpd = metersPerDegree(anchor.lat);
  const toLocal = ([lng, lat]: Position): P2 => [(lng! - anchor.lng) * mpd.lng, (lat! - anchor.lat) * mpd.lat];
  const rings = PALACE_FOOTPRINT.map((r) => r.map(toLocal));
  const outerRing = rings[0]!;

  // ---- Урд фасадын шугам: чиглэлийг хамгийн урт урд хэрчмээс, уртыг урд талын БҮХ оройноос ----
  // (OSM footprint-ийн урд хана 3 хэсэгтэй, хоорондоо 5 м-ээр хазайсан тул нэг хэрчим хангалтгүй)
  let longest: { a: P2; b: P2; len: number } | null = null;
  for (let i = 0; i < outerRing.length - 1; i++) {
    const a = outerRing[i]!, b = outerRing[i + 1]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const horizontal = Math.abs(b[1] - a[1]) < Math.abs(b[0] - a[0]) * 0.5; // баруун-зүүн чиглэлтэй хана л
    if (horizontal && (a[1] + b[1]) / 2 < -60 && (!longest || len > longest.len)) longest = a[0] < b[0] ? { a, b, len } : { a: b, b: a, len };
  }
  if (!longest) throw new Error('урд фасад олдсонгүй');
  const ang = Math.atan2(longest.b[1] - longest.a[1], longest.b[0] - longest.a[0]);
  const dir: P2 = [Math.cos(ang), Math.sin(ang)];
  const out: P2 = [Math.sin(ang), -Math.cos(ang)]; // урагш (талбай руу)
  const proj = (p: P2) => ({ u: p[0] * dir[0] + p[1] * dir[1], v: p[0] * out[0] + p[1] * out[1] });
  const maxV = Math.max(...outerRing.map((p) => proj(p).v));
  const front = outerRing.filter((p) => proj(p).v > maxV - 8); // урд ханын оройнууд
  const us = front.map((p) => proj(p).u);
  const uMin = Math.min(...us), uMax = Math.max(...us);
  const fLen = uMax - uMin;
  const fMid: P2 = [dir[0] * ((uMin + uMax) / 2) + out[0] * (maxV - 1), dir[1] * ((uMin + uMax) / 2) + out[1] * (maxV - 1)];
  const F = (u: number, v: number, base: P2 = fMid): P2 => add(add(base, dir, u), out, v);
  const distToFacade = (p: P2): number => (p[0] - fMid[0]) * out[0] + (p[1] - fMid[1]) * out[1];
  /** фасадтай параллель хайрцаг (u = фасад дагуу төв, v = урагш төв) */
  const g = new GltfBuilder();
  for (const m of Object.values(M)) g.material(m);
  const B = (mat: string, u: number, v: number, z: number, w: number, d: number, h: number) => {
    const c = F(u, v);
    g.box(mat, c[0], c[1], z, w, d, h, ang);
  };
  const CYL = (mat: string, u: number, v: number, z: number, r: number, h: number, rTop = r, seg = 14) => {
    const c = F(u, v);
    g.cylinder(mat, c[0], c[1], z, r, h, seg, rTop);
  };

  const frame: Frame = { W: (u, v, z) => { const c = F(u, v); return [c[0], c[1], z]; }, ang };
  /** фасадтай параллель карниз/молдинг: профиль (v, z) u0→u1 */
  const SWEEP = (mat: string, vBase: number, zBase: number, u0: number, u1: number, profile: [number, number][]) =>
    g.sweep(mat, F(0, vBase), dir, out, u0, u1, profile.map(([v, z]) => [v, zBase + z] as [number, number]));
  /** фасадад перпендикуляр (хажуу тал) карниз: v0→v1 */
  const SWEEP_V = (mat: string, uBase: number, zBase: number, v0: number, v1: number, profile: [number, number][]) =>
    g.sweep(mat, F(uBase, 0), out, [-dir[0], -dir[1]], v0, v1, profile.map(([v, z]) => [v, zBase + z] as [number, number]));
  /** Багана: суурь (торус), entasis их бие, алтан капитель (эхинус + абак) — тойруулалт */
  const COLUMN = (u: number, v: number, z0: number, h: number, r: number) => {
    const c = F(u, v);
    g.lathe('stone-light', c[0], c[1], z0, [[0, 0], [r * 2.1, 0], [r * 2.1, 0.25], [r * 1.5, 0.25], [r * 1.35, 0.45], [r * 1.15, 0.6], [r, 0.75]], 24);
    g.lathe('marble', c[0], c[1], z0 + 0.75, [[r, 0], [r * 1.02, h * 0.3], [r * 0.95, h * 0.7], [r * 0.86, h - 1.9]], 24);
    g.lathe('gold', c[0], c[1], z0 + h - 1.15, [[r * 0.86, 0], [r * 1.15, 0.35], [r * 1.35, 0.6], [r * 1.5, 0.75], [r * 1.5, 0.85]], 24); // эхинус
    g.box('stone-light', c[0], c[1], z0 + h - 0.3, r * 3.2, r * 3.2, 0.3, ang); // абак
  };
  const CORNICE: [number, number][] = [[0, 0], [0.35, 0], [0.5, 0.18], [0.5, 0.38], [0.8, 0.5], [0.95, 0.75], [0.95, 1.0], [0, 1.0]];

  // ---- Хэмжээс (зургаас тооцсон) ----
  const PLAT_H = 2.0; // тавцан
  const GAL_D = 9; // колоннадаас шилэн фасад хүртэлх гүн
  const COL_H = 13.5; // баганын өндөр (тавцангаас)
  const ENT_H = 2.0; // энтаблатур
  const ROOF_Z = PLAT_H + COL_H + ENT_H; // галерейн дээврийн түвшин ≈ 17.5
  const PAV_H = 6.5; // павильоны нэмэлт өндөр
  const CENTER_W = 34; // төвийн блокийн өргөн
  const PAV_W = 20; // павильоны өргөн
  const endPav = fLen / 2 - PAV_W / 2 - 1; // захын павильоны төв (u)
  const innerPav = CENTER_W / 2 + PAV_W / 2 + 2; // төвийн хажуугийн павильон

  // ---- Үндсэн корпус (ар талд): footprint-ийн урд GAL_D зурвасыг галерейд үлдээнэ ----
  const bodyRings = rings.map((ring, ri) => ring.map((p) => (ri === 0 && distToFacade(p) > -3 ? add(p, out, -GAL_D) : p)));
  const BODY_H = ROOF_Z;
  g.extrude('stone', 'roof', bodyRings, 0, BODY_H);
  // дотоод хашааны шал (хучилт) — доорх газрын зураг харагдахгүй
  for (const hole of bodyRings.slice(1)) g.extrude('granite', 'granite', [hole], 0, 0.3);
  // корпусын хажуу/ар ханын цонх (3 давхар)
  const bodyOuter = bodyRings[0]!;
  const ccw = signedArea(bodyOuter.slice(0, -1)) > 0;
  for (let i = 0; i < bodyOuter.length - 1; i++) {
    const a = bodyOuter[i]!, b = bodyOuter[i + 1]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 9) continue;
    const my = (a[1] + b[1]) / 2;
    if (distToFacade([ (a[0] + b[0]) / 2, my ]) > -GAL_D - 2) continue; // урд хана = шил, доор тусад нь
    const sa = Math.atan2(b[1] - a[1], b[0] - a[0]);
    let nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    if (!ccw) { nx = -nx; ny = -ny; }
    const mx = (a[0] + b[0]) / 2;
    if (mx * nx + my * ny < 0) { nx = -nx; ny = -ny; }
    const count = Math.max(1, Math.floor((len - 2) / 4.6));
    const step = (len - 2) / count;
    for (let k = 0; k < count; k++) {
      const t = (1 + step * (k + 0.5)) / len;
      const cx = a[0] + (b[0] - a[0]) * t, cy = a[1] + (b[1] - a[1]) * t;
      for (const z of [2.2, 7.4, 12.6]) g.box('window', cx + nx * 0.05, cy + ny * 0.05, z, 2.0, 0.25, 3.0, sa);
    }
    g.box('gold', mx + nx * 0.1, my + ny * 0.1, BODY_H - 1.2, len, 0.3, 0.35, sa);
  }

  // ---- Шилэн фасад (колоннадын ард, бүтэн өндөр), доор нь чулуун парапет ----
  B('granite', 0, -GAL_D + 0.6, PLAT_H, fLen + 2, 1.2, 1.1);
  B('glass', 0, -GAL_D + 0.3, PLAT_H + 1.1, fLen + 2, 0.4, COL_H - 1.1 + ENT_H);
  // шилэн фасадын хуваалтын төмөр: босоо 1.65 м тутамд, хэвтээ 4 эгнээ; алтан хоёр судал
  for (let x = -fLen / 2 - 1; x <= fLen / 2 + 1; x += 1.65) B('mullion', x, -GAL_D + 0.55, PLAT_H + 1.1, 0.08, 0.1, COL_H - 1.1 + ENT_H);
  for (const z of [PLAT_H + 3.4, PLAT_H + 7.2, PLAT_H + 11.0, PLAT_H + 13.2]) B('mullion', 0, -GAL_D + 0.55, z, fLen + 2, 0.1, 0.08);
  for (const z of [PLAT_H + 5.2, PLAT_H + 9.3]) B('gold', 0, -GAL_D + 0.62, z, fLen + 2, 0.15, 0.25);

  // ---- Тавцан + бүх уртаараа өргөн шат ----
  B('granite', 0, -GAL_D / 2 + 1, 0, fLen + 8, GAL_D + 3, PLAT_H);
  const STEPS = 10;
  for (let st = 0; st < STEPS; st++) {
    const z = (PLAT_H * (STEPS - st)) / STEPS;
    B('granite', 0, 2.5 + st * 0.75, 0, fLen + 8 - st * 0.4, 0.8, z);
  }
  // төвийн шат: илүү урагш, Чингис хааны хөшөө рүү (3 м өндөр нэмэлт тавцан)
  for (let st = 0; st < 6; st++) B('granite', 0, -1.5 + st * 0.7, PLAT_H, 30 - st * 1.2, 0.75, (6 - st) * 0.35);

  // ---- Колоннад: нарийн багана, алтан капитель; 4.9 м тутамд ----
  const spacing = 4.9;
  const colCount = Math.round(fLen / spacing);
  const columnAt = (u: number, v: number, h: number, r: number) => COLUMN(u, v, PLAT_H, h, r);
  for (let k = 0; k <= colCount; k++) {
    const u = -fLen / 2 + spacing * k;
    if (Math.abs(u) < CENTER_W / 2 + 1) continue; // төвийн блок тусдаа
    columnAt(u, 0.5, COL_H, 0.55);
  }
  // Энтаблатур + алтан судал + дээвэр
  B('stone', 0, -GAL_D / 2 + 0.8, PLAT_H + COL_H, fLen + 3, GAL_D + 2.6, ENT_H);
  B('gold', 0, 1.9, PLAT_H + COL_H + ENT_H * 0.55, fLen + 3, 0.15, 0.4);
  SWEEP('stone-light', 2.4, ROOF_Z - 0.3, -fLen / 2 - 1.5, fLen / 2 + 1.5, CORNICE); // урд карниз (профильтэй)
  B('stone-light', 0, -GAL_D / 2 + 0.8, ROOF_Z, fLen + 3.4, GAL_D + 3, 0.7);
  B('ornament', 0, 2.42, PLAT_H + COL_H + 0.2, fLen + 3, 0.1, 1.2); // фриз — монгол хээ
  B('roof', 0, -GAL_D / 2 + 0.8, ROOF_Z + 0.7, fLen + 2, GAL_D + 1.8, 0.2);

  // ---- Павильон (4 ш): захын 2 + төвийн хажуугийн 2 — шилэн, хавтгай тагтай өндөрлөг ----
  for (const u of [-endPav, endPav, -innerPav, innerPav]) {
    B('stone', u, -GAL_D / 2 + 0.8, ROOF_Z, PAV_W, GAL_D + 2.6, 1.0); // суурь
    B('glass', u, -GAL_D / 2 + 0.8, ROOF_Z + 1.0, PAV_W - 1.6, GAL_D + 1, PAV_H - 2.4);
    B('stone-light', u, -GAL_D / 2 + 0.8, ROOF_Z + PAV_H - 1.4, PAV_W + 0.8, GAL_D + 3.4, 1.0); // хавтгай таг
    SWEEP('stone-light', -GAL_D / 2 + 0.8 + (GAL_D + 3.4) / 2, ROOF_Z + PAV_H - 1.4, u - PAV_W / 2 - 0.4, u + PAV_W / 2 + 0.4, CORNICE);
    for (let x = u - PAV_W / 2 + 0.6; x <= u + PAV_W / 2 - 0.6; x += 1.65) B('mullion', x, -GAL_D / 2 + 0.8 + (GAL_D + 1) / 2, ROOF_Z + 1.0, 0.08, 0.1, PAV_H - 2.4);
    B('gold', u, 1.8, ROOF_Z + PAV_H - 1.0, PAV_W + 0.8, 0.12, 0.3);
    B('roof', u, -GAL_D / 2 + 0.8, ROOF_Z + PAV_H, PAV_W - 0.4, GAL_D + 2.2, 0.2);
  }

  // ---- Төвийн блок: урагш цухуйсан, 6 том багана, нуман хонгил, хамгийн өндөр, туг ----
  const CENTER_H = COL_H + ENT_H + 9; // тавцангаас
  const CV = 1.6; // төвийн блок урагш цухуйлт
  B('stone', 0, -GAL_D / 2 + CV, PLAT_H, CENTER_W, GAL_D + 2 * CV, CENTER_H); // цул блок (хонгилыг доор нь урдаас нь хонхойлгоно)
  // Нуман хонгил: урд хананд 12 м өргөн, 15 м өндөр, гүн 7 м — алхам хэлбэрийн нуман дээд
  const ARCH_W = 12, ARCH_H = 15, ARCH_D = 7;
  B('dark', 0, CV + GAL_D / 2 - ARCH_D / 2 + 0.02, PLAT_H, ARCH_W, ARCH_D, ARCH_H - 2.5); // хонгилын хар дотор (сүүдэр)
  for (let i = 0; i < 6; i++) {
    const w = ARCH_W * Math.cos((i / 6) * (Math.PI / 2)) * 0.98;
    B('dark', 0, CV + GAL_D / 2 - ARCH_D / 2 + 0.02, PLAT_H + ARCH_H - 2.5 + i * 0.42, w, ARCH_D, 0.42);
  }
  // хонгилын алтан хүрээ
  for (const du of [-ARCH_W / 2 - 0.4, ARCH_W / 2 + 0.4]) B('gold', du, CV + GAL_D / 2 + 0.05, PLAT_H, 0.6, 0.25, ARCH_H);
  B('ornament', 0, CV + GAL_D / 2 + 0.05, PLAT_H + ARCH_H + 0.1, ARCH_W + 1.4, 0.25, 1.2);
  // төвийн 6 багана (3+3), хонгилын хоёр талд, урагш цухуйсан
  for (const u of [-14.6, -11.0, -7.6, 7.6, 11.0, 14.6]) columnAt(u, CV + GAL_D / 2 + 2.6, COL_H, 0.6);
  B('stone', 0, CV + GAL_D / 2 + 2.6, PLAT_H + COL_H, CENTER_W + 1, 3.4, ENT_H); // портикийн энтаблатур
  B('gold', 0, CV + GAL_D / 2 + 4.35, PLAT_H + COL_H + 1.1, CENTER_W + 1, 0.15, 0.4);
  // төвийн блокийн дээд хэсэг: алтан судал, карниз, өндөрлөг атик, таг, туг
  B('gold', 0, CV + GAL_D / 2 + 0.1, PLAT_H + CENTER_H - 3.2, CENTER_W, 0.15, 0.4);
  B('stone-light', 0, -GAL_D / 2 + CV, PLAT_H + CENTER_H, CENTER_W + 1.2, GAL_D + 2 * CV + 1.2, 1.2);
  SWEEP('stone-light', CV + GAL_D / 2 + 0.6, PLAT_H + CENTER_H - 0.2, -CENTER_W / 2 - 0.6, CENTER_W / 2 + 0.6, CORNICE);
  B('ornament', 0, CV + GAL_D / 2 + 0.12, PLAT_H + CENTER_H - 2.0, CENTER_W, 0.1, 1.4); // төвийн фриз
  B('stone', 0, -GAL_D / 2 + CV, PLAT_H + CENTER_H + 1.2, CENTER_W - 8, GAL_D - 1, 3.2);
  B('stone-light', 0, -GAL_D / 2 + CV, PLAT_H + CENTER_H + 4.4, CENTER_W - 6.5, GAL_D + 0.5, 1.0);
  B('roof', 0, -GAL_D / 2 + CV, PLAT_H + CENTER_H + 5.4, CENTER_W - 8, GAL_D - 1, 0.2);
  CYL('pole', 0, -GAL_D / 2 + CV, PLAT_H + CENTER_H + 5.4, 0.16, 9, 0.1, 10);
  { const c = F(0, -GAL_D / 2 + CV); g.lathe('gold', c[0], c[1], PLAT_H + CENTER_H + 14.4, [[0, 0], [0.22, 0.1], [0.3, 0.3], [0.2, 0.5], [0, 0.6]], 12); }
  B('flag', 1.6, -GAL_D / 2 + CV, PLAT_H + CENTER_H + 12.2, 3.0, 0.06, 2.0);

  // ---- Хөшөөнүүд (гөлгөр, анатомийн пропорцтой) ----
  const pedestal = (u: number, v: number, w: number, d: number, h: number) => {
    B('granite', u, v, PLAT_H, w, d, h * 0.55);
    B('granite', u, v, PLAT_H + h * 0.55, w - 0.5, d - 0.4, h * 0.45);
    SWEEP('granite', v + d / 2 - 0.2, PLAT_H + h - 0.35, u - w / 2 + 0.25, u + w / 2 - 0.25, [[0, 0], [0.25, 0], [0.3, 0.2], [0.2, 0.35], [0, 0.35]]);
  };
  pedestal(0, CV + GAL_D / 2 - 2.5, 7.5, 5.2, 2.1);
  seatedFigure(g, 'bronze', frame, 0, CV + GAL_D / 2 - 2.5, PLAT_H + 2.1, 1.5); // Чингис хаан — хонгилын дотор
  pedestal(-endPav, -2.5, 5, 3.6, 1.6);
  seatedFigure(g, 'bronze', frame, -endPav, -2.5, PLAT_H + 1.6, 1.0); // Өгэдэй
  pedestal(endPav, -2.5, 5, 3.6, 1.6);
  seatedFigure(g, 'bronze', frame, endPav, -2.5, PLAT_H + 1.6, 1.0); // Хубилай
  pedestal(-CENTER_W / 2 - 5, 3.2, 6.5, 3.2, 2.0);
  equestrian(g, 'bronze', frame, -CENTER_W / 2 - 5, 3.2, PLAT_H + 2.0, -1, 1.15); // Боорчу
  pedestal(CENTER_W / 2 + 5, 3.2, 6.5, 3.2, 2.0);
  equestrian(g, 'bronze', frame, CENTER_W / 2 + 5, 3.2, PLAT_H + 2.0, 1, 1.15); // Мухулай

  const glb = g.toGLB('government-palace');
  const def: ModelDef = {
    id: 'government-palace',
    name: 'Төрийн ордон',
    name_en: 'Government Palace',
    buildingIds: [4432623, 1000],
    url: 'models/government-palace.glb',
    anchor,
    camera: { center: [anchor.lng, anchor.lat - 0.0019], zoom: 17.3, pitch: 66, bearing: -6 },
    description:
      'Монгол Улсын төрийн төв ордон. Улсын Их Хурал, Ерөнхийлөгч, Засгийн газрын байр. Сүхбаатарын талбайн хойд талд; ' +
      '2006 онд Их Монгол Улсын 800 жилийн ойд зориулан урд талд нь Чингис хааны хөшөө бүхий баганат фасад барьсан.',
    facts: [
      { label: 'Хаяг', value: 'Сүхбаатар дүүрэг, Сүхбаатарын талбай 1' },
      { label: 'Байгууллага', value: 'УИХ, Ерөнхийлөгчийн Тамгын газар, Засгийн газрын Хэрэг эрхлэх газар' },
      { label: 'Урд талын хөшөө', value: 'Чингис хаан (төв, нуман хонгилд), Боорчу, Мухулай (морьт), Өгэдэй, Хубилай (захын павильон)' },
      { label: 'Загвар', value: 'LOD 2 — бодит footprint (OSM way/4432623) + гэрэл зургаас гаргасан фасадын бүтэц' },
    ],
    heightMeters: PLAT_H + CENTER_H + 5.6,
    lod: 'procedural',
    services: ['parliament-info', 'president-reception'],
  };
  return { glb, def, stats: g.stats() };
}
