import { useEffect, useState } from 'preact/hooks';
import { CATEGORY_ICON, CATEGORY_LABEL, getService, parseServiceIds, servicesByCategory, type Service } from '@metacity/services';
import {
  addReport,
  closePanel,
  panel,
  pickingLocation,
  removeReport,
  reportDraftLocation,
  reports,
  selected,
  select,
  openPanel,
  landmark,
  landmarkLoading,
  nearby,
  type Selected,
} from '../state/store';
import { POI_CLASS_LABEL as POI_LBL } from '../labels';
import { mapRef } from './App';
import { BUILDING_CLASS_LABEL, PLACE_CLASS_LABEL, POI_CLASS_LABEL, REPORT_CATEGORIES, ROAD_CLASS_LABEL } from '../labels';

export function Panel() {
  const kind = panel.value;
  if (!kind) return null;
  return (
    <aside class="panel" role="dialog" aria-modal="false">
      <button class="panel-close" onClick={closePanel} aria-label="Хаах">
        ×
      </button>
      {kind === 'info' && <InfoPanel />}
      {kind === 'services' && <ServicesPanel />}
      {kind === 'report' && <ReportPanel />}
      {kind === 'about' && <AboutPanel />}
    </aside>
  );
}

// ---------------------------------------------------------------------------

function ServiceRow({ s, showWhere }: { s: Service; showWhere?: boolean }) {
  const action = () => {
    if (s.id === 'complaint-311' || s.inApp) {
      openPanel('report');
      pickingLocation.value = true;
      return;
    }
    if (s.url) window.open(s.url, '_blank', 'noopener');
    else if (s.phone) location.href = `tel:${s.phone}`;
  };
  return (
    <div class="service">
      <div class="service-head">
        <span class="service-ico">{CATEGORY_ICON[s.category]}</span>
        <div>
          <div class="service-title">{s.title}</div>
          <div class="service-desc">{s.description}</div>
        </div>
      </div>
      <div class="service-foot">
        <span class={`chip chip-${s.channel}`}>{s.channel === 'online' ? 'Онлайн' : s.channel === 'onsite' ? 'Биечлэн' : 'Онлайн / биечлэн'}</span>
        {s.phone && <span class="chip">☎ {s.phone}</span>}
        {s.demo && <span class="chip chip-demo">демо</span>}
        {(s.url || s.phone || s.inApp) && (
          <button class="btn small primary" onClick={action}>
            {s.inApp ? 'Meta City дээр' : s.url ? 'Үйлчилгээ авах' : 'Залгах'}
          </button>
        )}
        {showWhere && (
          <button class="btn small" onClick={() => showWhere && whereIs(s.id)}>
            Хаана?
          </button>
        )}
      </div>
    </div>
  );
}

async function whereIs(serviceId: string): Promise<void> {
  const idx = (await fetch(`${import.meta.env.BASE_URL}data/search-index.json`).then((r) => r.json())) as { name: string; lng: number; lat: number; services?: string; featureId?: number; class: string; type: Selected['kind']; name_en?: string; addr?: string }[];
  const hit = idx.find((e) => e.services?.split(',').includes(serviceId));
  const mc = mapRef.current;
  if (!hit || !mc) return;
  mc.flyTo([hit.lng, hit.lat], 17.2);
  if (hit.featureId !== undefined) mc.highlightBuilding(hit.featureId);
  mc.setMarker([hit.lng, hit.lat]);
  select({ kind: hit.type, featureId: hit.featureId, name: hit.name, name_en: hit.name_en, class: hit.class, props: { ...hit, id: hit.featureId }, lngLat: [hit.lng, hit.lat] });
}

// ---------------------------------------------------------------------------

