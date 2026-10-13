import { seeded } from './terrain';
import type { Rect } from './dungeon';

export type TownKind = 'town' | 'city';

export interface Building {
  /** Dış sınır (duvarlar dahil). */
  rect: Rect;
  /** İç odalar: duvarlar çıkarıldıktan sonra kalan zemin parçaları. */
  rooms: Rect[];
}
export interface TownLayout {
  kind: TownKind;
  /** Sokaklarla çevrili arsalar: yapılar ve bahçeler bunların içindedir. */
  plots: Rect[];
  buildings: Building[];
  /** Geçilemeyen ince duvarlar (dış duvarlar ve oda araları); kapı boşlukları dışında kalanlar. */
  walls: Rect[];
  /** Kapı boşlukları: yalnızca çizim içindir, geçilebilirdir. */
  doors: Rect[];
  /** Savaşçıların dizileceği açık sokak parçaları, soldan sağa. */
  areas: Rect[];
}

/** Duvar kalınlığı ve kapı genişliği (alanın eni = 1). */
export const WALL = 0.007;
const DOOR = 0.04;
const INNER_DOOR = 0.035;

/** Düz doğru parçası bir dikdörtgene değiyor mu? (Liang–Barsky) */
export function segmentHitsRect(a: { x: number; y: number }, b: { x: number; y: number }, r: Rect): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const p = [-dx, dx, -dy, dy];
  const q = [a.x - r.x, r.x + r.w - a.x, a.y - r.y, r.y + r.h - a.y];
  for (let i = 0; i < 4; i += 1) {
    if (p[i] === 0) {
      if (q[i]! < 0) return false;
    } else {
      const t = q[i]! / p[i]!;
      if (p[i]! < 0) {
        if (t > t1) return false;
        if (t > t0) t0 = t;
      } else {
        if (t < t0) return false;
        if (t < t1) t1 = t;
      }
    }
  }
  return true;
}

const pick = (r: () => number, min: number, max: number): number => min + r() * (max - min);

/** Bir kenarı kapı boşluğuyla bölünmüş duvar şeridi. `at` boşluğun şerit boyunca konumu (0–1). */
export function strip(horizontal: boolean, x: number, y: number, length: number, thickness: number, gap: number, at: number): { walls: Rect[]; door: Rect } {
  const start = (length - gap) * Math.max(0, Math.min(1, at));
  const piece = (from: number, to: number): Rect => (horizontal
    ? { x: x + from, y, w: to - from, h: thickness }
    : { x, y: y + from, w: thickness, h: to - from });
  const door: Rect = horizontal ? { x: x + start, y, w: gap, h: thickness } : { x, y: y + start, w: thickness, h: gap };
  const walls = [piece(0, start), piece(start + gap, length)].filter((w) => w.w > 1e-6 && w.h > 1e-6);
  return { walls, door };
}

/** Odayı, kapılı bir duvarla ikiye böler; büyük parçaları bir kez daha böler. */
function partition(room: Rect, depth: number, r: () => number): { rooms: Rect[]; walls: Rect[]; doors: Rect[] } {
  const vertical = room.w >= room.h;
  const size = vertical ? room.w : room.h;
  const across = vertical ? room.h : room.w;
  if (depth >= 2 || size < 0.15 || across < INNER_DOOR + 0.03 || r() < 0.15) return { rooms: [room], walls: [], doors: [] };
  const t = pick(r, 0.4, 0.6);
  const cut = size * t;
  const first: Rect = vertical ? { ...room, w: cut - WALL / 2 } : { ...room, h: cut - WALL / 2 };
  const second: Rect = vertical
    ? { x: room.x + cut + WALL / 2, y: room.y, w: room.w - cut - WALL / 2, h: room.h }
    : { x: room.x, y: room.y + cut + WALL / 2, w: room.w, h: room.h - cut - WALL / 2 };
  const wall = vertical
    ? strip(false, room.x + cut - WALL / 2, room.y, room.h, WALL, INNER_DOOR, r())
    : strip(true, room.x, room.y + cut - WALL / 2, room.w, WALL, INNER_DOOR, r());
  const a = partition(first, depth + 1, r);
  const b = partition(second, depth + 1, r);
  return { rooms: [...a.rooms, ...b.rooms], walls: [...wall.walls, ...a.walls, ...b.walls], doors: [wall.door, ...a.doors, ...b.doors] };
}

