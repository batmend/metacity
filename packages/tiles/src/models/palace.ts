/**
 * Төрийн ордон (Government Palace) — нарийвчилсан 3D загвар (LOD 2).
 *
 * Бодит OSM footprint (way/4432623, 6 дотоод хашаатай) дээр суурилж процедурын аргаар
 * босгоно: үндсэн корпус, цонхны эгнээ, урд талын цагаан баганат колоннад (2006), төв
 * портик, Чингис хааны хөшөөний суурь, туг. Энэ бол фотограмметр/BIM загвар орж ирэх
 * хүртэлх ЗАВСРЫН загвар: хэмжээ, байршил бодит; архитектурын нарийн хэлбэр ойролцоо.
 *
 * Координат: загварын гарал (0,0) = footprint-ийн төв (anchor lng/lat), x=зүүн, y=хойд, метр.
 */
import type { Position } from 'geojson';
import { metersPerDegree } from '../geo.js';
import type { LandmarkModel } from '@metacity/schema';
import { GltfBuilder, signedArea, type Material } from './gltf.js';

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
  wall: { name: 'wall', color: [0.9, 0.86, 0.78] } satisfies Material,
  wallDark: { name: 'wall-dark', color: [0.72, 0.68, 0.6] } satisfies Material,
  roof: { name: 'roof', color: [0.5, 0.5, 0.52], roughness: 0.95 } satisfies Material,
  glass: { name: 'glass', color: [0.2, 0.3, 0.42, 0.9], metallic: 0.2, roughness: 0.25 } satisfies Material,
  column: { name: 'column', color: [0.97, 0.96, 0.93], roughness: 0.6 } satisfies Material,
  granite: { name: 'granite', color: [0.45, 0.45, 0.47], roughness: 0.7 } satisfies Material,
  bronze: { name: 'bronze', color: [0.45, 0.33, 0.18], metallic: 0.6, roughness: 0.45 } satisfies Material,
  flag: { name: 'flag', color: [0.8, 0.12, 0.16] } satisfies Material,
  pole: { name: 'pole', color: [0.8, 0.8, 0.82], metallic: 0.8, roughness: 0.3 } satisfies Material,
};

