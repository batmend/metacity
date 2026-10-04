/**
 * Жижиг glTF 2.0 (GLB) бичигч — гадаад хамааралгүй.
 *
 * Координат: бид x=зүүн, y=хойд, z=дээш (метр) ашиглана; glTF y-up тул бичихдээ
 * (x, y, z) → (x, z, -y) хөрвүүлнэ. Материал бүрт нэг primitive (вертекс/индекс буфер).
 */
import earcut from 'earcut';

export interface Material {
  name: string;
  color: [number, number, number, number?];
  metallic?: number;
  roughness?: number;
  /** Texture (PNG) — UV нь tri-planar: тухайн гадаргуун дээрх метр / uvScale */
  texture?: { png: Uint8Array; width: number; height: number };
  /** Texture нэг удаа давтагдах хэмжээ (м) */
  uvScale?: number;
}

type V3 = [number, number, number];

class Prim {
  positions: number[] = [];
  normals: number[] = [];
  uvs: number[] = [];
  indices: number[] = [];
  get vertexCount(): number {
    return this.positions.length / 3;
  }
}

export class GltfBuilder {
  private prims = new Map<string, Prim>();
  private materials: Material[] = [];

  material(m: Material): string {
    if (!this.materials.some((x) => x.name === m.name)) this.materials.push(m);
    return m.name;
  }

  private prim(mat: string): Prim {
    let p = this.prims.get(mat);
    if (!p) {
      p = new Prim();
      this.prims.set(mat, p);
    }
    return p;
  }

  /** Гурвалжин (хоёр талдаа нэг нормалтай) */
  triangle(mat: string, a: V3, b: V3, c: V3): void {
    const p = this.prim(mat);
    const n = normal(a, b, c);
    const base = p.vertexCount;
    const scale = this.materials.find((m) => m.name === mat)?.uvScale ?? 4;
    const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
    for (const v of [a, b, c]) {
      p.positions.push(v[0], v[1], v[2]);
      p.normals.push(n[0], n[1], n[2]);
      // tri-planar UV: хамгийн их нормалын тэнхлэгийг орхиж үлдсэн хоёрыг ашиглана; босоо хананд v = z
      let u: number, w: number;
      if (az >= ax && az >= ay) { u = v[0]; w = v[1]; }
      else if (ax >= ay) { u = v[1]; w = v[2]; }
      else { u = v[0]; w = v[2]; }
      p.uvs.push(u / scale, 1 - w / scale);
    }
    p.indices.push(base, base + 1, base + 2);
  }

  /** Гурвалжин, орой бүрт өөрийн нормалтай (гөлгөр гадаргуу) */
  triangleN(mat: string, a: V3, b: V3, c: V3, na: V3, nb: V3, nc: V3): void {
    const p = this.prim(mat);
    const base = p.vertexCount;
    const scale = this.materials.find((m) => m.name === mat)?.uvScale ?? 4;
    const n = normal(a, b, c);
    const ax = Math.abs(n[0]), ay = Math.abs(n[1]), az = Math.abs(n[2]);
    for (const [v, vn] of [[a, na], [b, nb], [c, nc]] as [V3, V3][]) {
      p.positions.push(v[0], v[1], v[2]);
      p.normals.push(vn[0], vn[1], vn[2]);
      let u: number, w: number;
      if (az >= ax && az >= ay) { u = v[0]; w = v[1]; }
      else if (ax >= ay) { u = v[1]; w = v[2]; }
      else { u = v[0]; w = v[2]; }
      p.uvs.push(u / scale, 1 - w / scale);
    }
    p.indices.push(base, base + 1, base + 2);
  }

