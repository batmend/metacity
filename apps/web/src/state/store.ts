import { signal, computed, effect } from '@preact/signals';
import type { Theme, ViewMode } from '@metacity/style';

export type PanelKind = 'info' | 'services' | 'report' | 'about' | null;

export interface Selected {
  kind: 'building' | 'poi' | 'place' | 'road';
  featureId?: number;
  name: string;
  name_en?: string;
  class: string;
  props: Record<string, unknown>;
  lngLat: [number, number];
}

export interface CitizenReport {
  id: string;
  category: string;
  text: string;
  lng: number;
  lat: number;
  createdAt: string;
  status: 'new' | 'in_progress' | 'done';
}

const read = <T>(key: string, fallback: T): T => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, value: unknown): void => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* хувийн горим г.м. */
  }
};

const prefersDark = typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches;

export const mode = signal<ViewMode>(read<ViewMode>('mc.mode', '3d'));
export const theme = signal<Theme>(read<Theme>('mc.theme', prefersDark ? 'dark' : 'light'));
export const panel = signal<PanelKind>(null);
export const selected = signal<Selected | null>(null);
export const reports = signal<CitizenReport[]>(read<CitizenReport[]>('mc.reports', []));
/** Гомдол мэдээлэх горим: дараагийн click-ээр байршил сонгоно */
export const pickingLocation = signal(false);
export const reportDraftLocation = signal<[number, number] | null>(null);
export const mapReady = signal(false);
export const dataBytes = signal(0);
export const installPrompt = signal<(() => Promise<void>) | null>(null);

export const panelOpen = computed(() => panel.value !== null);

effect(() => write('mc.mode', mode.value));
effect(() => write('mc.theme', theme.value));
effect(() => write('mc.reports', reports.value));
effect(() => {
  document.documentElement.dataset['theme'] = theme.value;
});

export function openPanel(kind: PanelKind): void {
  panel.value = kind;
}
export function closePanel(): void {
  panel.value = null;
}
export function select(s: Selected | null): void {
  selected.value = s;
  if (s) panel.value = 'info';
  else if (panel.value === 'info') panel.value = null;
}
export function addReport(r: Omit<CitizenReport, 'id' | 'createdAt' | 'status'>): CitizenReport {
  const report: CitizenReport = { ...r, id: `r-${Date.now().toString(36)}`, createdAt: new Date().toISOString(), status: 'new' };
  reports.value = [report, ...reports.value];
  return report;
}
export function removeReport(id: string): void {
  reports.value = reports.value.filter((r) => r.id !== id);
}