export function buildPalace(): { glb: Uint8Array; def: ModelDef; stats: ReturnType<GltfBuilder['stats']> } {
  const outer = PALACE_FOOTPRINT[0]!;
  // anchor = гадна цагирагийн төв
  const n = outer.length - 1;
  let sx = 0, sy = 0;
  for (let i = 0; i < n; i++) { sx += outer[i]![0]!; sy += outer[i]![1]!; }
  const anchor = { lng: sx / n, lat: sy / n };
  const mpd = metersPerDegree(anchor.lat);
  const toLocal = ([lng, lat]: Position): [number, number] => [(lng! - anchor.lng) * mpd.lng, (lat! - anchor.lat) * mpd.lat];
  const rings = PALACE_FOOTPRINT.map((r) => r.map(toLocal));

  const g = new GltfBuilder();
  for (const m of Object.values(M)) g.material(m);

  const BODY_H = 24; // ~5 давхар + парапет
  g.extrude('wall', 'roof', rings, 0, BODY_H);
  // парапет (дээврийн захын хашлага)
  for (const ring of rings) {
    for (let i = 0; i < ring.length - 1; i++) {
      const a = ring[i]!, b = ring[i + 1]!;
      const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (len < 2) continue;
      const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
      g.box('wall-dark', (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, BODY_H, len, 0.6, 1.1, ang);
    }
  }

  // Цонхны эгнээ: гадна цагирагийн 12 м-ээс урт хана бүр дээр, 5 давхар
  const outerRing = rings[0]!;
  const ccw = signedArea(outerRing.slice(0, -1)) > 0;
  const centroid: [number, number] = [0, 0];
  const windowsFloors = [3.2, 7.4, 11.6, 15.8, 20.0];
  // урд (өмнөд) хана: колоннадтай тул цонх тавихгүй
  const southWallIdx = new Set<number>();
  for (let i = 0; i < outerRing.length - 1; i++) {
    const a = outerRing[i]!, b = outerRing[i + 1]!;
    const my = (a[1] + b[1]) / 2;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (my < -60 && len > 40) southWallIdx.add(i);
  }
  for (let i = 0; i < outerRing.length - 1; i++) {
    if (southWallIdx.has(i)) continue;
    const a = outerRing[i]!, b = outerRing[i + 1]!;
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (len < 12) continue;
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    // гадагш нормал
    let nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
    if (!ccw) { nx = -nx; ny = -ny; }
    const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    if ((mx - centroid[0]) * nx + (my - centroid[1]) * ny < 0) { nx = -nx; ny = -ny; }
    const count = Math.floor((len - 3) / 4.2);
    const step = (len - 3) / count;
    for (let k = 0; k < count; k++) {
      const t = (1.5 + step * (k + 0.5)) / len;
      const cx = a[0] + (b[0] - a[0]) * t + nx * 0.12;
      const cy = a[1] + (b[1] - a[1]) * t + ny * 0.12;
      for (const z of windowsFloors) g.box('glass', cx, cy, z, 1.9, 0.3, 2.5, ang);
    }
  }

  // Колоннад: урд хананы дагуу (SW → SE), 1.5 м урагш, 11 м өндөр багана 4.1 м тутамд
  const south = [...southWallIdx].map((i) => [outerRing[i]!, outerRing[i + 1]!] as const);
  for (const [a0, b0] of south) {
    // a→b чиглэлийг баруунаас зүүн болгоно
    const [a, b] = a0[0] < b0[0] ? [a0, b0] : [b0, a0];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const nx = Math.sin(ang), ny = -Math.cos(ang); // урагш (−y тал) нормал
    const off = 1.6;
    const colH = 11;
    const count = Math.round(len / 4.1);
    for (let k = 0; k <= count; k++) {
      const t = k / count;
      const cx = a[0] + (b[0] - a[0]) * t + nx * off;
      const cy = a[1] + (b[1] - a[1]) * t + ny * off;
      g.cylinder('column', cx, cy, 0.4, 0.55, colH, 14);
      g.box('column', cx, cy, 0, 1.4, 1.4, 0.4, ang); // суурь
      g.box('column', cx, cy, colH + 0.4, 1.3, 1.3, 0.4, ang); // капител
    }
    // энтаблатур (баганын дээрх хэвтээ хавтан) ба түүний дээрх нам парапет
    const mx = (a[0] + b[0]) / 2 + nx * (off - 0.2), my = (a[1] + b[1]) / 2 + ny * (off - 0.2);
    g.box('column', mx, my, colH + 0.8, len + 2, 3.2, 1.6, ang);
    g.box('wall', mx, my, colH + 2.4, len + 2, 2.8, 0.7, ang);

    // Төв портик: хөшөөний байршил дээр төвлөсөн, илүү өндөр (17 м) 4 том баганатай халхавч
    const st = toLocal(CHINGGIS_STATUE);
    const portW = 26, portD = 9, portH = 17;
    const pcx = st[0] + nx * 1.5, pcy = st[1] + ny * 1.5;
    for (const dx of [-9.5, -3.2, 3.2, 9.5]) {
      const cx = pcx + Math.cos(ang) * dx + nx * (portD / 2 - 1.2);
      const cy = pcy + Math.sin(ang) * dx + ny * (portD / 2 - 1.2);
      g.cylinder('column', cx, cy, 0.6, 0.8, portH - 1.2, 16);
      g.box('column', cx, cy, 0, 2, 2, 0.6, ang);
    }
    g.box('column', pcx + nx * 0.5, pcy + ny * 0.5, portH - 0.6, portW, portD + 2, 2.2, ang); // халхавчийн хавтан
    g.box('roof', pcx + nx * 0.5, pcy + ny * 0.5, portH + 1.6, portW - 2, portD, 0.5, ang);
    // Хөшөөний суурь (боржин) ба суугаа дүрсийн хялбаршуулсан хэлбэр (хүрэл)
    g.box('granite', st[0], st[1], 0, 8, 5, 1.2, ang);
    g.box('granite', st[0], st[1], 1.2, 6.5, 4, 1.8, ang);
    g.box('bronze', st[0] - nx * 0.6, st[1] - ny * 0.6, 3.0, 4.2, 3.0, 1.6, ang); // сэнтий
    g.box('bronze', st[0] - nx * 0.9, st[1] - ny * 0.9, 4.6, 2.6, 1.8, 3.2, ang); // их бие
    g.box('bronze', st[0] + nx * 0.6, st[1] + ny * 0.6, 3.0, 2.2, 1.6, 1.9, ang); // өвдөг
    g.cylinder('bronze', st[0] - nx * 0.9, st[1] - ny * 0.9, 7.8, 0.65, 1.3, 10); // толгой
    // Хажуугийн хоёр хөшөө (Өгэдэй, Хубилай) — жижиг суугаа дүрс
    for (const dx of [-11, 11]) {
      const cx = st[0] + Math.cos(ang) * dx, cy = st[1] + Math.sin(ang) * dx;
      g.box('granite', cx, cy, 0, 5, 4, 1.2, ang);
      g.box('bronze', cx, cy, 1.2, 2.2, 2.0, 2.4, ang);
      g.cylinder('bronze', cx, cy, 3.6, 0.45, 0.9, 10);
    }
  }

  // Туг: дээвэр дээр 3 туг (төв), тугны даавуу
  for (const dx of [-8, 0, 8]) {
    g.cylinder('pole', dx, 10, BODY_H, 0.18, 14, 8);
    g.box('flag', dx + 2.2, 10, BODY_H + 10.5, 4.2, 0.08, 2.6);
  }

  const glb = g.toGLB('government-palace');
  const def: ModelDef = {
    id: 'government-palace',
    name: 'Төрийн ордон',
    name_en: 'Government Palace',
    buildingIds: [4432623, 1000],
    url: 'models/government-palace.glb',
    anchor,
    camera: { center: [anchor.lng, anchor.lat - 0.0016], zoom: 17.3, pitch: 62, bearing: -8 },
    description:
      'Монгол Улсын төрийн төв ордон. Улсын Их Хурал, Ерөнхийлөгч, Засгийн газрын байр. Сүхбаатарын талбайн хойд талд; ' +
      '2006 онд Их Монгол Улсын 800 жилийн ойд зориулан урд талд нь Чингис хааны хөшөө бүхий баганат колоннад барьсан.',
    facts: [
      { label: 'Хаяг', value: 'Сүхбаатар дүүрэг, Сүхбаатарын талбай 1' },
      { label: 'Байгууллага', value: 'УИХ, Ерөнхийлөгчийн Тамгын газар, Засгийн газрын Хэрэг эрхлэх газар' },
      { label: 'Урд талын хөшөө', value: 'Чингис хаан (төв), Өгэдэй, Хубилай хаан' },
      { label: 'Загвар', value: 'LOD 2 — бодит footprint (OSM way/4432623), процедурын архитектур' },
    ],
    heightMeters: BODY_H,
    lod: 'procedural',
    services: ['parliament-info', 'president-reception'],
  };
  return { glb, def, stats: g.stats() };
}
