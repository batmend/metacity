import type { LandmarkModel } from '@metacity/schema';

let registry: Promise<LandmarkModel[]> | null = null;

/** models/registry.json — нарийвчилсан 3D загвартай барилгуудын бүртгэл */
export function loadLandmarks(): Promise<LandmarkModel[]> {
  registry ??= fetch(`${import.meta.env.BASE_URL}models/registry.json`)
    .then((r) => (r.ok ? (r.json() as Promise<LandmarkModel[]>) : []))
    .catch(() => []);
  return registry;
}

export async function findLandmark(buildingId: number | undefined): Promise<LandmarkModel | null> {
  if (buildingId === undefined) return null;
  const list = await loadLandmarks();
  return list.find((l) => l.buildingIds.includes(buildingId)) ?? null;
}
