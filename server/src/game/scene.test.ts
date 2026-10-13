import { describe, expect, it } from 'vitest';
import { dungeonLayout, inRegion, onFloor, townLayout, type PlayerView, type TableState } from '@masa/shared';
import { viewFor } from '../view';
import { emptyState, fightState, heroInput, run, startFight } from './fixtures';

const dm = (s: TableState, intent: object) => run(s, 'dm', intent).state;
const player = (s: TableState) => viewFor('player', s, []) as PlayerView;
const token = (s: TableState, label: string) => s.board.tokens.find((t) => t.label === label)!;
const labels = (s: TableState) => player(s).board!.tokens.map((t) => t.label);

const draft = (): TableState => {
  let s = run(emptyState, 'player', { type: 'character.set', character: heroInput }).state;
  s = run(s, 'dm', { type: 'encounter.addMonster', monsterId: 'goblin', count: 1, hpMode: 'average' }).state;
  return run(s, 'dm', { type: 'encounter.addMonster', monsterId: 'skeleton', count: 1, hpMode: 'average' }).state;
};

describe('günün saati ve ışık', () => {
  it('günün saatini yalnızca DM değiştirir', () => {
    expect(() => run(fightState(), 'player', { type: 'board.setDaylight', daylight: 'night' })).toThrow('yalnızca DM');
    expect(() => dm(fightState(), { type: 'board.setDaylight', daylight: 'öğle' })).toThrow();
    expect(dm(fightState(), { type: 'board.setDaylight', daylight: 'evening' }).board.daylight).toBe('evening');
  });

  it('gündüz ve akşam her jeton görünür; gece ışık dışında kalan yaratık gizlenir', () => {
    let s = fightState();
    expect(labels(s)).toEqual(['Aria', 'Goblin 1', 'İskelet 1']);
    s = dm(s, { type: 'board.setDaylight', daylight: 'evening' });
    expect(labels(s)).toHaveLength(3);
    s = dm(s, { type: 'board.setDaylight', daylight: 'night' });
    expect(labels(s)).toEqual(['Aria']);
    expect(player(s).board!.daylight).toBe('night');
  });

  it('yanan meşale, çevresindeki yaratığı görünür kılar; uzaktaki karanlıkta kalır', () => {
    let s = dm(fightState(), { type: 'board.setDaylight', daylight: 'dark' });
    s = run(s, 'player', { type: 'inventory.add', name: 'Meşale', light: 20 }).state;
    s = run(s, 'player', { type: 'inventory.update', itemId: s.character!.inventory![0]!.id, lit: true }).state;
    // Işık 20 fit parlak, 20 fit loş: toplam 40 fit.
    expect(player(s).board!.tokens.find((t) => t.kind === 'character')!.light).toBe(20);
    expect(labels(s)).toEqual(['Aria', 'Goblin 1', 'İskelet 1']);
    s = dm(s, { type: 'board.moveToken', tokenId: token(s, 'Goblin 1').id, x: 0.9, y: 0.9 });
    expect(labels(s)).toEqual(['Aria', 'İskelet 1']);
  });

  it('DM bir jetona ışık verir; ışık yayan yaratık karanlıkta bile görünür', () => {
    let s = dm(fightState(), { type: 'board.setDaylight', daylight: 'dark' });
    s = dm(s, { type: 'board.moveToken', tokenId: token(s, 'Goblin 1').id, x: 0.9, y: 0.9 });
    expect(labels(s)).not.toContain('Goblin 1');
    s = dm(s, { type: 'board.patchToken', tokenId: token(s, 'Goblin 1').id, light: 10 });
    expect(labels(s)).toContain('Goblin 1');
    expect(() => dm(s, { type: 'board.patchToken', tokenId: token(s, 'Goblin 1').id, light: -1 })).toThrow();
  });
});