/** Bir yapının dış duvarları (bir kenarında kapı), iç odaları ve iç duvarları. */
export function house(rect: Rect, doorSide: 0 | 1 | 2 | 3, r: () => number): { building: Building; walls: Rect[]; doors: Rect[] } {
  const { x, y, w, h } = rect;
  const sides = [
    { horizontal: true, x, y, length: w },
    { horizontal: true, x, y: y + h - WALL, length: w },
    { horizontal: false, x, y, length: h },
    { horizontal: false, x: x + w - WALL, y, length: h },
  ];
  const walls: Rect[] = [];
  const doors: Rect[] = [];
  sides.forEach((s, i) => {
    const made = strip(s.horizontal, s.x, s.y, s.length, WALL, i === doorSide ? DOOR : 0, pick(r, 0.15, 0.85));
    walls.push(...made.walls);
    if (i === doorSide) doors.push(made.door);
  });
  const inner: Rect = { x: x + WALL, y: y + WALL, w: w - WALL * 2, h: h - WALL * 2 };
  const inside = partition(inner, 0, r);
  return { building: { rect, rooms: inside.rooms }, walls: [...walls, ...inside.walls], doors: [...doors, ...inside.doors] };
}

const MIN_HOUSE = 0.075;

/** Şehir blokları: arsa, kendi kenarına yaslı bitişik yapılara bölünür; kapılar sokağa bakar. */
function carve(plot: Rect, depth: number, r: () => number): Rect[] {
  const long = Math.max(plot.w, plot.h);
  if (depth >= 2 || long < MIN_HOUSE * 2.2 || (depth > 0 && r() < 0.3)) return [plot];
  const t = pick(r, 0.4, 0.6);
  const vertical = plot.w >= plot.h;
  const a: Rect = vertical ? { ...plot, w: plot.w * t } : { ...plot, h: plot.h * t };
  const b: Rect = vertical ? { ...plot, x: plot.x + plot.w * t, w: plot.w * (1 - t) } : { ...plot, y: plot.y + plot.h * t, h: plot.h * (1 - t) };
  return [...carve(a, depth + 1, r), ...carve(b, depth + 1, r)];
}

