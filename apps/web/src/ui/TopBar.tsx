import { useEffect, useRef, useState } from 'preact/hooks';
import { searchServices, type Service } from '@metacity/services';
import { installPrompt, mode, openPanel, panel, pickingLocation, select, theme } from '../state/store';
import { mapRef } from './App';
import { BUILDING_CLASS_LABEL, PLACE_CLASS_LABEL, POI_CLASS_LABEL, ROAD_CLASS_LABEL } from '../labels';

interface SearchEntry {
  id: string;
  type: 'building' | 'poi' | 'place' | 'road';
  name: string;
  name_en?: string;
  class: string;
  lng: number;
  lat: number;
  featureId?: number;
  services?: string;
  addr?: string;
}

let indexPromise: Promise<SearchEntry[]> | null = null;
function loadIndex(): Promise<SearchEntry[]> {
  indexPromise ??= fetch(`${import.meta.env.BASE_URL}data/search-index.json`).then((r) => r.json() as Promise<SearchEntry[]>).catch(() => []);
  return indexPromise;
}

const TYPE_LABEL = (e: SearchEntry): string =>
  e.type === 'building' ? BUILDING_CLASS_LABEL[e.class] ?? 'Барилга' : e.type === 'poi' ? POI_CLASS_LABEL[e.class] ?? 'Байршил' : e.type === 'place' ? PLACE_CLASS_LABEL[e.class] ?? 'Газар' : ROAD_CLASS_LABEL[e.class] ?? 'Зам';

export function TopBar() {
  const [q, setQ] = useState('');
  const [places, setPlaces] = useState<SearchEntry[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) {
      setPlaces([]);
      setServices([]);
      return;
    }
    let alive = true;
    loadIndex().then((idx) => {
      if (!alive) return;
      const hits = idx.filter((e) => e.name.toLowerCase().includes(needle) || e.name_en?.toLowerCase().includes(needle)).slice(0, 7);
      setPlaces(hits);
    });
    setServices(searchServices(needle).slice(0, 4));
    return () => {
      alive = false;
    };
  }, [q]);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const goTo = (e: SearchEntry) => {
    const mc = mapRef.current;
    setOpen(false);
    setQ('');
    if (!mc) return;
    mc.flyTo([e.lng, e.lat], e.type === 'place' ? 15.5 : 17.2);
    if (e.type === 'building' && e.featureId !== undefined) mc.highlightBuilding(e.featureId);
    else mc.highlightBuilding(null);
    mc.setMarker(e.type === 'road' ? null : [e.lng, e.lat]);
    select({
      kind: e.type,
      featureId: e.featureId,
      name: e.name,
      name_en: e.name_en,
      class: e.class,
      props: { name: e.name, name_en: e.name_en, class: e.class, services: e.services, addr: e.addr, id: e.featureId },
      lngLat: [e.lng, e.lat],
    });
  };

  const showService = (s: Service) => {
    setOpen(false);
    setQ('');
    openPanel('services');
    // Үйлчилгээний панел руу сонгосон id-г дамжуулна
    location.hash = location.hash.replace(/&svc=[^&]*/, '') + `&svc=${s.id}`;
  };

  const toggleMode = () => {
    mode.value = mode.value === '3d' ? '2d' : '3d';
  };
  const toggleTheme = () => {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
  };
  const startReport = () => {
    openPanel('report');
    pickingLocation.value = true;
  };

  const hasResults = places.length > 0 || services.length > 0;

  return (
    <header class="topbar">
      <button class="brand" onClick={() => openPanel('about')} title="Meta City-ийн тухай">
        <img src={`${import.meta.env.BASE_URL}icons/icon.svg`} alt="" width="28" height="28" />
        <span>Meta City</span>
      </button>

      <div class="search" ref={box}>
        <input
          type="search"
          placeholder="Барилга, гудамж, үйлчилгээ хайх…"
          value={q}
          onInput={(e) => {
            setQ((e.target as HTMLInputElement).value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          aria-label="Хайх"
        />
        {open && hasResults && (
          <div class="search-results" role="listbox">
            {places.map((e) => (
              <button key={e.id} class="result" onClick={() => goTo(e)}>
                <span class="result-name">{e.name}</span>
                <span class="result-meta">{TYPE_LABEL(e)}{e.addr ? ` · ${e.addr}` : ''}</span>
              </button>
            ))}
            {services.map((s) => (
              <button key={s.id} class="result result-service" onClick={() => showService(s)}>
                <span class="result-name">{s.title}</span>
                <span class="result-meta">Үйлчилгээ · {s.description}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <nav class="actions">
        <button class={`btn ${mode.value === '3d' ? 'active' : ''}`} onClick={toggleMode} title="2D / 3D">
          {mode.value === '3d' ? '3D' : '2D'}
        </button>
        <button class={`btn ${panel.value === 'services' ? 'active' : ''}`} onClick={() => openPanel(panel.value === 'services' ? null : 'services')}>
          <span class="ico">🏛️</span>
          <span class="lbl">Үйлчилгээ</span>
        </button>
        <button class={`btn ${panel.value === 'report' ? 'active' : ''}`} onClick={startReport}>
          <span class="ico">📣</span>
          <span class="lbl">Мэдээлэх</span>
        </button>
        <button class="btn icon-only" onClick={toggleTheme} title="Өдөр / шөнө">
          {theme.value === 'light' ? '🌙' : '☀️'}
        </button>
        {installPrompt.value && (
          <button class="btn primary" onClick={() => installPrompt.value?.()} title="Апп болгон суулгах">
            ⬇︎ <span class="lbl">Суулгах</span>
          </button>
        )}
      </nav>
    </header>
  );
}
