import { dungeonLayout, onFloor, pathClear, type Rect } from './dungeon';
import { segmentHitsRect, inWall, townLayout, townPathClear } from './town';
import { placeLayout } from './places';
import type { Region } from './types';

/** Duvarlı bir savaş alanının kuralları: nereye basılır, nereden geçilir, savaşçılar nereye dizilir. */
export interface Barrier {
  stand: (p: { x: number; y: number }) => boolean;
  clear: (a: { x: number; y: number }, b: { x: number; y: number }) => boolean;
  /** Savaşçıların dizileceği açık alanlar, soldan sağa; boşsa jetonlar kendi yerinde kalır. */
  areas: Rect[];
}

/** Karanlık yeraltı mekânları: DM seçince alan kendiliğinden karanlık olur. */
export const DARK_PLACES: readonly Region[] = ['dungeon', 'cavern', 'sewer', 'mine'];
const FLOORED: readonly Region[] = ['dungeon', 'cavern', 'sewer', 'mine'];

/** Duvarı, çiti, suyu ya da zemin sınırı olan araziler duvarlıdır; öbürleri (null) serbesttir. */
export function barrier(terrain: Region | null, seed: number, aspect: number): Barrier | null {
  if (terrain && FLOORED.includes(terrain)) {
    const layout = dungeonLayout(seed, aspect);
    return { stand: (p) => onFloor(layout, p, aspect), clear: (a, b) => pathClear(layout, a, b, aspect), areas: layout.rooms };
  }
  if (terrain === 'town' || terrain === 'city') {
    const layout = townLayout(seed, aspect, terrain);
    return { stand: (p) => !inWall(layout, p, aspect), clear: (a, b) => townPathClear(layout, a, b, aspect), areas: layout.areas };
  }
  const place = placeLayout(terrain, seed, aspect);
  if (!place || (place.walls.length === 0 && !place.floors)) return null;
  const { floors, walls } = place;
  const inside = (p: { x: number; y: number }, rects: Rect[]): boolean => {
    const y = p.y * aspect;
    return rects.some((w) => p.x >= w.x && p.x <= w.x + w.w && y >= w.y && y <= w.y + w.h);
  };
  const stand = (p: { x: number; y: number }): boolean => (!floors || inside(p, floors)) && !inside(p, walls);
  const clear = (a: { x: number; y: number }, b: { x: number; y: number }): boolean => {
    const from = { x: a.x, y: a.y * aspect };
    const to = { x: b.x, y: b.y * aspect };
    if (walls.some((w) => segmentHitsRect(from, to, w))) return false;
    if (!floors) return true;
    const steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 0.01));
    for (let i = 1; i <= steps; i += 1) {
      const t = i / steps;
      if (!inside({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, floors)) return false;
    }
    return true;
  };
  return { stand, clear, areas: place.areas };
}
