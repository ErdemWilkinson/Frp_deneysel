import { seeded } from './terrain';
import type { Rect } from './dungeon';
import { WALL, house, strip } from './town';
import type { Region } from './types';

/** Çizimde kullanılan tek parça: dikdörtgen içine çizilen yapı ya da süs. Konumlar alanın enine göre ölçülür (y: 0–aspect). */
export interface Prop {
  type: string;
  x: number;
  y: number;
  w: number;
  h: number;
  /** Aynı türün görünüş çeşidi (0–2). */
  variant: number;
}
/** Kuşbakışı çizilen odalı yapı; duvarları ve kapıları kendi içindedir. */
export interface PlaceBuilding {
  rect: Rect;
  rooms: Rect[];
  walls: Rect[];
  doors: Rect[];
}
export interface PlaceLayout {
  /** Yalnızca buralara basılır (gemi güvertesi gibi); null ise duvar dışında her yer serbesttir. */
  floors: Rect[] | null;
  /** Geçilmez dikdörtgenler: duvar, çit, su, sütun, çadır, sandık. */
  walls: Rect[];
  buildings: PlaceBuilding[];
  props: Prop[];
  /** Savaşçıların dizileceği açık yerler, soldan sağa; boşsa jetonlar eski yerlerinde kalır. */
  areas: Rect[];
}

/** Bu araziler kendi yerleşimini çizer. Zindan benzeri üçü ve şehirler ayrı üretilir (dungeon.ts, town.ts). */
export const PLACE_TERRAINS = ['castle', 'ship', 'camp', 'graveyard', 'temple', 'farm', 'river', 'tavern', 'market'] as const;

const pick = (r: () => number, min: number, max: number): number => min + r() * (max - min);
const overlap = (a: Rect, b: Rect, pad = 0.012): boolean =>
  a.x - pad < b.x + b.w && a.x + a.w + pad > b.x && a.y - pad < b.y + b.h && a.y + a.h + pad > b.y;

class Builder {
  walls: Rect[] = [];
  buildings: PlaceBuilding[] = [];
  props: Prop[] = [];
  /** Yeni yerleşimlerin kaçınacağı dolu alanlar. */
  taken: Rect[] = [];
  constructor(readonly r: () => number, readonly height: number) {}

  /** Karakter ve yaratıkların dizileceği alanları ayırır; hiçbir şey bunların üstüne konmaz. */
  reserve(...areas: Rect[]): void { this.taken.push(...areas); }

  deco(type: string, rect: Rect, variant = Math.floor(this.r() * 3)): void {
    this.props.push({ type, ...rect, variant });
  }
  solid(type: string, rect: Rect, variant = Math.floor(this.r() * 3)): void {
    this.deco(type, rect, variant);
    this.walls.push(rect);
    this.taken.push(rect);
  }
  /** Odalı bir yapı: duvarlar ve kapı yerleşime eklenir. */
  building(rect: Rect, doorSide: 0 | 1 | 2 | 3, options: { minRooms?: number; open?: boolean } = {}): PlaceBuilding {
    let made = house(rect, doorSide, this.r);
    // Büyük salonlar tek oda kalmasın: bölünene kadar birkaç kez dener.
    for (let i = 0; i < 8 && made.building.rooms.length < (options.minRooms ?? 1); i += 1) made = house(rect, doorSide, this.r);
    const b: PlaceBuilding = { rect, rooms: made.building.rooms, walls: made.walls, doors: made.doors };
    this.buildings.push(b);
    this.walls.push(...made.walls);
    // `open`: içi mobilyaya ve savaşçılara ayrılır; yalnızca duvarlar dolu sayılır.
    if (options.open) this.taken.push(...made.walls); else this.taken.push(rect);
    return b;
  }
  /** Bir çit ya da duvar çerçevesi: dört kenar, her biri isteğe bağlı kapı boşluğuyla. */
  frame(rect: Rect, thickness: number, gaps: [number, number, number, number], type: string): void {
    const { x, y, w, h } = rect;
    const sides = [
      { horizontal: true, x, y, length: w },
      { horizontal: true, x, y: y + h - thickness, length: w },
      { horizontal: false, x, y, length: h },
      { horizontal: false, x: x + w - thickness, y, length: h },
    ];
    sides.forEach((s, i) => {
      const gap = gaps[i] ?? 0;
      const made = strip(s.horizontal, s.x, s.y, s.length, thickness, gap, gap > 0 ? 0.5 : 0);
      for (const piece of made.walls) {
        this.deco(type, piece, 0);
        this.walls.push(piece);
        this.taken.push(piece);
      }
    });
  }
  /** Serbest bir yer arar; bulamazsa null. `inside` sınırı verilmezse alanın ortadaki şeridi kullanılır. */
  free(w: number, h: number, inside?: Rect): Rect | null {
    const area = inside ?? { x: 0.06, y: this.height * 0.3, w: 0.88, h: this.height * 0.44 };
    for (let i = 0; i < 60; i += 1) {
      const rect: Rect = { x: area.x + this.r() * Math.max(0, area.w - w), y: area.y + this.r() * Math.max(0, area.h - h), w, h };
      if (!this.taken.some((t) => overlap(rect, t))) return rect;
    }
    return null;
  }
}

