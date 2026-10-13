import { describe, expect, it } from 'vitest';
import {
  barrier, carriedLight, dungeonLayout, inWall, isLit, onFloor, pathClear, placeLayout, segmentHitsRect, spread, tokenLight, townLayout, townPathClear,
} from './index';

const scale = { widthFt: 100, aspect: 0.75 };

describe('ışık', () => {
  it('yanan eşyaların en büyüğü taşınan ışıktır; sönükler sayılmaz', () => {
    const hero = { inventory: [
      { id: 'a', name: 'Mum', qty: 1, note: '', light: 5, lit: true },
      { id: 'b', name: 'Fener', qty: 1, note: '', light: 30, lit: false },
      { id: 'c', name: 'Meşale', qty: 1, note: '', light: 20, lit: true },
    ] };
    expect(carriedLight(hero)).toBe(20);
    expect(carriedLight({ inventory: [] })).toBe(0);
    expect(tokenLight({ kind: 'character' }, hero)).toBe(20);
    expect(tokenLight({ kind: 'monster', light: 10 }, hero)).toBe(10);
    expect(tokenLight({ kind: 'marker' }, hero)).toBe(0);
  });

  it('ışık yarıçapının iki katına kadar aydınlatır', () => {
    const sources = [{ x: 0.5, y: 0.5, r: 10 }];
    expect(isLit({ x: 0.6, y: 0.5 }, sources, scale)).toBe(true); // 10 fit
    expect(isLit({ x: 0.7, y: 0.5 }, sources, scale)).toBe(true); // 20 fit: loş sınır
    expect(isLit({ x: 0.75, y: 0.5 }, sources, scale)).toBe(false); // 25 fit
    expect(isLit({ x: 0.5, y: 0.5 }, [{ x: 0.5, y: 0.5, r: 0 }], scale)).toBe(false);
  });
});

describe('zindan', () => {
  it('aynı tohum aynı zindanı verir; odalar çakışmaz ve alanın içindedir', () => {
    const a = dungeonLayout(42, 0.75);
    expect(dungeonLayout(42, 0.75)).toEqual(a);
    expect(dungeonLayout(43, 0.75)).not.toEqual(a);
    for (const seed of [1, 7, 42, 99, 12345, 777777]) expect(dungeonLayout(seed, 0.75).rooms.length).toBeGreaterThanOrEqual(3);
    for (const r of a.rooms) {
      expect(r.x).toBeGreaterThanOrEqual(0);
      expect(r.x + r.w).toBeLessThanOrEqual(1);
      expect(r.y + r.h).toBeLessThanOrEqual(0.75 + 1e-9);
    }
  });

  it('komşu odalar koridorla bağlıdır: ilk odanın merkezinden sonuncuya duvara çarpmadan gidilir', () => {
    for (const seed of [1, 7, 99, 12345]) {
      const layout = dungeonLayout(seed, 0.75);
      const centre = (i: number) => ({ x: layout.rooms[i]!.x + layout.rooms[i]!.w / 2, y: (layout.rooms[i]!.y + layout.rooms[i]!.h / 2) / 0.75 });
      for (let i = 0; i + 1 < layout.rooms.length; i += 1) {
        const a = centre(i);
        const b = { x: centre(i + 1).x, y: a.y };
        expect(onFloor(layout, a, 0.75)).toBe(true);
        // Dirsek: önce yatay, sonra dikey koridor.
        expect(pathClear(layout, a, b, 0.75)).toBe(true);
        expect(pathClear(layout, b, centre(i + 1), 0.75)).toBe(true);
      }
    }
  });

  it('serpiştirilen konumlar odanın içinde kalır', () => {
    const room = { x: 0.2, y: 0.1, w: 0.3, h: 0.2 };
    const layout = { rooms: [room], corridors: [] };
    for (const p of spread(room, 6, 0.75)) expect(onFloor(layout, p, 0.75)).toBe(true);
  });
});

