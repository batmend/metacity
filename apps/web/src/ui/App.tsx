import { useEffect, useRef } from 'preact/hooks';
import { createMap, type MetaCityMap } from '../map/create';
import { mode, theme, mapReady } from '../state/store';
import { TopBar } from './TopBar';
import { Panel } from './Panel';
import { StatusBar } from './StatusBar';
import { effect } from '@preact/signals';

/** Газрын зургийн instance — UI-ийн бусад хэсэг эндээс ашиглана. */
export const mapRef: { current: MetaCityMap | null } = { current: null };

export function App() {
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!el.current) return;
    const mc = createMap(el.current);
    mapRef.current = mc;
    // Горим/өнгө солигдоход газрын зургийг шинэчилнэ
    let firstMode = true;
    let firstTheme = true;
    const d1 = effect(() => {
      const m = mode.value;
      if (firstMode) {
        firstMode = false;
        return;
      }
      mc.setMode(m);
    });
    const d2 = effect(() => {
      const t = theme.value;
      if (firstTheme) {
        firstTheme = false;
        return;
      }
      mc.setTheme(t);
    });
    return () => {
      d1();
      d2();
      mc.destroy();
      mapRef.current = null;
      mapReady.value = false;
    };
  }, []);

  return (
    <div class="app">
      <div ref={el} class="map" aria-label="Улаанбаатар хотын газрын зураг" />
      <TopBar />
      <Panel />
      <StatusBar />
    </div>
  );
}
