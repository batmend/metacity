/** Seed-ийг зөвхөн GeoJSON болгон хадгална (tile үүсгэхгүй). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateUlaanbaatarSeed } from './ub.js';

const out = resolve(dirname(fileURLToPath(import.meta.url)), '../../out');
mkdirSync(out, { recursive: true });
const seed = generateUlaanbaatarSeed();
for (const [name, fc] of Object.entries(seed.layers)) writeFileSync(join(out, `seed-${name}.geojson`), JSON.stringify(fc));
console.log(`[seed] ${JSON.stringify(seed.counts)} → ${out}`);