  /**
   * Тойруулалт (surface of revolution): профиль [(r, z)] цэгүүдийг z тэнхлэгийг тойруулна.
   * Багана, капитель, суурь, хөшөөний тавцан, оройн чимэг г.м. Гөлгөр нормалтай.
   */
  lathe(mat: string, cx: number, cy: number, z0: number, profile: [number, number][], segments = 24, rotZ = 0): void {
    const ring = (i: number): V3[] => {
      const [r, z] = profile[i]!;
      const pts: V3[] = [];
      for (let k = 0; k <= segments; k++) {
        const a = rotZ + (k / segments) * Math.PI * 2;
        pts.push([cx + r * Math.cos(a), cy + r * Math.sin(a), z0 + z]);
      }
      return pts;
    };
    // профилийн нормал (2D): dz, -dr чиглэл
    const pn = (i: number): [number, number] => {
      const i0 = Math.max(0, i - 1), i1 = Math.min(profile.length - 1, i + 1);
      const dr = profile[i1]![0] - profile[i0]![0], dz = profile[i1]![1] - profile[i0]![1];
      const l = Math.hypot(dr, dz) || 1;
      return [dz / l, -dr / l];
    };
    for (let i = 0; i < profile.length - 1; i++) {
      const r0 = ring(i), r1 = ring(i + 1);
      const n0 = pn(i), n1 = pn(i + 1);
      for (let k = 0; k < segments; k++) {
        const a0 = rotZ + (k / segments) * Math.PI * 2, a1 = rotZ + ((k + 1) / segments) * Math.PI * 2;
        const N = (n: [number, number], a: number): V3 => [n[0] * Math.cos(a), n[0] * Math.sin(a), n[1]];
        if (profile[i]![0] > 1e-6 || profile[i + 1]![0] > 1e-6) {
          this.triangleN(mat, r0[k]!, r0[k + 1]!, r1[k + 1]!, N(n0, a0), N(n0, a1), N(n1, a1));
          this.triangleN(mat, r0[k]!, r1[k + 1]!, r1[k]!, N(n0, a0), N(n1, a1), N(n1, a0));
        }
      }
    }
  }

  /** Эллипсоид (гөлгөр), z тэнхлэгээр rotZ, y тэнхлэгээр tilt (рад) эргүүлсэн */
  ellipsoid(mat: string, c: V3, rx: number, ry: number, rz: number, rotZ = 0, tilt = 0, segs = 16, rings = 10): void {
    const cz = Math.cos(rotZ), sz = Math.sin(rotZ), ct = Math.cos(tilt), st = Math.sin(tilt);
    const xf = (p: V3): V3 => {
      // tilt: x-z хавтгайд, дараа нь rotZ
      const x1 = p[0] * ct - p[2] * st, z1 = p[0] * st + p[2] * ct;
      return [c[0] + x1 * cz - p[1] * sz, c[1] + x1 * sz + p[1] * cz, c[2] + z1];
    };
    const nf = (n: V3): V3 => {
      const x1 = n[0] * ct - n[2] * st, z1 = n[0] * st + n[2] * ct;
      return [x1 * cz - n[1] * sz, x1 * sz + n[1] * cz, z1];
    };
    const pt = (i: number, k: number): [V3, V3] => {
      const phi = (i / rings) * Math.PI, th = (k / segs) * Math.PI * 2;
      const ux = Math.sin(phi) * Math.cos(th), uy = Math.sin(phi) * Math.sin(th), uz = Math.cos(phi);
      const n: V3 = [ux / rx, uy / ry, uz / rz];
      const l = Math.hypot(...n) || 1;
      return [xf([ux * rx, uy * ry, uz * rz]), nf([n[0] / l, n[1] / l, n[2] / l])];
    };
    for (let i = 0; i < rings; i++)
      for (let k = 0; k < segs; k++) {
        const [a, na] = pt(i, k), [b, nb] = pt(i, k + 1), [c2, nc] = pt(i + 1, k + 1), [d, nd] = pt(i + 1, k);
        if (i > 0) this.triangleN(mat, a, c2, b, na, nc, nb);
        if (i < rings - 1) this.triangleN(mat, a, d, c2, na, nd, nc);
      }
  }

