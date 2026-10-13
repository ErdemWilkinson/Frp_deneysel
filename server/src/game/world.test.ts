import { describe, expect, it } from 'vitest';
import { guessRegion, newTable, seeded, type DmView, type PlayerView, type TableState } from '@masa/shared';
import { upgrade } from '../hub';
import { viewFor } from '../view';
import { IntentError } from './context';
import { emptyState, heroInput, run, startFight } from './fixtures';

const dm = (s: TableState, intent: object, ...faces: number[]) => run(s, 'dm', intent, ...faces).state;
const player = (s: TableState) => viewFor('player', s, []) as PlayerView;

describe('arazi tahmini', () => {
  it.each([
    ['koyu yeşil', [38, 78, 44], 'forest'],
    ['açık yeşil', [128, 168, 78], 'grassland'],
    ['kum sarısı', [214, 178, 96], 'desert'],
    ['kızıl kanyon', [190, 84, 44], 'desert'],
    ['deniz mavisi', [30, 96, 132], 'sea'],
    ['kar beyazı', [236, 240, 244], 'arctic'],
    ['kaya grisi', [112, 108, 104], 'mountain'],
    ['koyu kahverengi', [84, 58, 40], 'mountain'],
    ['bulanık zeytin', [62, 70, 44], 'swamp'],
  ] as const)('%s → %s', (_label, [r, g, b], region) => {
    expect(guessRegion(r, g, b)).toBe(region);
  });

  it('aynı tohum aynı diziyi, farklı tohum farklı diziyi verir', () => {
    const a = seeded(42);
    const b = seeded(42);
    const c = seeded(43);
    const first = [a(), a(), a()];
    expect([b(), b(), b()]).toEqual(first);
    expect([c(), c(), c()]).not.toEqual(first);
    expect(first.every((n) => n >= 0 && n < 1)).toBe(true);
  });
});

describe('ana harita', () => {
  it('DM haritayı koyar, karakterin yerini ve arazisini belirler', () => {
    let s = dm(emptyState, { type: 'world.setMap', mapId: 'world-1' });
    s = dm(s, { type: 'world.setAspect', aspect: 0.6666 });
    s = dm(s, { type: 'world.move', x: 0.42, y: 1.7, region: 'forest' });
    expect(s.world).toEqual({ mapId: 'world-1', aspect: 0.667, visible: true, x: 0.42, y: 1, region: 'forest' });
    expect(dm(s, { type: 'world.move', x: 0.1, y: 0.1 }).world.region).toBe('forest');
    expect(dm(s, { type: 'world.setRegion', region: null }).world.region).toBeNull();
  });

  it('oyuncu ana haritayı yönetemez; geçersiz değerler reddedilir', () => {
    for (const intent of [
      { type: 'world.setMap', mapId: 'x' }, { type: 'world.show', visible: true }, { type: 'world.move', x: 0, y: 0 },
      { type: 'world.setRegion', region: 'forest' }, { type: 'board.setTerrain', terrain: 'desert' },
    ]) expect(() => run(emptyState, 'player', intent)).toThrow('Bu işlem yalnızca DM içindir');
    expect(() => dm(emptyState, { type: 'world.move', x: 'sol', y: 0 })).toThrow(IntentError);
    expect(() => dm(emptyState, { type: 'world.move', x: 0, y: 0, region: 'moon' })).toThrow(IntentError);
    expect(() => dm(emptyState, { type: 'world.setMap', mapId: '../x' })).toThrow(IntentError);
  });

  it('DM haritayı koyunca oyuncu görür; DM gizleyebilir; arazi türü oyuncuya gitmez', () => {
    let s = dm(emptyState, { type: 'world.setMap', mapId: 'world-1' });
    s = dm(s, { type: 'world.move', x: 0.3, y: 0.4, region: 'swamp' });
    s = dm(s, { type: 'world.show', visible: false });
    expect(player(s).world).toBeNull();
    s = dm(s, { type: 'world.show', visible: true });
    expect(player(s).world).toEqual({ mapId: 'world-1', aspect: 0.75, x: 0.3, y: 0.4 });
    expect(JSON.stringify(player(s))).not.toContain('swamp');
    expect((viewFor('dm', s, []) as DmView).world.region).toBe('swamp');
    expect(player(dm(s, { type: 'world.setMap', mapId: null })).world).toBeNull();
  });
});

