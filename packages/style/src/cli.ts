/** Загварыг JSON болгон хадгална (native апп, QA, бусад клиентэд). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { buildStyle, type Theme, type ViewMode } from './index.js';

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../../apps/web/public/style');
mkdirSync(out, { recursive: true });

for (const theme of ['light', 'dark'] as Theme[]) {
  for (const mode of ['2d', '3d'] as ViewMode[]) {
    const style = buildStyle({
      tilesUrl: 'pmtiles:///tiles/ub-demo.pmtiles',
      glyphsUrl: '/fonts/{fontstack}/{range}.pbf',
      theme,
      mode,
    });
    const errors = validateStyleMin(style);
    if (errors.length > 0) {
      for (const e of errors) console.error(`[style] ${theme}/${mode}: ${e.message}`);
      process.exit(1);
    }
    const file = join(out, `metacity-${theme}-${mode}.json`);
    writeFileSync(file, JSON.stringify(style, null, 2));
    console.log(`[style] ${file} (${style.layers.length} давхарга) ✓`);
  }
}
