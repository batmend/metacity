/**
 * @metacity/services — Иргэдийн үйлчилгээний каталог.
 *
 * Meta City-ийн зорилго: иргэн бодит амьдралд авдаг үйлчилгээгээ газрын зураг
 * дээрх ТУХАЙН БАРИЛГА/БАЙГУУЛЛАГААС шууд авна. Каталог нь үйлчилгээг
 * (id, ангилал, суваг, холбоос) тодорхойлж, tile дэх `services` атрибут
 * (таслалаар тусгаарласан id-ууд) эндхийн id-тай холбогдоно.
 *
 * Одоогоор статик демо каталог. Дараагийн шат: API (apps/api) + e-Mongolia,
 * ДАН систем, НҮНТ-ийн интеграци (docs/ROADMAP.md).
 */

export type ServiceCategory =
  | 'government'
  | 'utilities'
  | 'transport'
  | 'health'
  | 'education'
  | 'culture'
  | 'finance'
  | 'post'
  | 'citizen'
  | 'commercial';

export type ServiceChannel = 'online' | 'onsite' | 'both';

export interface Service {
  id: string;
  title: string;
  category: ServiceCategory;
  description: string;
  channel: ServiceChannel;
  /** Онлайн үйлчилгээний холбоос (байвал). */
  url?: string;
  /** Яаралтай дуудлагын дугаар (байвал). */
  phone?: string;
  /** Meta City дотор өөрөө гүйцэтгэх боломжтой (жишээ: гомдол мэдээлэх). */
  inApp?: boolean;
  /** Демо үйлчилгээ — бодит интеграци хараахан байхгүй. */
  demo?: boolean;
}

export const CATEGORY_LABEL: Record<ServiceCategory, string> = {
  government: 'Төрийн үйлчилгээ',
  utilities: 'Нийтийн аж ахуй',
  transport: 'Тээвэр, зогсоол',
  health: 'Эрүүл мэнд',
  education: 'Боловсрол',
  culture: 'Соёл, урлаг',
  finance: 'Санхүү',
  post: 'Шуудан, илгээмж',
  citizen: 'Иргэний оролцоо',
  commercial: 'Худалдаа, үйлчилгээ',
};

export const CATEGORY_ICON: Record<ServiceCategory, string> = {
  government: '🏛️',
  utilities: '💡',
  transport: '🚌',
  health: '🏥',
  education: '🎓',
  culture: '🎭',
  finance: '🏦',
  post: '📦',
  citizen: '📣',
  commercial: '🛍️',
};