  /** Хоёр цэгийн хоорондох нарийссан хоолой (мөч, хүзүү, сүүл) — гөлгөр */
  tube(mat: string, p0: V3, p1: V3, r0: number, r1: number, segs = 12): void {
    const d: V3 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
    const L = Math.hypot(...d) || 1;
    const ax: V3 = [d[0] / L, d[1] / L, d[2] / L];
    const ref: V3 = Math.abs(ax[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const u = cross(ax, ref), ul = Math.hypot(...u) || 1;
    const U: V3 = [u[0] / ul, u[1] / ul, u[2] / ul];
    const V = cross(ax, U);
    const ring = (p: V3, r: number, k: number): [V3, V3] => {
      const a = (k / segs) * Math.PI * 2;
      const n: V3 = [U[0] * Math.cos(a) + V[0] * Math.sin(a), U[1] * Math.cos(a) + V[1] * Math.sin(a), U[2] * Math.cos(a) + V[2] * Math.sin(a)];
      return [[p[0] + n[0] * r, p[1] + n[1] * r, p[2] + n[2] * r], n];
    };
    for (let k = 0; k < segs; k++) {
      const [a, na] = ring(p0, r0, k), [b, nb] = ring(p0, r0, k + 1), [c, nc] = ring(p1, r1, k + 1), [d2, nd] = ring(p1, r1, k);
      this.triangleN(mat, a, b, c, na, nb, nc);
      this.triangleN(mat, a, c, d2, na, nc, nd);
    }
    // төгсгөлийн таг
    for (let k = 0; k < segs; k++) {
      const [b] = ring(p1, r1, k), [c] = ring(p1, r1, k + 1);
      this.triangle(mat, p1, b, c);
      const [b0] = ring(p0, r0, k), [c0] = ring(p0, r0, k + 1);
      this.triangle(mat, p0, c0, b0);
    }
  }

  /**
   * Профиль чирэлт: (v, z) профилийг u тэнхлэгийн дагуу u0→u1 чирнэ (карниз, молдинг, хөвөө).
   * dir — u чиглэл, out — v чиглэл (хавтгай дээр), origin — (u=0, v=0) цэг.
   */
  sweep(mat: string, origin: [number, number], dir: [number, number], out: [number, number], u0: number, u1: number, profile: [number, number][], closed = true): void {
    const P = (u: number, v: number, z: number): V3 => [origin[0] + dir[0] * u + out[0] * v, origin[1] + dir[1] * u + out[1] * v, z];
    const pr = closed ? [...profile, profile[0]!] : profile;
    for (let i = 0; i < pr.length - 1; i++) {
      const [v0, z0] = pr[i]!, [v1, z1] = pr[i + 1]!;
      this.quad(mat, P(u0, v0, z0), P(u1, v0, z0), P(u1, v1, z1), P(u0, v1, z1));
    }
    if (closed) {
      // төгсгөлүүд (earcut-гүй: профиль гүдгэр гэж үзэж fan)
      for (let i = 1; i < profile.length - 1; i++) {
        const [va, za] = profile[0]!, [vb, zb] = profile[i]!, [vc, zc] = profile[i + 1]!;
        this.triangle(mat, P(u0, va, za), P(u0, vc, zc), P(u0, vb, zb));
        this.triangle(mat, P(u1, va, za), P(u1, vb, zb), P(u1, vc, zc));
      }
    }
  }

  quad(mat: string, a: V3, b: V3, c: V3, d: V3): void {
    this.triangle(mat, a, b, c);
    this.triangle(mat, a, c, d);
  }

  /** Тэнхлэгт зэрэгцсэн (эсвэл z-ээр эргүүлсэн) хайрцаг. cx,cy — суурийн төв; z0 — суурийн өндөр. */
  box(mat: string, cx: number, cy: number, z0: number, sx: number, sy: number, h: number, rotZ = 0): void {
    const c = Math.cos(rotZ);
    const s = Math.sin(rotZ);
    const pt = (dx: number, dy: number, z: number): V3 => [cx + dx * c - dy * s, cy + dx * s + dy * c, z];
    const hx = sx / 2;
    const hy = sy / 2;
    const z1 = z0 + h;
    const p000 = pt(-hx, -hy, z0), p100 = pt(hx, -hy, z0), p110 = pt(hx, hy, z0), p010 = pt(-hx, hy, z0);
    const p001 = pt(-hx, -hy, z1), p101 = pt(hx, -hy, z1), p111 = pt(hx, hy, z1), p011 = pt(-hx, hy, z1);
    this.quad(mat, p001, p101, p111, p011); // дээд
    this.quad(mat, p000, p010, p110, p100); // доод
    this.quad(mat, p000, p100, p101, p001); // урд (−y)
    this.quad(mat, p100, p110, p111, p101); // зүүн (+x)
    this.quad(mat, p110, p010, p011, p111); // ар (+y)
    this.quad(mat, p010, p000, p001, p011); // баруун (−x)
  }

  cylinder(mat: string, cx: number, cy: number, z0: number, r: number, h: number, segments = 16, rTop = r): void {
    const z1 = z0 + h;
    for (let i = 0; i < segments; i++) {
      const a0 = (i / segments) * Math.PI * 2;
      const a1 = ((i + 1) / segments) * Math.PI * 2;
      const b0: V3 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0), z0];
      const b1: V3 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1), z0];
      const t0: V3 = [cx + rTop * Math.cos(a0), cy + rTop * Math.sin(a0), z1];
      const t1: V3 = [cx + rTop * Math.cos(a1), cy + rTop * Math.sin(a1), z1];
      this.quad(mat, b0, b1, t1, t0);
      this.triangle(mat, [cx, cy, z1], t0, t1);
      this.triangle(mat, [cx, cy, z0], b1, b0);
    }
  }

  /** Полигон (гадна цагираг + нүхнүүд) экструз: хана + дээд/доод тал. Цагираг хаагдаагүй (эхний цэг давтагдахгүй) байж болно. */
  extrude(wallMat: string, topMat: string, rings: [number, number][][], z0: number, h: number): void {
    const clean = rings.map((r) => {
      const out = r.slice();
      const f = out[0]!;
      const l = out[out.length - 1]!;
      if (f[0] === l[0] && f[1] === l[1]) out.pop();
      return out;
    });
    // хана: гадна цагирагийн хана гадагш, нүхний (хашааны) хана хашаа руу харна
    for (let r = 0; r < clean.length; r++) {
      const ring = clean[r]!;
      const ccw = r === 0 ? signedArea(ring) > 0 : signedArea(ring) < 0;
      for (let i = 0; i < ring.length; i++) {
        const a = ring[i]!;
        const b = ring[(i + 1) % ring.length]!;
        const [p, q] = ccw ? [a, b] : [b, a];
        this.quad(wallMat, [p[0], p[1], z0], [q[0], q[1], z0], [q[0], q[1], z0 + h], [p[0], p[1], z0 + h]);
      }
    }
    // дээд, доод тал (earcut)
    const flat: number[] = [];
    const holes: number[] = [];
    for (let r = 0; r < clean.length; r++) {
      if (r > 0) holes.push(flat.length / 2);
      for (const [x, y] of clean[r]!) flat.push(x, y);
    }
    const tri = earcut(flat, holes.length ? holes : null, 2);
    const v = (i: number, z: number): V3 => [flat[i * 2]!, flat[i * 2 + 1]!, z];
    for (let i = 0; i < tri.length; i += 3) {
      const [a, b, c] = [tri[i]!, tri[i + 1]!, tri[i + 2]!];
      const top = [v(a, z0 + h), v(b, z0 + h), v(c, z0 + h)] as [V3, V3, V3];
      // нормал дээш байх ёстой
      if (normal(...top)[2] < 0) this.triangle(topMat, top[2], top[1], top[0]);
      else this.triangle(topMat, top[0], top[1], top[2]);
      const bot = [v(a, z0), v(b, z0), v(c, z0)] as [V3, V3, V3];
      if (normal(...bot)[2] > 0) this.triangle(wallMat, bot[2], bot[1], bot[0]);
      else this.triangle(wallMat, bot[0], bot[1], bot[2]);
    }
  }

  stats(): { triangles: number; vertices: number; materials: number } {
    let t = 0, v = 0;
    for (const p of this.prims.values()) {
      t += p.indices.length / 3;
      v += p.vertexCount;
    }
    return { triangles: t, vertices: v, materials: this.materials.length };
  }

  /** GLB (binary glTF) */
  toGLB(name = 'model'): Uint8Array {
    const bufferViews: unknown[] = [];
    const accessors: unknown[] = [];
    const primitives: unknown[] = [];
    const chunks: Uint8Array[] = [];
    let offset = 0;
    const pushView = (bytes: Uint8Array, target: number): number => {
      const pad = (4 - (bytes.length % 4)) % 4;
      const padded = pad ? concat([bytes, new Uint8Array(pad)]) : bytes;
      bufferViews.push({ buffer: 0, byteOffset: offset, byteLength: bytes.length, ...(target ? { target } : {}) });
      chunks.push(padded);
      offset += padded.length;
      return bufferViews.length - 1;
    };
    const images: unknown[] = [];
    const textures: unknown[] = [];
    const textureIndex = new Map<string, number>();
    for (const m of this.materials) {
      if (!m.texture) continue;
      const iv = pushView(m.texture.png, 0);
      images.push({ bufferView: iv, mimeType: 'image/png', name: m.name });
      textures.push({ source: images.length - 1, sampler: 0 });
      textureIndex.set(m.name, textures.length - 1);
    }
    for (const [matName, p] of this.prims) {
      if (p.indices.length === 0) continue;
      // Орой нэгтгэх (ижил байрлал+нормал+uv → нэг орой): файлын хэмжээ 3–5 дахин багасна
      const key2idx = new Map<string, number>();
      const posA: number[] = [], norA: number[] = [], uvA: number[] = [];
      const idxA: number[] = [];
      const q = (v: number) => Math.round(v * 1000) / 1000;
      for (const vi of p.indices) {
        const x = p.positions[vi * 3]!, y = p.positions[vi * 3 + 1]!, z = p.positions[vi * 3 + 2]!;
        const nx = p.normals[vi * 3]!, ny = p.normals[vi * 3 + 1]!, nz = p.normals[vi * 3 + 2]!;
        const u = p.uvs[vi * 2]!, w = p.uvs[vi * 2 + 1]!;
        const key = `${q(x)},${q(y)},${q(z)}|${q(nx)},${q(ny)},${q(nz)}|${q(u)},${q(w)}`;
        let id = key2idx.get(key);
        if (id === undefined) {
          id = posA.length / 3;
          key2idx.set(key, id);
          // glTF y-up: (x, y, z) → (x, z, −y)
          posA.push(x, z, -y);
          norA.push(nx, nz, -ny);
          uvA.push(u, w);
        }
        idxA.push(id);
      }
      const pos = new Float32Array(posA);
      const nor = new Float32Array(norA);
      const uv = new Float32Array(uvA);
      const vcount = posA.length / 3;
      const min = [Infinity, Infinity, Infinity];
      const max = [-Infinity, -Infinity, -Infinity];
      for (let i = 0; i < pos.length; i += 3)
        for (let k = 0; k < 3; k++) {
          min[k] = Math.min(min[k]!, pos[i + k]!);
          max[k] = Math.max(max[k]!, pos[i + k]!);
        }
      const use16 = vcount < 65535;
      const idx = use16 ? new Uint16Array(idxA) : new Uint32Array(idxA);
      const pv = pushView(new Uint8Array(pos.buffer), 34962);
      const nv = pushView(new Uint8Array(nor.buffer), 34962);
      const uvv = pushView(new Uint8Array(uv.buffer), 34962);
      const iv = pushView(new Uint8Array(idx.buffer), 34963);
      accessors.push({ bufferView: pv, componentType: 5126, count: vcount, type: 'VEC3', min, max });
      accessors.push({ bufferView: nv, componentType: 5126, count: vcount, type: 'VEC3' });
      accessors.push({ bufferView: uvv, componentType: 5126, count: vcount, type: 'VEC2' });
      accessors.push({ bufferView: iv, componentType: use16 ? 5123 : 5125, count: idx.length, type: 'SCALAR' });
      const a = accessors.length;
      primitives.push({ attributes: { POSITION: a - 4, NORMAL: a - 3, TEXCOORD_0: a - 2 }, indices: a - 1, material: this.materials.findIndex((m) => m.name === matName), mode: 4 });
    }
    const bin = concat(chunks);
    const json = {
      asset: { version: '2.0', generator: '@metacity/tiles gltf' },
      scene: 0,
      scenes: [{ nodes: [0] }],
      nodes: [{ mesh: 0, name }],
      meshes: [{ name, primitives }],
      materials: this.materials.map((m) => ({
        name: m.name,
        pbrMetallicRoughness: {
          baseColorFactor: [m.color[0], m.color[1], m.color[2], m.color[3] ?? 1],
          metallicFactor: m.metallic ?? 0,
          roughnessFactor: m.roughness ?? 0.85,
          ...(textureIndex.has(m.name) ? { baseColorTexture: { index: textureIndex.get(m.name), texCoord: 0 } } : {}),
        },
        ...(m.color[3] !== undefined && m.color[3] < 1 ? { alphaMode: 'BLEND' } : {}),
        doubleSided: false,
      })),
      ...(images.length ? { images, textures, samplers: [{ magFilter: 9729, minFilter: 9987, wrapS: 10497, wrapT: 10497 }] } : {}),
      buffers: [{ byteLength: bin.length }],
      bufferViews,
      accessors,
    };
    let jsonBytes: Uint8Array = new TextEncoder().encode(JSON.stringify(json));
    const jpad = (4 - (jsonBytes.length % 4)) % 4;
    if (jpad) jsonBytes = concat([jsonBytes, new Uint8Array(jpad).fill(0x20)]);
    const total = 12 + 8 + jsonBytes.length + 8 + bin.length;
    const out = new Uint8Array(total);
    const dv = new DataView(out.buffer);
    dv.setUint32(0, 0x46546c67, true); // glTF
    dv.setUint32(4, 2, true);
    dv.setUint32(8, total, true);
    dv.setUint32(12, jsonBytes.length, true);
    dv.setUint32(16, 0x4e4f534a, true); // JSON
    out.set(jsonBytes, 20);
    const binOff = 20 + jsonBytes.length;
    dv.setUint32(binOff, bin.length, true);
    dv.setUint32(binOff + 4, 0x004e4942, true); // BIN
    out.set(bin, binOff + 8);
    return out;
  }
}

function cross(a: V3, b: V3): V3 {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

function normal(a: V3, b: V3, c: V3): V3 {
  const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
  const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
  const n: V3 = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
  const l = Math.hypot(n[0], n[1], n[2]) || 1;
  return [n[0] / l, n[1] / l, n[2] / l];
}

export function signedArea(ring: [number, number][]): number {
  let s = 0;
  for (let i = 0; i < ring.length; i++) {
    const a = ring[i]!;
    const b = ring[(i + 1) % ring.length]!;
    s += a[0] * b[1] - b[0] * a[1];
  }
  return s / 2;
}

function concat(chunks: Uint8Array[]): Uint8Array {
  let n = 0;
  for (const c of chunks) n += c.length;
  const out = new Uint8Array(n);
  let p = 0;
  for (const c of chunks) {
    out.set(c, p);
    p += c.length;
  }
  return out;
}