describe('kasaba ve şehir', () => {
  const aspect = 0.75;
  for (const kind of ['town', 'city'] as const) {
    it(`${kind}: aynı tohum aynı yerleşimi verir, yapılar odalıdır ve alanın içindedir`, () => {
      const a = townLayout(31, aspect, kind);
      expect(townLayout(31, aspect, kind)).toEqual(a);
      expect(townLayout(32, aspect, kind)).not.toEqual(a);
      expect(a.buildings.length).toBeGreaterThanOrEqual(kind === 'city' ? 12 : 4);
      expect(a.buildings.some((b) => b.rooms.length > 1)).toBe(true);
      expect(a.doors.length).toBeGreaterThanOrEqual(a.buildings.length);
      for (const w of a.walls) {
        expect(w.x).toBeGreaterThanOrEqual(0);
        expect(w.x + w.w).toBeLessThanOrEqual(1 + 1e-9);
        expect(w.y + w.h).toBeLessThanOrEqual(aspect + 1e-9);
      }
    });

    it(`${kind}: dizilme alanları sokaktadır, duvarın içinde değildir ve birbirine duvarsız ulaşır`, () => {
      for (const seed of [1, 5, 99, 4242]) {
        const layout = townLayout(seed, aspect, kind);
        const bar = barrier(kind, seed, aspect)!;
        expect(bar.areas).toHaveLength(2);
        const [left, right] = bar.areas.map((r) => ({ x: r.x + r.w / 2, y: (r.y + r.h / 2) / aspect }));
        expect(bar.stand(left!)).toBe(true);
        expect(bar.stand(right!)).toBe(true);
        expect(inWall(layout, left!, aspect)).toBe(false);
        // Ortadaki cadde boyunca hiçbir yapı duvarı yoktur.
        expect(bar.clear(left!, right!)).toBe(true);
      }
    });
  }

  it('duvar yolu keser, kapı boşluğu geçilebilir', () => {
    const layout = townLayout(7, aspect, 'town');
    const wall = layout.walls[0]!;
    const centre = { x: wall.x + wall.w / 2, y: (wall.y + wall.h / 2) / aspect };
    expect(inWall(layout, centre, aspect)).toBe(true);
    const door = layout.doors[0]!;
    const horizontal = door.w > door.h;
    const through = horizontal
      ? [{ x: door.x + door.w / 2, y: (door.y - 0.03) / aspect }, { x: door.x + door.w / 2, y: (door.y + door.h + 0.03) / aspect }]
      : [{ x: door.x - 0.03, y: (door.y + door.h / 2) / aspect }, { x: door.x + door.w + 0.03, y: (door.y + door.h / 2) / aspect }];
    expect(townPathClear(layout, through[0]!, through[1]!, aspect)).toBe(true);
    const across = horizontal
      ? [{ x: wall.x + 0.002, y: (wall.y - 0.03) / aspect }, { x: wall.x + 0.002, y: (wall.y + wall.h + 0.03) / aspect }]
      : [{ x: wall.x - 0.03, y: (wall.y + 0.002) / aspect }, { x: wall.x + wall.w + 0.03, y: (wall.y + 0.002) / aspect }];
    expect(segmentHitsRect({ x: across[0]!.x, y: across[0]!.y * aspect }, { x: across[1]!.x, y: across[1]!.y * aspect }, wall)).toBe(true);
  });
});

describe('yapılı araziler', () => {
  const aspect = 0.75;
  const all = ['castle', 'ship', 'camp', 'graveyard', 'temple', 'farm', 'river', 'tavern', 'market'] as const;

  it.each(all)('%s: aynı tohum aynı yerleşimi verir; savaşçı alanları açıktır ve birbirine ulaşır', (terrain) => {
    for (const seed of [1, 9, 77, 2024]) {
      const a = placeLayout(terrain, seed, aspect)!;
      expect(placeLayout(terrain, seed, aspect)).toEqual(a);
      expect(a.areas).toHaveLength(2);
      const bar = barrier(terrain, seed, aspect)!;
      for (const area of a.areas) {
        const centre = { x: area.x + area.w / 2, y: (area.y + area.h / 2) / aspect };
        expect(bar.stand(centre), `${terrain} ${seed}`).toBe(true);
      }
    }
    expect(placeLayout(terrain, 1, aspect)).not.toEqual(placeLayout(terrain, 2, aspect));
  });

  it('gemide su geçilmez, nehirde köprü geçilir', () => {
    const ship = barrier('ship', 3, aspect)!;
    expect(ship.stand({ x: 0.5, y: 0.5 })).toBe(true); // güverte
    expect(ship.stand({ x: 0.45, y: 0.5 })).toBe(false); // direk
    expect(ship.stand({ x: 0.5, y: 0.05 })).toBe(false); // su
    const river = placeLayout('river', 3, aspect)!;
    const water = river.walls[0]!;
    const bar = barrier('river', 3, aspect)!;
    const bridge = river.props.find((p) => p.type === 'bridge')!;
    const y = (bridge.y + bridge.h / 2) / aspect;
    expect(bar.clear({ x: water.x - 0.05, y }, { x: water.x + water.w + 0.05, y })).toBe(true);
    const yWater = (water.y + water.h / 2) / aspect;
    expect(bar.clear({ x: water.x - 0.05, y: yWater }, { x: water.x + water.w + 0.05, y: yWater })).toBe(false);
  });

  it('ana araziler tek tük yapı alır; yapı olmayanlar engelsizdir', () => {
    const forest = placeLayout('forest', 12, aspect);
    expect(forest).not.toBeNull();
    expect(forest!.areas).toEqual([]);
    expect(placeLayout('underwater', 12, aspect)).toBeNull();
    expect(barrier('underwater', 12, aspect)).toBeNull();
  });

  it('yeraltı mekânları zindanla aynı oda düzenini kullanır', () => {
    for (const terrain of ['cavern', 'sewer', 'mine'] as const) {
      expect(barrier(terrain, 5, aspect)!.areas).toEqual(dungeonLayout(5, aspect).rooms);
    }
  });
});