describe('savaş alanının arazisi', () => {
  it('karşılaşma hangi bölgede üretildiyse alan o arazide ve yeni bir tohumla çizilir', () => {
    let s = run(emptyState, 'player', { type: 'character.set', character: heroInput }).state;
    s = dm(s, { type: 'encounter.generate', region: 'forest', level: 3, difficulty: 'medium' }, 1, 1, 1, 1);
    expect(s.board.terrain).toBe('forest');
    expect(Number.isInteger(s.board.seed) && s.board.seed !== emptyState.board.seed).toBe(true);
    expect(s.encounter!.combatants.length).toBeGreaterThan(0);
  });

  it('elle kurulan karşılaşma başlayınca alan, karakterin ana haritadaki yerinin arazisinde açılır', () => {
    let s = run(emptyState, 'player', { type: 'character.set', character: heroInput }).state;
    s = dm(s, { type: 'world.move', x: 0.2, y: 0.2, region: 'swamp' });
    s = dm(s, { type: 'encounter.addMonster', monsterId: 'goblin', count: 1, hpMode: 'average' });
    s = startFight(s, 5, 15);
    expect(s.board.terrain).toBe('swamp');
    // DM araziyi önceden seçtiyse ona dokunulmaz.
    let chosen = dm(run(emptyState, 'player', { type: 'character.set', character: heroInput }).state, { type: 'board.setTerrain', terrain: 'ruins' });
    chosen = dm(chosen, { type: 'world.move', x: 0.2, y: 0.2, region: 'swamp' });
    chosen = dm(chosen, { type: 'encounter.addMonster', monsterId: 'goblin', count: 1, hpMode: 'average' });
    expect(startFight(chosen, 5, 15).board.terrain).toBe('ruins');
  });

  it('DM araziyi elle seçer; aynı araziyi yeniden seçmek alanı yeniden çizer', () => {
    const a = dm(emptyState, { type: 'board.setTerrain', terrain: 'desert' });
    const b = dm(a, { type: 'board.setTerrain', terrain: 'desert' });
    expect([a.board.terrain, b.board.terrain]).toEqual(['desert', 'desert']);
    expect(b.board.seed).not.toBe(a.board.seed);
    expect(dm(a, { type: 'board.setTerrain', terrain: null }).board.terrain).toBeNull();
  });

  it('oyuncu savaş alanının arazisini ve tohumunu alır ki aynı alanı çizsin', () => {
    let s = dm(emptyState, { type: 'board.setTerrain', terrain: 'arctic' });
    s = dm(s, { type: 'board.show', visible: true });
    expect(player(s).board).toMatchObject({ terrain: 'arctic', seed: s.board.seed, mapId: null });
  });
});

describe('eski kayıt', () => {
  const old = (encounter: object | null) => ({
    code: 'ABC123', character: null, encounter, sheetId: null,
    board: { mapId: 'map-1', visible: true, tokens: [], widthFt: 100, aspect: 0.6 },
  }) as unknown as TableState;

  it('tek haritalı kayıttaki harita ana haritaya taşınır; savaş alanı boşalır', () => {
    const s = upgrade(old({ id: 'e', status: 'draft', round: 0, turnIndex: 0, combatants: [] }));
    expect(s.world).toMatchObject({ mapId: 'map-1', aspect: 0.6, visible: true });
    expect(s.board).toMatchObject({ mapId: null, terrain: null, seed: 1 });
  });

  it('savaş sürüyorsa harita yerinde kalır; yeni kayıtlara dokunulmaz', () => {
    const active = upgrade(old({ id: 'e', status: 'active', round: 1, turnIndex: 0, combatants: [] }));
    expect(active.board.mapId).toBe('map-1');
    expect(active.world.mapId).toBeNull();
    const fresh = { ...newTable('X'), board: { ...newTable('X').board, mapId: 'battle-1' } };
    expect(upgrade(fresh).board.mapId).toBe('battle-1');
  });
});