export const SERVICES: Service[] = [
  // --- Төрийн үйлчилгээ ---
  { id: 'parliament-info', title: 'УИХ-ын хуралдааны мэдээлэл', category: 'government', description: 'Улсын Их Хурлын чуулганы хуваарь, хэлэлцэж буй хуулийн төслүүд.', channel: 'online', url: 'https://parliament.mn', demo: true },
  { id: 'president-reception', title: 'Ерөнхийлөгчид өргөдөл гаргах', category: 'government', description: 'Иргэдээс Ерөнхийлөгчид хандаж өргөдөл, гомдол гаргах.', channel: 'both', url: 'https://president.mn', demo: true },
  { id: 'civil-registration', title: 'Иргэний бүртгэл', category: 'government', description: 'Төрсний, гэрлэлтийн гэрчилгээ, иргэний үнэмлэх, хаягийн бүртгэл.', channel: 'both', url: 'https://e-mongolia.mn', demo: true },
  { id: 'property-tax', title: 'Үл хөдлөх хөрөнгийн татвар', category: 'finance', description: 'Орон сууц, газрын татварын тооцоо, төлбөр.', channel: 'online', url: 'https://e-mongolia.mn', demo: true },
  { id: 'land-permit', title: 'Газар эзэмших, барилгын зөвшөөрөл', category: 'government', description: 'Газар эзэмших эрх, барилга байгууламжийн зөвшөөрөл, кадастрын лавлагаа.', channel: 'both', demo: true },
  { id: 'police-report', title: 'Цагдаад мэдээлэл өгөх', category: 'government', description: 'Гэмт хэрэг, зөрчлийн талаар мэдээлэл өгөх, лавлагаа авах.', channel: 'both', phone: '102', demo: true },
  { id: 'emergency-102', title: 'Цагдаа — 102', category: 'government', description: 'Яаралтай дуудлага.', channel: 'onsite', phone: '102' },
  // --- Нийтийн аж ахуй ---
  { id: 'bill-pay', title: 'Цахилгаан, ус, дулааны төлбөр', category: 'utilities', description: 'ОСНААУГ, УСУГ, ЦТС-ийн төлбөрийг нэг дороос төлөх.', channel: 'online', demo: true },
  { id: 'water-outage', title: 'Ус, дулаан тасрах мэдэгдэл', category: 'utilities', description: 'Таны хорооллын засварын хуваарь, тасралтын мэдэгдэл.', channel: 'online', inApp: true, demo: true },
  { id: 'heating-outage', title: 'Халаалтын гомдол', category: 'utilities', description: 'Халаалт хүрэлцэхгүй, хоолой алдагдах зэрэг асуудал мэдээлэх.', channel: 'online', inApp: true, demo: true },
  // --- Иргэний оролцоо ---
  { id: 'complaint-311', title: 'Санал, гомдол мэдээлэх', category: 'citizen', description: 'Зам, гэрэлтүүлэг, хог, ногоон байгууламжийн асуудлыг газрын зураг дээр цэглэж мэдээлэх.', channel: 'online', inApp: true, demo: true },
  // --- Шуудан ---
  { id: 'post-parcel', title: 'Илгээмж илгээх, хүлээн авах', category: 'post', description: 'Дотоод, олон улсын шуудан илгээмж.', channel: 'onsite', demo: true },
  { id: 'post-tracking', title: 'Илгээмж хянах', category: 'post', description: 'Илгээмжийн дугаараар байршил хянах.', channel: 'online', url: 'https://mongolpost.mn', demo: true },
  // --- Санхүү ---
  { id: 'stock-info', title: 'Хувьцааны ханш', category: 'finance', description: 'Монголын хөрөнгийн биржийн арилжааны мэдээлэл.', channel: 'online', url: 'https://mse.mn', demo: true },
  { id: 'bank-account', title: 'Данс нээх', category: 'finance', description: 'Банкны данс нээх, картын захиалга.', channel: 'both', demo: true },
  { id: 'bank-loan', title: 'Зээлийн хүсэлт', category: 'finance', description: 'Хэрэглээний болон орон сууцны зээлийн урьдчилсан тооцоо.', channel: 'online', demo: true },
  // --- Худалдаа ---
  { id: 'office-rent', title: 'Оффис түрээслэх', category: 'commercial', description: 'Сул оффисын талбай, түрээсийн нөхцөл.', channel: 'online', demo: true },
  { id: 'hotel-booking', title: 'Зочид буудал захиалах', category: 'commercial', description: 'Өрөө захиалга, үнийн мэдээлэл.', channel: 'online', demo: true },
  { id: 'pharmacy-order', title: 'Эм захиалах', category: 'health', description: 'Жороор болон жоргүй эм захиалах, хүргүүлэх.', channel: 'both', demo: true },
  // --- Тээвэр ---
  { id: 'bus-schedule', title: 'Автобусны цагийн хуваарь', category: 'transport', description: 'Энэ буудлаар явах чиглэлүүд, ирэх хугацаа.', channel: 'online', inApp: true, demo: true },
  { id: 'parking-pay', title: 'Зогсоолын төлбөр', category: 'transport', description: 'Зогсоолын сул байр, цагийн төлбөр.', channel: 'online', inApp: true, demo: true },
  // --- Эрүүл мэнд ---
  { id: 'hospital-appointment', title: 'Эмчийн цаг захиалах', category: 'health', description: 'Эмнэлгийн тасаг, эмч сонгож цаг авах.', channel: 'online', demo: true },
  { id: 'emergency-103', title: 'Түргэн тусламж — 103', category: 'health', description: 'Яаралтай дуудлага.', channel: 'onsite', phone: '103' },
  // --- Боловсрол ---
  { id: 'school-enroll', title: 'Сургуульд бүртгүүлэх', category: 'education', description: 'Хороололдоо харьяалагдах сургуульд элсэлтийн бүртгэл.', channel: 'online', demo: true },
  { id: 'kindergarten-enroll', title: 'Цэцэрлэгт бүртгүүлэх', category: 'education', description: 'Цэцэрлэгийн элсэлт, дараалал.', channel: 'online', demo: true },
  { id: 'university-apply', title: 'Их сургуулийн элсэлт', category: 'education', description: 'Элсэлтийн шалгалт, бүртгэл.', channel: 'online', demo: true },
  // --- Соёл ---
  { id: 'theatre-ticket', title: 'Театрын тасалбар', category: 'culture', description: 'Тоглолтын хуваарь, тасалбар захиалга.', channel: 'online', demo: true },
  { id: 'museum-ticket', title: 'Музейн тасалбар', category: 'culture', description: 'Үзэсгэлэн, цагийн хуваарь, тасалбар.', channel: 'both', demo: true },
  { id: 'library-card', title: 'Номын сангийн карт', category: 'culture', description: 'Уншигчийн карт нээх, ном захиалах.', channel: 'both', demo: true },
];

const BY_ID = new Map(SERVICES.map((s) => [s.id, s]));

export function getService(id: string): Service | undefined {
  return BY_ID.get(id);
}

/** Tile атрибут "a,b,c" → Service[] (үл мэдэгдэх id-г алгасна). */
export function parseServiceIds(csv: string | undefined | null): Service[] {
  if (!csv) return [];
  return csv
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((id) => BY_ID.get(id))
    .filter((s): s is Service => s !== undefined);
}

export function servicesByCategory(): { category: ServiceCategory; label: string; icon: string; services: Service[] }[] {
  const order: ServiceCategory[] = ['government', 'citizen', 'utilities', 'transport', 'health', 'education', 'culture', 'finance', 'post', 'commercial'];
  return order
    .map((category) => ({ category, label: CATEGORY_LABEL[category], icon: CATEGORY_ICON[category], services: SERVICES.filter((s) => s.category === category) }))
    .filter((g) => g.services.length > 0);
}

export function searchServices(q: string): Service[] {
  const needle = q.trim().toLowerCase();
  if (!needle) return [];
  return SERVICES.filter((s) => s.title.toLowerCase().includes(needle) || s.description.toLowerCase().includes(needle) || CATEGORY_LABEL[s.category].toLowerCase().includes(needle));
}