/** Tohumdan hep aynı kasabayı ya da şehri üretir: sokaklar, arsalar, odalı yapılar ve duvarlar. */
export function townLayout(seed: number, aspect: number, kind: TownKind): TownLayout {
  const r = seeded((seed ^ (kind === 'city' ? 0x2c1b3c6d : 0x1b873593)) >>> 0);
  const height = Math.max(0.25, aspect);
  const margin = 0.035;
  const cols = kind === 'city' ? 4 : 3;
  const rows = kind === 'city' ? Math.max(3, Math.round(cols * height)) : Math.max(2, Math.round(cols * height * 0.9));
  const street = kind === 'city' ? 0.035 : 0.07;
  const avenue = kind === 'city' ? 0.06 : 0.09;
  const gapsX = Array.from({ length: cols - 1 }, (_, i) => (i === Math.floor((cols - 1) / 2) ? avenue : street));
  const gapsY = Array.from({ length: rows - 1 }, (_, i) => (i === Math.floor((rows - 1) / 2) ? avenue : street));
  const bw = (1 - margin * 2 - gapsX.reduce((a, b) => a + b, 0)) / cols;
  const bh = (height - margin * 2 - gapsY.reduce((a, b) => a + b, 0)) / rows;

  const plots: Rect[] = [];
  let y = margin;
  for (let row = 0; row < rows; row += 1) {
    let x = margin;
    for (let col = 0; col < cols; col += 1) {
      plots.push({ x, y, w: bw, h: bh });
      x += bw + (gapsX[col] ?? 0);
    }
    y += bh + (gapsY[row] ?? 0);
  }

  const buildings: Building[] = [];
  const walls: Rect[] = [];
  const doors: Rect[] = [];
  const add = (rect: Rect, side: 0 | 1 | 2 | 3) => {
    const built = house(rect, side, r);
    buildings.push(built.building);
    walls.push(...built.walls);
    doors.push(...built.doors);
  };
  for (const plot of plots) {
    if (kind === 'city') {
      for (const leaf of carve(plot, 0, r)) {
        const rect: Rect = { x: leaf.x + 0.004, y: leaf.y + 0.004, w: leaf.w - 0.008, h: leaf.h - 0.008 };
        if (rect.w < MIN_HOUSE || rect.h < MIN_HOUSE) continue;
        // Kapı, arsanın sokağa bakan kenarlarından birine açılır.
        const eps = 0.012;
        const facing: (0 | 1 | 2 | 3)[] = [];
        if (rect.y - plot.y < eps) facing.push(0);
        if (plot.y + plot.h - (rect.y + rect.h) < eps) facing.push(1);
        if (rect.x - plot.x < eps) facing.push(2);
        if (plot.x + plot.w - (rect.x + rect.w) < eps) facing.push(3);
        add(rect, facing[Math.floor(r() * facing.length)] ?? 1);
      }
    } else {
      const halves = plot.w >= plot.h
        ? [{ ...plot, w: plot.w / 2 }, { ...plot, x: plot.x + plot.w / 2, w: plot.w / 2 }]
        : [{ ...plot, h: plot.h / 2 }, { ...plot, y: plot.y + plot.h / 2, h: plot.h / 2 }];
      for (const half of r() < 0.5 ? [plot] : halves) {
        if (r() < 0.2) continue; // boş bahçe
        const padX = pick(r, 0.012, Math.max(0.013, half.w * 0.2));
        const padY = pick(r, 0.012, Math.max(0.013, half.h * 0.2));
        const rect: Rect = { x: half.x + padX, y: half.y + padY, w: half.w - padX * 2, h: half.h - padY * 2 };
        if (rect.w < MIN_HOUSE || rect.h < MIN_HOUSE) continue;
        add(rect, (Math.floor(r() * 4) as 0 | 1 | 2 | 3));
      }
    }
  }

  // Savaşçılar, ortadaki yatay caddenin iki ucuna dizilir.
  const mid = Math.floor((rows - 1) / 2);
  const gapY = margin + (mid + 1) * bh + gapsY.slice(0, mid).reduce((a, b) => a + b, 0);
  const gapH = gapsY[mid] ?? street;
  const areas: Rect[] = [
    { x: margin, y: gapY, w: 0.26, h: gapH },
    { x: 1 - margin - 0.26, y: gapY, w: 0.26, h: gapH },
  ];
  return { kind, plots, buildings, walls, doors, areas };
}

/** Konum (alanın enine ve boyuna oranla) bir duvarın içinde mi? */
export function inWall(layout: TownLayout, p: { x: number; y: number }, aspect: number): boolean {
  const y = p.y * aspect;
  return layout.walls.some((w) => p.x >= w.x && p.x <= w.x + w.w && y >= w.y && y <= w.y + w.h);
}

/** İki konum arasındaki düz yol bir duvara çarpmadan gidiyor mu? */
export function townPathClear(layout: TownLayout, a: { x: number; y: number }, b: { x: number; y: number }, aspect: number): boolean {
  const from = { x: a.x, y: a.y * aspect };
  const to = { x: b.x, y: b.y * aspect };
  return !layout.walls.some((w) => segmentHitsRect(from, to, w));
}
