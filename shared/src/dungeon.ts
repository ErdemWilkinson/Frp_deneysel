import { seeded } from './terrain';

/** Konumlar alanın enine göre ölçülür: x 0–1, y 0–aspect. Boyutlar da aynı birimdedir. */
export interface Rect { x: number; y: number; w: number; h: number }
export interface DungeonLayout { rooms: Rect[]; corridors: Rect[] }

const CORRIDOR = 0.06;
const MARGIN = 0.05;

const touches = (a: Rect, b: Rect, pad: number): boolean =>
  a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;
const centre = (r: Rect): { x: number; y: number } => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
const inside = (r: Rect, x: number, y: number): boolean => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

/** Tohumdan hep aynı zindanı üretir: birkaç oda ve onları soldan sağa bağlayan dirsekli koridorlar. */
export function dungeonLayout(seed: number, aspect: number): DungeonLayout {
  const r = seeded((seed ^ 0x51ed270b) >>> 0);
  const height = Math.max(0.25, aspect);
  const rooms: Rect[] = [];
  for (let tries = 0; tries < 300 && rooms.length < 6; tries += 1) {
    const w = 0.12 + r() * 0.14;
    const h = Math.min(0.11 + r() * 0.13, height * 0.42);
    const candidate: Rect = { w, h, x: 0.04 + r() * (0.92 - w), y: 0.04 + r() * Math.max(0.01, height - 0.08 - h) };
    if (!rooms.some((other) => touches(candidate, other, MARGIN))) rooms.push(candidate);
  }
  if (rooms.length < 2) {
    rooms.length = 0;
    rooms.push({ x: 0.06, y: height * 0.3, w: 0.28, h: height * 0.4 }, { x: 0.62, y: height * 0.3, w: 0.3, h: height * 0.4 });
  }
  rooms.sort((a, b) => a.x - b.x);
  const corridors: Rect[] = [];
  for (let i = 0; i + 1 < rooms.length; i += 1) {
    const a = centre(rooms[i]!);
    const b = centre(rooms[i + 1]!);
    corridors.push({ x: Math.min(a.x, b.x) - CORRIDOR / 2, y: a.y - CORRIDOR / 2, w: Math.abs(a.x - b.x) + CORRIDOR, h: CORRIDOR });
    corridors.push({ x: b.x - CORRIDOR / 2, y: Math.min(a.y, b.y) - CORRIDOR / 2, w: CORRIDOR, h: Math.abs(a.y - b.y) + CORRIDOR });
  }
  return { rooms, corridors };
}

/** Konum (alanın enine ve boyuna oranla) zemin mi, yoksa duvarın içinde mi? */
export function onFloor(layout: DungeonLayout, p: { x: number; y: number }, aspect: number): boolean {
  const y = p.y * aspect;
  return layout.rooms.some((r) => inside(r, p.x, y)) || layout.corridors.some((r) => inside(r, p.x, y));
}

/** İki konum arasında düz bir çizgi duvara çarpmadan çizilebilir mi? */
export function pathClear(layout: DungeonLayout, a: { x: number; y: number }, b: { x: number; y: number }, aspect: number): boolean {
  const length = Math.hypot(b.x - a.x, (b.y - a.y) * aspect);
  const steps = Math.max(1, Math.ceil(length / 0.01));
  for (let i = 1; i <= steps; i += 1) {
    const t = i / steps;
    if (!onFloor(layout, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, aspect)) return false;
  }
  return true;
}

/** Bir odada, n jetona yetecek kadar serpiştirilmiş konumlar (alana oranla). */
export function spread(room: Rect, n: number, aspect: number): { x: number; y: number }[] {
  const columns = Math.max(1, Math.ceil(Math.sqrt((n * room.w) / Math.max(room.h, 0.01))));
  const rows = Math.max(1, Math.ceil(n / columns));
  return Array.from({ length: n }, (_, i) => {
    const col = i % columns;
    const row = Math.floor(i / columns);
    const x = room.x + room.w * ((col + 1) / (columns + 1));
    const y = room.y + room.h * ((row + 1) / (rows + 1));
    return { x: Math.round(x * 1000) / 1000, y: Math.round((y / aspect) * 1000) / 1000 };
  });
}
