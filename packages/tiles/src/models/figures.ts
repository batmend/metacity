/**
 * Хөшөөний дүрсүүд — эллипсоид, нарийссан хоолой, тойруулалтаар (гөлгөр нормал).
 * Координат: (u, v, z) — u фасад дагуу, v урагш, z дээш; W функц дэлхийн координат руу хөрвүүлнэ.
 */
import type { GltfBuilder } from './gltf.js';

type V3 = [number, number, number];
export type Frame = { W: (u: number, v: number, z: number) => V3; ang: number };

/** Морь + морьтон (хүрэл). c = тавцангийн төв (u,v), z0 = тавцангийн дээд, facing = +1 зүүн тийш, −1 баруун тийш харна */
export function equestrian(g: GltfBuilder, mat: string, fr: Frame, u: number, v: number, z0: number, facing: 1 | -1, s = 1): void {
  const W = (du: number, dv: number, dz: number): V3 => fr.W(u + du * facing * s, v + dv * s, z0 + dz * s);
  const rot = fr.ang + (facing === 1 ? 0 : Math.PI);
  // их бие (цээж илүү бүдүүн), ар бие
  g.ellipsoid(mat, W(0.2, 0, 2.55), 1.45 * s, 0.62 * s, 0.68 * s, rot, 0, 20, 12);
  g.ellipsoid(mat, W(1.0, 0, 2.6), 0.75 * s, 0.6 * s, 0.66 * s, rot, 0, 16, 10); // цээж
  g.ellipsoid(mat, W(-1.05, 0, 2.6), 0.7 * s, 0.6 * s, 0.62 * s, rot, 0, 16, 10); // гуя
  // хүзүү (цээжнээс дээш урагш), толгой
  g.tube(mat, W(1.35, 0, 2.95), W(2.35, 0, 3.95), 0.36 * s, 0.26 * s, 14);
  g.ellipsoid(mat, W(2.75, 0, 4.0), 0.62 * s, 0.24 * s, 0.3 * s, rot, -0.55, 14, 8); // толгой (доош налуу)
  g.tube(mat, W(2.3, 0.12, 4.25), W(2.45, 0.2, 4.6), 0.07 * s, 0.03 * s, 6); // чих
  g.tube(mat, W(2.3, -0.12, 4.25), W(2.45, -0.2, 4.6), 0.07 * s, 0.03 * s, 6);
  // дэл
  g.tube(mat, W(1.4, 0, 3.3), W(2.2, 0, 4.2), 0.16 * s, 0.1 * s, 8);
  // хөл: урд 2 (нэг нь өргөгдсөн), хойд 2
  const leg = (du: number, dv: number, lift: number) => {
    const hip = W(du, dv, 2.3);
    const knee = W(du + lift * 0.5, dv, 1.35 + lift * 0.5);
    const hoof = W(du + lift * 0.9, dv, 0.05 + lift * 0.6);
    g.tube(mat, hip, knee, 0.2 * s, 0.13 * s, 10);
    g.tube(mat, knee, hoof, 0.12 * s, 0.1 * s, 10);
    g.ellipsoid(mat, hoof, 0.14 * s, 0.12 * s, 0.09 * s, rot, 0, 8, 5);
  };
  leg(1.05, 0.3, 0);
  leg(1.05, -0.3, 0.9); // урд зүүн хөл өргөсөн
  leg(-1.05, 0.3, 0);
  leg(-1.05, -0.3, 0);
  // сүүл
  g.tube(mat, W(-1.7, 0, 2.7), W(-2.3, 0.05, 1.3), 0.14 * s, 0.05 * s, 8);
  // морьтон: хөл (морины хажуугаар), их бие, мөр, гар, толгой, малгай
  for (const side of [0.5, -0.5]) {
    g.tube(mat, W(0.15, side * 0.9, 3.1), W(0.45, side * 1.05, 2.2), 0.14 * s, 0.1 * s, 8);
    g.tube(mat, W(0.45, side * 1.05, 2.2), W(0.75, side * 1.0, 1.7), 0.09 * s, 0.07 * s, 8);
  }
  g.ellipsoid(mat, W(0.1, 0, 3.75), 0.42 * s, 0.5 * s, 0.7 * s, rot, 0, 14, 10); // их бие (дээл)
  g.ellipsoid(mat, W(0.05, 0, 4.35), 0.3 * s, 0.6 * s, 0.22 * s, rot, 0, 12, 8); // мөр
  g.tube(mat, W(0.1, 0.55, 4.3), W(0.9, 0.5, 3.9), 0.11 * s, 0.08 * s, 8); // баруун гар — жолоо руу
  g.tube(mat, W(0.1, -0.55, 4.3), W(0.4, -0.75, 3.7), 0.11 * s, 0.08 * s, 8); // зүүн гар
  g.ellipsoid(mat, W(0.08, 0, 4.85), 0.21 * s, 0.2 * s, 0.26 * s, rot, 0, 12, 8); // толгой
  g.lathe(mat, ...xy(W(0.08, 0, 5.02)), W(0, 0, 5.02)[2], [[0, 0], [0.34 * s, 0], [0.3 * s, 0.06 * s], [0.2 * s, 0.28 * s], [0.06 * s, 0.42 * s], [0, 0.46 * s]], 14); // малгай
}