function InfoPanel() {
  const s = selected.value;
  if (!s) return <div class="panel-body">Газрын зураг дээрх барилга, байршил дээр дарна уу.</div>;
  const p = s.props;
  const classLabel =
    s.kind === 'building' ? BUILDING_CLASS_LABEL[s.class] : s.kind === 'poi' ? POI_CLASS_LABEL[s.class] : s.kind === 'place' ? PLACE_CLASS_LABEL[s.class] : ROAD_CLASS_LABEL[s.class];
  const lm = landmark.value;
  const services = parseServiceIds([p['services'] as string | undefined, lm?.services?.join(',')].filter(Boolean).join(','));
  const height = typeof p['height'] === 'number' ? (p['height'] as number) : undefined;
  const levels = typeof p['levels'] === 'number' ? (p['levels'] as number) : undefined;
  const title = s.name || (s.kind === 'building' ? `Барилга #${s.featureId ?? ''}` : classLabel);

  return (
    <div class="panel-body">
      <div class="eyebrow">{lm ? 'Дурсгалт барилга' : (classLabel ?? s.class)}</div>
      <h2>{title}</h2>
      {s.name_en && <div class="muted">{s.name_en}</div>}
      {p['addr'] && <div class="addr">📍 {String(p['addr'])}</div>}
      {(height !== undefined || levels !== undefined) && (
        <dl class="facts">
          {height !== undefined && (
            <div>
              <dt>Өндөр</dt>
              <dd>{height} м</dd>
            </div>
          )}
          {levels !== undefined && (
            <div>
              <dt>Давхар</dt>
              <dd>{levels}</dd>
            </div>
          )}
          {s.featureId !== undefined && (
            <div>
              <dt>ID</dt>
              <dd>{s.featureId}</dd>
            </div>
          )}
        </dl>
      )}
      {p['demo'] !== undefined && <div class="note">Демо өгөгдөл: байршил, өндөр ойролцоо. Бодит OSM/кадастрын өгөгдлөөр солигдоно.</div>}

      {landmark.value && (
        <section class="landmark">
          <div class="landmark-badge">
            🏛️ Нарийвчилсан 3D загвар · {landmark.value.lod === 'procedural' ? 'LOD 2' : landmark.value.lod === 'bim' ? 'BIM' : 'Фотограмметр'}
            {landmarkLoading.value && <span class="muted"> · ачаалж байна…</span>}
          </div>
          <p>{landmark.value.description}</p>
          <dl class="kv">
            {landmark.value.facts.map((f) => (
              <div key={f.label}>
                <dt>{f.label}</dt>
                <dd>{f.value}</dd>
              </div>
            ))}
          </dl>
          <div class="muted">Камер барилгыг тойрон эргэнэ; газрын зураг дээр дарж/чирж зогсооно.</div>
        </section>
      )}

      <h3>Энд авах боломжтой үйлчилгээ</h3>
      {services.length === 0 ? (
        <div class="muted">Энэ байршилд бүртгэгдсэн үйлчилгээ алга.</div>
      ) : (
        services.map((sv) => <ServiceRow key={sv.id} s={sv} />)
      )}

      {nearby.value.length > 0 && (
        <>
          <h3>Ойролцоох байршлууд</h3>
          <ul class="nearby">
            {nearby.value.map((n) => (
              <li key={n.name}>
                <span>{n.name}</span>
                <span class="muted">{POI_LBL[n.class] ?? n.class} · {n.dist} м</span>
              </li>
            ))}
          </ul>
        </>
      )}

      <div class="row">
        <button
          class="btn"
          onClick={() => {
            openPanel('report');
            reportDraftLocation.value = s.lngLat;
            mapRef.current?.setMarker(s.lngLat);
          }}
        >
          📣 Энд асуудал мэдээлэх
        </button>
        <button class="btn" onClick={() => mapRef.current?.flyTo(s.lngLat, 18)}>
          🎯 Ойртох
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------

function ServicesPanel() {
  const groups = servicesByCategory();
  const [filter, setFilter] = useState<string | null>(null);
  const [focus, setFocus] = useState<Service | null>(null);

  useEffect(() => {
    const m = /svc=([a-z0-9-]+)/.exec(location.hash);
    if (m) {
      const s = getService(m[1]!);
      if (s) {
        setFocus(s);
        setFilter(s.category);
      }
      location.hash = location.hash.replace(/&svc=[^&]*/, '');
    }
  }, []);

  return (
    <div class="panel-body">
      <div class="eyebrow">Иргэдийн үйлчилгээ</div>
      <h2>Үйлчилгээний каталог</h2>
      <p class="muted">Бодит амьдралд авдаг үйлчилгээгээ газрын зураг дээрх байгууллагаас шууд аваарай. «Хаана?» дарж байршлыг нь харна.</p>
      <div class="chips">
        <button class={`chip ${filter === null ? 'on' : ''}`} onClick={() => setFilter(null)}>
          Бүгд
        </button>
        {groups.map((g) => (
          <button key={g.category} class={`chip ${filter === g.category ? 'on' : ''}`} onClick={() => setFilter(g.category)}>
            {g.icon} {g.label}
          </button>
        ))}
      </div>
      {focus && (
        <div class="focus">
          <ServiceRow s={focus} showWhere />
        </div>
      )}
      {groups
        .filter((g) => filter === null || g.category === filter)
        .map((g) => (
          <section key={g.category}>
            <h3>
              {g.icon} {CATEGORY_LABEL[g.category]}
            </h3>
            {g.services.map((s) => (
              <ServiceRow key={s.id} s={s} showWhere />
            ))}
          </section>
        ))}
    </div>
  );
}

// ---------------------------------------------------------------------------

function ReportPanel() {
  const loc = reportDraftLocation.value;
  const picking = pickingLocation.value;
  const [category, setCategory] = useState('road');
  const [text, setText] = useState('');
  const [sent, setSent] = useState<string | null>(null);

  const submit = (e: Event) => {
    e.preventDefault();
    if (!loc || !text.trim()) return;
    const r = addReport({ category, text: text.trim(), lng: loc[0], lat: loc[1] });
    setSent(r.id);
    setText('');
    reportDraftLocation.value = null;
    mapRef.current?.setMarker(null);
  };

  return (
    <div class="panel-body">
      <div class="eyebrow">Иргэний оролцоо</div>
      <h2>Санал, гомдол мэдээлэх</h2>
      <p class="muted">Зам, гэрэлтүүлэг, хог, ногоон байгууламжийн асуудлыг газрын зураг дээр цэглэж мэдээлнэ. (Демо: таны төхөөрөмж дээр хадгалагдана; дараагийн шатанд Нийслэлийн 11-11 төв рүү илгээгдэнэ.)</p>

      {sent && <div class="ok">✅ Мэдээлэл хүлээн авлаа. Дугаар: {sent}</div>}

      <form onSubmit={submit} class="form">
        <label>
          Байршил
          <div class="row">
            <input type="text" readOnly value={loc ? `${loc[1].toFixed(5)}, ${loc[0].toFixed(5)}` : picking ? 'Газрын зураг дээр дарна уу…' : '—'} />
            <button type="button" class={`btn ${picking ? 'active' : ''}`} onClick={() => (pickingLocation.value = !picking)}>
              {picking ? 'Хүлээж байна…' : '📍 Сонгох'}
            </button>
          </div>
        </label>
        <label>
          Төрөл
          <select value={category} onChange={(e) => setCategory((e.target as HTMLSelectElement).value)}>
            {REPORT_CATEGORIES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Тайлбар
          <textarea rows={3} value={text} onInput={(e) => setText((e.target as HTMLTextAreaElement).value)} placeholder="Юу болсон бэ?" />
        </label>
        <button type="submit" class="btn primary" disabled={!loc || !text.trim()}>
          Илгээх
        </button>
      </form>

      {reports.value.length > 0 && (
        <>
          <h3>Миний мэдээлсэн асуудлууд ({reports.value.length})</h3>
          {reports.value.map((r) => (
            <div key={r.id} class="report">
              <div>
                <b>{REPORT_CATEGORIES.find((c) => c.id === r.category)?.label ?? r.category}</b> · <span class="muted">{new Date(r.createdAt).toLocaleString('mn-MN')}</span>
                <div>{r.text}</div>
              </div>
              <div class="row">
                <button class="btn small" onClick={() => mapRef.current?.flyTo([r.lng, r.lat], 18)}>
                  Харах
                </button>
                <button class="btn small" onClick={() => removeReport(r.id)}>
                  Устгах
                </button>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------

function AboutPanel() {
  return (
    <div class="panel-body">
      <div class="eyebrow">Платформ</div>
      <h2>Meta City</h2>
      <p>
        Улаанбаатар хотын <b>digital twin</b>. Хотоо 2D/3D-ээр үзэж, бодит амьдралд авдаг үйлчилгээгээ газрын зураг дээрх байгууллагаас шууд авна.
      </p>
      <h3>Яагаад хөнгөн вэ?</h3>
      <ul class="list">
        <li>Апп дотор газрын зургийн өгөгдөл байхгүй — зөвхөн харж буй хэсгээ татна (PMTiles, HTTP Range).</li>
        <li>3D барилга нь 2D-тэй ижил vector tile-аас босдог — нэмэлт 3D файл татдаггүй.</li>
        <li>Zoom бүрт нэг tile-ийн хэмжээ тогтмол хязгаартай — хот томроход хэрэглэгчийн дата өсөхгүй.</li>
        <li>Вэб = апп (PWA). Суулгахад shell л татагдана.</li>
      </ul>
      <h3>Демо</h3>
      <p class="muted">Одоогийн өгөгдөл: Сүхбаатарын талбайн орчим, ойролцоо seed. Бодит OSM болон хотын GIS өгөгдлөөр солигдоно.</p>
    </div>
  );
}
