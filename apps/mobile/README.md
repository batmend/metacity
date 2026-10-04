# Meta City — гар утасны апп (Expo + MapLibre Native)

Вэбтэй **ижил** tile архив, загвар, үйлчилгээний каталог. Апп дотор газрын зургийн өгөгдөл байхгүй:
`EXPO_PUBLIC_ASSETS_URL`-ээс (вэбийн `public/` хавтас) tile, фонт, хайлтын индексийг татна.
3D барилга MapLibre Native-ийн fill-extrusion-оор босдог; PMTiles-ийг native SDK шууд уншина (Range хүсэлт).

## Ажиллуулах

MapLibre нь native модуль тул **Expo Go дээр ажиллахгүй** — development build эсвэл APK хэрэгтэй.

### А. Хамгийн хялбар: EAS-ээр APK үүсгэж утсан дээр суулгах (Android Studio хэрэггүй)
```bash
npm install -g eas-cli
eas login                      # expo.dev бүртгэл (үнэгүй)
cd apps/mobile
eas build -p android --profile preview
```
10–15 минутын дараа APK-ийн холбоос/QR гарна → утсан дээрээ татаж суулгана.
`eas.json` дахь `EXPO_PUBLIC_ASSETS_URL`-ийг өөрийн хостинг руу зааж өгнө (анхдагч: GitHub Pages).

### Б. Компьютер дээр native build (Android Studio / Xcode суулгасан бол)
```bash
cd apps/mobile
cp .env.example .env           # EXPO_PUBLIC_ASSETS_URL = компьютерийн LAN IP:4173
pnpm --filter @metacity/web exec vite preview --host 0.0.0.0   # өөр терминалд: өгөгдлийн сервер
pnpm android                   # expo run:android (утас USB-ээр, эсвэл эмулятор)
pnpm ios                       # macOS дээр
```
Дараа нь `pnpm start` (dev client) — код засахад шууд шинэчлэгдэнэ.

### Шалгалт (төхөөрөмжгүй)
```bash
pnpm typecheck
pnpm export                    # Metro bundle (dist/) — JS талын бүрэн шалгалт
```

## Бүтэц
- `App.tsx` — газрын зураг, 2D/3D, өдөр/шөнө, хайлт, барилга → үйлчилгээ, каталог
- `src/config.ts` — өгөгдлийн серверийн URL; `src/search.ts` — хайлтын индекс
- `src/ui/` — Sheet (доод панел), ServiceRow
- `app.json` — Expo config (`@maplibre/maplibre-react-native` plugin), `eas.json` — build профайлууд