/** Суугаа дүрс (сэнтий дээр) — хаад. facing: урагш (талбай руу) харна. */
export function seatedFigure(g: GltfBuilder, mat: string, fr: Frame, u: number, v: number, z0: number, s = 1): void {
  const W = (du: number, dv: number, dz: number): V3 => fr.W(u + du * s, v + dv * s, z0 + dz * s);
  const rot = fr.ang;
  // сэнтий: суудал, түшлэг, гарын түшлэг
  g.box(mat, ...xy(W(0, -0.5, 0)), z0, 3.0 * s, 1.6 * s, 1.1 * s, rot);
  g.box(mat, ...xy(W(0, -1.15, 0)), z0, 3.0 * s, 0.35 * s, 3.4 * s, rot);
  for (const side of [-1.3, 1.3]) g.box(mat, ...xy(W(side, -0.45, 0)), z0 + 1.1 * s, 0.35 * s, 1.5 * s, 0.7 * s, rot);
  // хөл: гуя урагш, шилбэ доош, гутал
  for (const side of [-0.45, 0.45]) {
    g.tube(mat, W(side, -0.6, 1.35), W(side, 0.55, 1.3), 0.27 * s, 0.22 * s, 10);
    g.tube(mat, W(side, 0.6, 1.25), W(side, 0.7, 0.12), 0.2 * s, 0.16 * s, 10);
    g.ellipsoid(mat, W(side, 0.95, 0.12), 0.42 * s, 0.2 * s, 0.14 * s, rot, 0, 8, 5);
  }
  // их бие (дээл), мөр, гар — өвдөг дээр
  g.ellipsoid(mat, W(0, -0.6, 2.15), 0.78 * s, 0.6 * s, 1.0 * s, rot, 0, 16, 10);
  g.ellipsoid(mat, W(0, -0.6, 2.95), 1.05 * s, 0.5 * s, 0.32 * s, rot, 0, 14, 8);
  for (const side of [-0.95, 0.95]) {
    g.tube(mat, W(side, -0.55, 2.9), W(side, -0.1, 1.9), 0.17 * s, 0.14 * s, 8);
    g.tube(mat, W(side, -0.1, 1.9), W(side * 0.55, 0.55, 1.55), 0.13 * s, 0.1 * s, 8);
  }
  // хүзүү, толгой, малгай
  g.tube(mat, W(0, -0.55, 3.1), W(0, -0.5, 3.45), 0.2 * s, 0.18 * s, 8);
  g.ellipsoid(mat, W(0, -0.5, 3.75), 0.32 * s, 0.3 * s, 0.38 * s, rot, 0, 14, 10);
  g.lathe(mat, ...xy(W(0, -0.5, 4.0)), W(0, 0, 4.0)[2], [[0, 0], [0.5 * s, 0], [0.42 * s, 0.1 * s], [0.3 * s, 0.4 * s], [0.08 * s, 0.6 * s], [0, 0.64 * s]], 16);
}

function xy(p: V3): [number, number] {
  return [p[0], p[1]];
}