describe('zindan', () => {
  const dungeon = (): TableState => {
    let s = dm(draft(), { type: 'board.setTerrain', terrain: 'dungeon' });
    s = dm(s, { type: 'board.placeCombatants' });
    return dm(s, { type: 'board.show', visible: true });
  };

  it('zindan seçilince alan karanlık olur ve herkes odalara dizilir', () => {
    const s = dungeon();
    expect(s.board).toMatchObject({ terrain: 'dungeon', daylight: 'dark' });
    expect(s.board.tokens).toHaveLength(3);
    for (const t of s.board.tokens) expect(onFloor(dungeonLayout(s.board.seed, s.board.aspect), t, s.board.aspect)).toBe(true);
  });

  it('oyuncu duvarın içine yürüyemez; DM serbesttir', () => {
    const s = dungeon();
    const layout = dungeonLayout(s.board.seed, s.board.aspect);
    let wall: { x: number; y: number } | null = null;
    for (let x = 0.02; x < 1 && !wall; x += 0.03) {
      for (let y = 0.02; y < 1 && !wall; y += 0.03) if (!onFloor(layout, { x, y }, s.board.aspect)) wall = { x, y };
    }
    expect(wall).not.toBeNull();
    const hero = token(s, 'Aria');
    expect(() => run(s, 'player', { type: 'board.moveToken', tokenId: hero.id, ...wall })).toThrow('duvar');
    expect(token(dm(s, { type: 'board.moveToken', tokenId: hero.id, ...wall }), 'Aria')).toMatchObject(wall!);
  });

  it('oyuncu odanın içinde serbestçe yürür', () => {
    const s = dungeon();
    const hero = token(s, 'Aria');
    const room = dungeonLayout(s.board.seed, s.board.aspect).rooms[0]!;
    const to = { x: room.x + room.w * 0.3, y: (room.y + room.h * 0.4) / s.board.aspect };
    const moved = run(s, 'player', { type: 'board.moveToken', tokenId: hero.id, ...to }).state;
    expect(token(moved, 'Aria').x).toBeCloseTo(to.x, 5);
  });

  it('zindan bölgesi için canavarlar yeraltı ve harabe etiketlerinden seçilir', () => {
    expect(inRegion({ regions: ['ruins'] }, 'dungeon')).toBe(true);
    expect(inRegion({ regions: ['underground'] }, 'dungeon')).toBe(true);
    expect(inRegion({ regions: ['forest'] }, 'dungeon')).toBe(false);
  });
});

describe('kasaba ve şehir', () => {
  const town = (terrain: 'town' | 'city'): TableState => {
    let s = dm(draft(), { type: 'board.setTerrain', terrain });
    s = dm(s, { type: 'board.placeCombatants' });
    return dm(s, { type: 'board.show', visible: true });
  };

  it.each(['town', 'city'] as const)('%s: gündüz kalır, savaşçılar caddeye dizilir', (terrain) => {
    const s = town(terrain);
    expect(s.board).toMatchObject({ terrain, daylight: 'day' });
    expect(s.board.tokens).toHaveLength(3);
    const hero = token(s, 'Aria');
    const foe = token(s, 'Goblin 1');
    expect(hero.x).toBeLessThan(0.4);
    expect(foe.x).toBeGreaterThan(0.6);
  });

  it('zindandan şehre geçince karanlık kalkar', () => {
    const s = dm(dm(draft(), { type: 'board.setTerrain', terrain: 'dungeon' }), { type: 'board.setTerrain', terrain: 'city' });
    expect(s.board.daylight).toBe('day');
  });

  it('oyuncu bir yapının duvarından geçemez; DM geçirir', () => {
    const s = town('town');
    const layout = townLayout(s.board.seed, s.board.aspect, 'town');
    const wall = layout.walls.find((w) => w.w > 0.05)!; // yatay bir duvar
    const hero = token(s, 'Aria');
    const at = { x: wall.x + wall.w / 2, y: (wall.y + wall.h / 2) / s.board.aspect };
    expect(() => run(s, 'player', { type: 'board.moveToken', tokenId: hero.id, ...at })).toThrow('duvar');
    expect(token(dm(s, { type: 'board.moveToken', tokenId: hero.id, ...at }), 'Aria')).toMatchObject(at);
  });

  it('oyuncu sokakta serbestçe yürür', () => {
    const s = town('city');
    const hero = token(s, 'Aria');
    const to = { x: Math.min(0.9, hero.x + 0.1), y: hero.y };
    const moved = run(s, 'player', { type: 'board.moveToken', tokenId: hero.id, ...to }).state;
    expect(token(moved, 'Aria').x).toBeCloseTo(to.x, 5);
  });
});

