/** Класс → монгол нэршил (UI-д). */
export const BUILDING_CLASS_LABEL: Record<string, string> = {
  residential: 'Орон сууц',
  commercial: 'Худалдаа, үйлчилгээ',
  office: 'Оффис',
  government: 'Төрийн байгууллага',
  cultural: 'Соёл, урлаг',
  education: 'Боловсрол',
  health: 'Эрүүл мэнд',
  hotel: 'Зочид буудал',
  religious: 'Шашны байгууламж',
  industrial: 'Үйлдвэр',
  other: 'Бусад',
};

export const POI_CLASS_LABEL: Record<string, string> = {
  government: 'Төрийн байгууллага',
  culture: 'Соёлын төв',
  museum: 'Музей',
  theatre: 'Театр',
  post: 'Шуудан',
  bank: 'Банк',
  hospital: 'Эмнэлэг',
  pharmacy: 'Эмийн сан',
  school: 'Сургууль',
  kindergarten: 'Цэцэрлэг',
  university: 'Их сургууль',
  police: 'Цагдаа',
  bus_stop: 'Автобусны буудал',
  parking: 'Зогсоол',
  hotel: 'Зочид буудал',
  shop: 'Дэлгүүр',
  restaurant: 'Ресторан',
  park: 'Цэцэрлэгт хүрээлэн',
  monument: 'Хөшөө дурсгал',
  temple: 'Сүм хийд',
  office: 'Оффис',
};

export const PLACE_CLASS_LABEL: Record<string, string> = {
  city: 'Хот',
  district: 'Дүүрэг',
  khoroo: 'Хороо',
  neighbourhood: 'Хороолол',
  square: 'Талбай',
};

export const ROAD_CLASS_LABEL: Record<string, string> = {
  motorway: 'Хурдны зам',
  trunk: 'Гол зам',
  primary: 'Өргөн чөлөө',
  secondary: 'Гол гудамж',
  tertiary: 'Гудамж',
  residential: 'Орон сууцны гудамж',
  service: 'Үйлчилгээний зам',
  path: 'Явган зам',
  rail: 'Төмөр зам',
};

export const REPORT_CATEGORIES: { id: string; label: string }[] = [
  { id: 'road', label: 'Зам, нүх, хучилт' },
  { id: 'light', label: 'Гэрэлтүүлэг' },
  { id: 'waste', label: 'Хог хаягдал' },
  { id: 'green', label: 'Ногоон байгууламж' },
  { id: 'water', label: 'Ус, дулаан' },
  { id: 'safety', label: 'Аюулгүй байдал' },
  { id: 'other', label: 'Бусад' },
];