/** Ana arazilerin ortasına serpilen tek tük yapılar: kulübe, kamp, kule, iskele... */
function scenery(b: Builder, terrain: Region): void {
  const { r } = b;
  const house2 = (w: number, h: number, side: 0 | 1 | 2 | 3 = 1): void => {
    const at = b.free(w, h);
    if (at) b.building(at, side);
  };
  const solid = (type: string, w: number, h: number, extra = 0): void => {
    const at = b.free(w, h);
    if (at) b.solid(type, at, extra);
  };
  const deco = (type: string, w: number, h: number): void => {
    const at = b.free(w, h);
    if (at) b.deco(type, at);
  };
  switch (terrain) {
    case 'forest':
      if (r() < 0.65) house2(0.13, 0.1);
      if (r() < 0.6) { solid('campfire', 0.035, 0.035); solid('tent', 0.07, 0.05); if (r() < 0.6) solid('tent', 0.07, 0.05); }
      for (let i = 0; i < 2; i += 1) deco('log', 0.09, 0.025);
      if (r() < 0.5) deco('stream', 0.5, 0.05);
      break;
    case 'grassland':
      if (r() < 0.6) { house2(0.15, 0.11); solid('haystack', 0.04, 0.04); solid('haystack', 0.04, 0.04); }
      if (r() < 0.5) solid('windmill', 0.07, 0.07);
      if (r() < 0.5) { for (let i = 0; i < 5; i += 1) solid('menhir', 0.02, 0.02); }
      deco('field', 0.2, 0.12);
      break;
    case 'mountain':
      if (r() < 0.6) solid('watchtower', 0.075, 0.075);
      if (r() < 0.55) deco('cave', 0.12, 0.07);
      for (let i = 0; i < 3; i += 1) solid('boulder', 0.04, 0.035);
      break;
    case 'desert':
      if (r() < 0.6) { solid('tent', 0.08, 0.06, 1); solid('tent', 0.07, 0.05, 1); solid('campfire', 0.03, 0.03); }
      if (r() < 0.55) solid('obelisk', 0.035, 0.035);
      if (r() < 0.55) deco('oasis', 0.16, 0.1);
      deco('bones', 0.06, 0.04);
      break;
    case 'swamp':
      if (r() < 0.7) house2(0.12, 0.09);
      deco('boardwalk', 0.34, 0.03);
      for (let i = 0; i < 2; i += 1) deco('log', 0.09, 0.025);
      break;
    case 'coast': {
      // Kıyı çizgisi alanın %40'ından sonra başlar: kara yapıları soldaki şeride konur, iskele kıyıya yaslanır.
      const H = b.height;
      const land: Rect = { x: 0.06, y: H * 0.3, w: 0.3, h: H * 0.44 };
      const onLand = (type: string, w: number, h: number): void => {
        const at = b.free(w, h, land);
        if (at) b.solid(type, at);
      };
      if (r() < 0.7) { const at = b.free(0.1, 0.045, { x: 0.3, y: H * 0.3, w: 0.2, h: H * 0.44 }); if (at) b.deco('pier', at); }
      if (r() < 0.55) onLand('lighthouse', 0.06, 0.06);
      if (r() < 0.5) { onLand('tent', 0.07, 0.05); onLand('campfire', 0.03, 0.03); }
      break;
    }
    case 'arctic':
      if (r() < 0.65) { solid('igloo', 0.08, 0.07); if (r() < 0.5) solid('igloo', 0.06, 0.055); }
      deco('hole', 0.07, 0.045);
      break;
    case 'ruins':
      if (r() < 0.65) {
        const at = b.free(0.15, 0.13);
        if (at) {
          // Yıkık kule: duvarın yer yer kopuk halkası.
          b.frame(at, WALL * 2.5, [0.04, 0, 0.035, 0.05], 'ruinwall');
          b.deco('rubble', { x: at.x + at.w * 0.3, y: at.y + at.h * 0.3, w: 0.04, h: 0.03 }, 0);
        }
      }
      for (let i = 0; i < 3; i += 1) solid('column', 0.025, 0.025);
      break;
    default:
      break;
  }
}