describe('yaratığı zarla tanıma', () => {
  const setup = (): TableState => {
    let s = dm(emptyState, { type: 'table.setIdentify', identify: true });
    s = run(s, 'player', { type: 'character.set', character: heroInput }).state;
    s = dm(s, { type: 'encounter.addMonster', monsterId: 'goblin', count: 2, hpMode: 'average' });
    return startFight(s, 10, 5, 15);
  };
  const goblins = (s: TableState) => s.encounter!.combatants.filter((c) => c.kind === 'monster');

  it('yalnızca DM açar; açıkken yaratıklar bilinmeyen girer ve oyuncu tanıyabileceğini görür', () => {
    expect(() => run(emptyState, 'player', { type: 'table.setIdentify', identify: true })).toThrow('yalnızca DM');
    const s = setup();
    expect(s.identify).toBe(true);
    const seen = player(s).encounter!.combatants.filter((c) => c.kind === 'monster');
    expect(seen.map((c) => c.name)).toEqual(['Bilinmeyen yaratık', 'Bilinmeyen yaratık']);
    expect(seen.every((c) => c.identifiable)).toBe(true);
  });

  it('kapalıyken yaratıklar adıyla girer ve tanıma zarı atılamaz', () => {
    let s = run(emptyState, 'player', { type: 'character.set', character: heroInput }).state;
    s = dm(s, { type: 'encounter.addMonster', monsterId: 'goblin', count: 1, hpMode: 'average' });
    s = startFight(s, 10, 15);
    expect(player(s).encounter!.combatants.find((c) => c.kind === 'monster')!.name).toBe('Goblin 1');
    expect(() => run(s, 'player', { type: 'character.identify', targetId: goblins(s)[0]!.id }, 20)).toThrow('kapalı');
  });

  it('zar yeterliyse aynı türün hepsi tanınır; ad herkese açık günlüğe yazılır', () => {
    const s = setup();
    const out = run(s, 'player', { type: 'character.identify', targetId: goblins(s)[0]!.id }, 15);
    expect(out.log[0]!.text).toBe('Aria Tarih zarı attı: 15 — yaratığı tanıdı: Goblin');
    const seen = player(out.state).encounter!.combatants.filter((c) => c.kind === 'monster');
    expect(seen.map((c) => c.name)).toEqual(['Goblin 1', 'Goblin 2']);
    expect(seen.some((c) => c.identifiable)).toBe(false);
  });

  it('zar yetersizse tanınmaz ve yeniden denenemez; DM yeni hak verir', () => {
    const s = setup();
    const id = goblins(s)[0]!.id;
    const failed = run(s, 'player', { type: 'character.identify', targetId: id }, 9);
    expect(failed.log[0]!.text).toBe('Aria Tarih zarı attı: 9 — yaratığı tanıyamadı');
    expect(player(failed.state).encounter!.combatants.find((c) => c.id === id)!.name).toBe('Bilinmeyen yaratık');
    expect(() => run(failed.state, 'player', { type: 'character.identify', targetId: id }, 20)).toThrow('zaten denedin');
    const again = dm(failed.state, { type: 'combatant.patch', combatantId: id, patch: { identifyTried: false } });
    expect(run(again, 'player', { type: 'character.identify', targetId: id }, 20).log[0]!.text).toContain('tanıdı');
  });

  it('DM zorluğu belirler ve adı dilediği an elle açar', () => {
    const s = setup();
    const id = goblins(s)[0]!.id;
    const hard = dm(s, { type: 'combatant.patch', combatantId: id, patch: { identifyDc: 25 } });
    expect(run(hard, 'player', { type: 'character.identify', targetId: id }, 20).log[0]!.text).toContain('tanıyamadı');
    const shown = dm(hard, { type: 'combatant.patch', combatantId: id, patch: { revealName: true } });
    expect(player(shown).encounter!.combatants.find((c) => c.id === id)!.name).toBe('Goblin 1');
    expect(() => run(shown, 'player', { type: 'character.identify', targetId: id }, 20)).toThrow('zaten tanınıyor');
  });
});

describe('hayali savaş', () => {
  const started = (): TableState => {
    let s = dm(draft(), { type: 'table.setTheater', theater: true });
    s = dm(s, { type: 'encounter.start' });
    return s;
  };

  it('yalnızca DM açar; savaş kurulmadan da açılır', () => {
    expect(() => run(emptyState, 'player', { type: 'table.setTheater', theater: true })).toThrow('yalnızca DM');
    expect(dm(emptyState, { type: 'table.setTheater', theater: true }).theater).toBe(true);
  });

  it('savaş sıra ve harita olmadan hemen başlar; oyuncu haritayı görmez', () => {
    const s = started();
    expect(s.encounter!.status).toBe('active');
    expect(s.board.tokens).toHaveLength(0);
    const view = player(s);
    expect(view.board).toBeNull();
    expect(view.encounter).toMatchObject({ phase: 'combat', theater: true });
  });

  it('oyuncu saldıramaz; DM yaratığı öldürür ve karakterin canını düşürür', () => {
    const s = started();
    const monster = s.encounter!.combatants.find((c) => c.kind === 'monster')!;
    expect(() => run(s, 'player', { type: 'character.attack', attackIndex: 0, targetId: monster.id })).toThrow('DM yönetiyor');
    const killed = dm(s, { type: 'combatant.patch', combatantId: monster.id, patch: { hp: 0 } });
    expect(killed.encounter!.combatants.find((c) => c.id === monster.id)).toMatchObject({ hp: 0 });
    const hero = s.encounter!.combatants.find((c) => c.kind === 'character')!;
    const hurt = dm(killed, { type: 'combat.applyDamage', combatantId: hero.id, amount: 3, damageType: 'slashing' });
    expect(hurt.character!.hp).toBe(s.character!.hp - 3);
  });

  it('sürerken kapanınca herkes haritaya dizilir ve inisiyatif yeniden atılır', () => {
    const back = dm(started(), { type: 'table.setTheater', theater: false });
    expect(back.encounter!.status).toBe('initiative');
    expect(back.board.tokens.length).toBeGreaterThan(0);
    expect(player(back).board).not.toBeNull();
  });
});