/** Zindan, kasaba ve şehirden ayrı, kendi yerleşimiyle çizilen araziler ve ana arazilerin yapıları. Hiçbiri yoksa null. */
export function placeLayout(terrain: Region | null, seed: number, aspect: number): PlaceLayout | null {
  if (!terrain) return null;
  const H = Math.max(0.25, aspect);
  const r = seeded((seed ^ 0x6a09e667) >>> 0);
  const b = new Builder(r, H);
  let floors: Rect[] | null = null;
  let areas: Rect[] = [];

  switch (terrain) {
    case 'castle': {
      const x0 = 0.14;
      const x1 = 0.86;
      const y0 = H * 0.1;
      const y1 = H * 0.8;
      const T = 0.025;
      areas = [{ x: 0.04, y: H * 0.86, w: 0.3, h: H * 0.1 }, { x: 0.62, y: H * 0.5, w: 0.22, h: H * 0.24 }];
      b.reserve(...areas);
      b.deco('paving', { x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, 0);
      b.frame({ x: x0, y: y0, w: x1 - x0, h: y1 - y0 }, T, [0, 0.08, 0, 0], 'stonewall');
      for (const [tx, ty] of [[x0, y0], [x1, y0], [x0, y1], [x1, y1]] as const) {
        b.solid('tower', { x: tx - 0.035, y: ty - 0.035, w: 0.07, h: 0.07 }, 0);
      }
      b.building({ x: 0.38, y: H * 0.18, w: 0.24, h: H * 0.26 }, 1);
      b.solid('well', { x: 0.28, y: H * 0.5, w: 0.04, h: 0.04 }, 0);
      for (let i = 0; i < 3; i += 1) { const at = b.free(0.03, 0.03, { x: x0 + T, y: y0 + T, w: x1 - x0 - T * 2, h: y1 - y0 - T * 2 }); if (at) b.solid('crate', at); }
      break;
    }
    case 'ship': {
      floors = [
        { x: 0.1, y: H * 0.3, w: 0.78, h: H * 0.4 },
        { x: 0.88, y: H * 0.38, w: 0.08, h: H * 0.24 },
        { x: 0.04, y: H * 0.36, w: 0.06, h: H * 0.28 },
      ];
      areas = [{ x: 0.3, y: H * 0.4, w: 0.13, h: H * 0.2 }, { x: 0.74, y: H * 0.4, w: 0.12, h: H * 0.2 }];
      b.reserve(...areas);
      b.deco('deck', floors[0]!, 0);
      b.building({ x: 0.12, y: H * 0.36, w: 0.15, h: H * 0.28 }, 3);
      b.solid('mast', { x: 0.45 - 0.015, y: H * 0.5 - 0.015, w: 0.03, h: 0.03 }, 0);
      b.solid('mast', { x: 0.7 - 0.015, y: H * 0.5 - 0.015, w: 0.03, h: 0.03 }, 0);
      for (let i = 0; i < 4; i += 1) { const at = b.free(0.03, 0.03, floors[0]); if (at) b.solid(i % 2 ? 'barrel' : 'crate', at); }
      break;
    }
    case 'camp': {
      areas = [{ x: 0.05, y: H * 0.42, w: 0.2, h: H * 0.16 }, { x: 0.75, y: H * 0.42, w: 0.2, h: H * 0.16 }];
      b.reserve(...areas);
      b.solid('campfire', { x: 0.5 - 0.02, y: H * 0.5 - 0.02, w: 0.04, h: 0.04 }, 0);
      for (let i = 0; i < 5; i += 1) {
        const a = (i / 5) * Math.PI * 2 + r() * 0.5;
        const at: Rect = { x: 0.5 + Math.cos(a) * 0.19 - 0.035, y: H * 0.5 + Math.sin(a) * H * 0.3 - 0.026, w: 0.07, h: 0.052 };
        if (!b.taken.some((t) => overlap(at, t, 0.006))) b.solid('tent', at, i % 3);
      }
      for (let i = 0; i < 2; i += 1) { const at = b.free(0.1, 0.05); if (at) b.solid('wagon', at); }
      for (let i = 0; i < 3; i += 1) { const at = b.free(0.03, 0.03); if (at) b.solid('crate', at); }
      break;
    }
    case 'graveyard': {
      const fence: Rect = { x: 0.08, y: H * 0.12, w: 0.84, h: H * 0.7 };
      areas = [{ x: 0.1, y: H * 0.42, w: 0.12, h: H * 0.16 }, { x: 0.78, y: H * 0.42, w: 0.12, h: H * 0.16 }];
      b.reserve(...areas);
      b.frame(fence, 0.006, [0, 0.07, 0, 0], 'fence');
      b.building({ x: 0.4, y: H * 0.16, w: 0.2, h: H * 0.18 }, 1);
      for (let col = 0; col < 10; col += 1) {
        for (let row = 0; row < 3; row += 1) {
          if (r() < 0.3) continue;
          const at: Rect = { x: 0.14 + col * 0.072, y: H * (0.42 + row * 0.12) - 0.008, w: 0.018, h: 0.022 };
          if (b.taken.some((t) => overlap(at, t, 0.004))) continue;
          b.solid('gravestone', at, Math.floor(r() * 3));
        }
      }
      for (let i = 0; i < 3; i += 1) { const at = b.free(0.04, 0.04, fence); if (at) b.deco('deadtree', at); }
      break;
    }
    case 'temple': {
      const room: Rect = { x: 0.1, y: H * 0.12, w: 0.8, h: H * 0.7 };
      areas = [{ x: 0.12, y: H * 0.43, w: 0.1, h: H * 0.14 }, { x: 0.66, y: H * 0.43, w: 0.1, h: H * 0.14 }];
      b.reserve(...areas);
      b.deco('paving', room, 0);
      b.frame(room, 0.02, [0.09, 0.05 + r() * 0.04, 0.12, 0.05], 'stonewall');
      for (let col = 0; col < 7; col += 1) {
        for (const row of [0.34, 0.66]) {
          b.solid('column', { x: 0.25 + col * 0.075 - 0.0125, y: H * row - 0.0125, w: 0.025, h: 0.025 }, 0);
        }
      }
      b.solid('altar', { x: 0.8, y: H * 0.44, w: 0.06, h: H * 0.12 }, 0);
      b.deco('steps', { x: 0.06, y: H * 0.44, w: 0.04, h: H * 0.12 }, 0);
      break;
    }
    case 'farm': {
      areas = [{ x: 0.06, y: H * 0.41, w: 0.28, h: H * 0.11 }, { x: 0.64, y: H * 0.46, w: 0.28, h: H * 0.16 }];
      b.reserve(...areas);
      b.building({ x: 0.1, y: H * 0.18, w: 0.2, h: H * 0.2 }, 1);
      b.building({ x: 0.62, y: H * 0.16, w: 0.26, h: H * 0.24 }, 1);
      b.deco('field', { x: 0.08, y: H * 0.56, w: 0.26, h: H * 0.2 }, 0);
      b.frame({ x: 0.4, y: H * 0.52, w: 0.2, h: H * 0.2 }, 0.006, [0, 0, 0.06, 0], 'fence');
      for (let i = 0; i < 3; i += 1) { const at = b.free(0.04, 0.04); if (at) b.solid('haystack', at); }
      b.solid('well', { x: 0.46, y: H * 0.4, w: 0.035, h: 0.035 }, 0);
      break;
    }
    case 'river': {
      const c = 0.4 + r() * 0.12;
      const width = 0.13;
      const gaps: [number, number][] = [[H * 0.14, H * 0.22], [H * 0.42, H * 0.58], [H * 0.78, H * 0.86]];
      areas = [{ x: 0.06, y: H * 0.42, w: 0.2, h: H * 0.16 }, { x: Math.min(0.94 - 0.2, c + width + 0.06), y: H * 0.42, w: 0.2, h: H * 0.16 }];
      b.reserve(...areas);
      let from = 0;
      for (const [a, z] of gaps) {
        if (a > from) b.solid('water', { x: c, y: from, w: width, h: a - from }, 0);
        from = z;
      }
      b.solid('water', { x: c, y: from, w: width, h: H - from }, 0);
      b.deco('bridge', { x: c - 0.015, y: gaps[1]![0], w: width + 0.03, h: gaps[1]![1] - gaps[1]![0] }, 0);
      b.deco('ford', { x: c, y: gaps[0]![0], w: width, h: gaps[0]![1] - gaps[0]![0] }, 0);
      b.deco('ford', { x: c, y: gaps[2]![0], w: width, h: gaps[2]![1] - gaps[2]![0] }, 1);
      for (let i = 0; i < 4; i += 1) { const at = b.free(0.04, 0.04); if (at && (at.x + at.w < c - 0.02 || at.x > c + width + 0.02)) b.solid('boulder', at); }
      break;
    }
    case 'tavern': {
      const hall: Rect = { x: 0.07, y: H * 0.1, w: 0.86, h: H * 0.8 };
      const built = b.building(hall, 1, { minRooms: 3, open: true });
      const main = [...built.rooms].sort((p, q) => q.w * q.h - p.w * p.h)[0] ?? hall;
      const aw = Math.min(0.18, main.w * 0.3);
      areas = [
        { x: main.x + 0.03, y: main.y + main.h - 0.1, w: aw, h: 0.07 },
        { x: main.x + main.w - aw - 0.03, y: main.y + main.h - 0.1, w: aw, h: 0.07 },
      ];
      b.reserve(...areas);
      b.solid('bar', { x: main.x + 0.03, y: main.y + 0.04, w: main.w * 0.5, h: 0.03 }, 0);
      for (let i = 0; i < 6; i += 1) {
        const at = b.free(0.045, 0.045, { x: main.x + 0.02, y: main.y + 0.1, w: main.w - 0.04, h: main.h - 0.22 });
        if (at) b.solid('table', at);
      }
      break;
    }
    case 'market': {
      areas = [{ x: 0.05, y: H * 0.42, w: 0.2, h: H * 0.16 }, { x: 0.75, y: H * 0.42, w: 0.2, h: H * 0.16 }];
      b.reserve(...areas);
      b.deco('paving', { x: 0, y: 0, w: 1, h: H }, 0);
      b.building({ x: 0.04, y: H * 0.03, w: 0.16, h: H * 0.2 }, 1);
      b.building({ x: 0.8, y: H * 0.03, w: 0.16, h: H * 0.2 }, 1);
      b.building({ x: 0.04, y: H * 0.77, w: 0.16, h: H * 0.2 }, 0);
      b.building({ x: 0.8, y: H * 0.77, w: 0.16, h: H * 0.2 }, 0);
      b.solid('fountain', { x: 0.5 - 0.04, y: H * 0.5 - 0.04, w: 0.08, h: 0.08 }, 0);
      for (let col = 0; col < 5; col += 1) {
        for (const row of [0.28, 0.72]) {
          if (r() < 0.15) continue;
          const at: Rect = { x: 0.2 + col * 0.14, y: H * row - 0.022, w: 0.09, h: 0.045 };
          if (!b.taken.some((t) => overlap(at, t, 0.004))) b.solid('stall', at, Math.floor(r() * 3));
        }
      }
      break;
    }
    default:
      scenery(b, terrain);
      if (b.props.length === 0 && b.buildings.length === 0) return null;
  }
  return { floors, walls: b.walls, buildings: b.buildings, props: b.props, areas };
}
