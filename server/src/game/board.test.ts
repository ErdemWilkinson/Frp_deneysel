import { describe, expect, it } from 'vitest';
import type { MonsterCombatant, PlayerView, TableState } from '@masa/shared';
import { viewFor } from '../view';
import { IntentError } from './context';
import { emptyState, fightState, run } from './fixtures';

const dm = (s: TableState, intent: object) => run(s, 'dm', intent).state;
const monster = (s: TableState, name: string) =>
  s.encounter!.combatants.find((c) => c.kind === 'monster' && c.name === name) as MonsterCombatant;
const token = (s: TableState, label: string) => s.board.tokens.find((t) => t.label === label)!;
/** Harita açık, karakter ve iki canavar haritada. */
const laidOut = () => dm(dm(dm(fightState(), { type: 'board.setMap', mapId: 'map-1' }), { type: 'board.show', visible: true }), { type: 'board.placeCombatants' });
const player = (s: TableState) => viewFor('player', s, []) as PlayerView;

describe('harita', () => {
  it('haritayı ayarlar; harita kaldırılınca oyuncuya da kapanır', () => {
    let s = dm(emptyState, { type: 'board.setMap', mapId: 'map-1' });
    s = dm(s, { type: 'board.show', visible: true });
    expect(s.board).toMatchObject({ mapId: 'map-1', visible: true });
    expect(dm(s, { type: 'board.setMap', mapId: null }).board).toMatchObject({ mapId: null, visible: false });
  });

  it.each(['../etc/passwd', 'a b', '', 42, {}])('geçersiz dosya kimliğini reddeder: %j', (mapId) => {
    expect(() => dm(emptyState, { type: 'board.setMap', mapId })).toThrow(IntentError);
    expect(() => run(emptyState, 'player', { type: 'sheet.set', fileId: mapId })).toThrow(IntentError);
  });

  it('karakter ve canavarlar için birer jeton dizer; yinelenince çoğaltmaz', () => {
    const s = laidOut();
    expect(s.board.tokens.map((t) => [t.label, t.kind])).toEqual([
      ['Aria', 'character'], ['Goblin 1', 'monster'], ['İskelet 1', 'monster'],
    ]);
    expect(dm(s, { type: 'board.placeCombatants' }).board.tokens).toHaveLength(3);
  });

  it('oyuncu yalnızca kendi jetonunu, yalnızca harita açıkken oynatır', () => {
    const s = laidOut();
    const moved = run(s, 'player', { type: 'board.moveToken', tokenId: token(s, 'Aria').id, x: 0.25, y: 0.4 }).state;
    expect(token(moved, 'Aria')).toMatchObject({ x: 0.25, y: 0.4 });
    expect(() => run(s, 'player', { type: 'board.moveToken', tokenId: token(s, 'Goblin 1').id, x: 0.2, y: 0.2 }))
      .toThrow('Yalnızca kendi jetonunu oynatabilirsin');
    const closed = dm(s, { type: 'board.show', visible: false });
    expect(() => run(closed, 'player', { type: 'board.moveToken', tokenId: token(s, 'Aria').id, x: 0.2, y: 0.2 }))
      .toThrow(IntentError);
  });

  it('konumu harita sınırlarına sıkıştırır; sayı olmayanı reddeder', () => {
    const s = laidOut();
    const id = token(s, 'Goblin 1').id;
    expect(token(dm(s, { type: 'board.moveToken', tokenId: id, x: -3, y: 9 }), 'Goblin 1')).toMatchObject({ x: 0, y: 1 });
    expect(() => dm(s, { type: 'board.moveToken', tokenId: id, x: 'sol', y: 0 })).toThrow(IntentError);
    expect(() => dm(s, { type: 'board.moveToken', tokenId: id, x: Number.NaN, y: 0 })).toThrow(IntentError);
  });

  it('savaş bitince canavar jetonları kalkar; karakter ve işaretler kalır', () => {
    const s = dm(dm(laidOut(), { type: 'board.addMarker', label: 'Tuzak' }), { type: 'encounter.end' });
    expect(s.board.tokens.map((t) => t.label)).toEqual(['Aria', 'Tuzak']);
  });

  it('savaştan çıkarılan canavarın jetonu da kalkar', () => {
    const s = laidOut();
    const after = dm(s, { type: 'encounter.remove', combatantId: monster(s, 'Goblin 1').id });
    expect(after.board.tokens.map((t) => t.label)).toEqual(['Aria', 'İskelet 1']);
  });

  it('kırk jetondan fazlasına izin vermez', () => {
    let s = emptyState;
    for (let n = 0; n < 40; n += 1) s = dm(s, { type: 'board.addMarker', label: `İşaret ${n}` });
    expect(() => dm(s, { type: 'board.addMarker', label: 'fazla' })).toThrow('en fazla 40');
  });

  it('karakter sayfası dosyasını oyuncu da ayarlayabilir', () => {
    expect(run(emptyState, 'player', { type: 'sheet.set', fileId: 'sheet-1' }).state.sheetId).toBe('sheet-1');
  });
});

describe('harita: oyuncu görünümü', () => {
  it('harita kapalıyken hiçbir şey göstermez', () => {
    expect(player(dm(laidOut(), { type: 'board.show', visible: false })).board).toBeNull();
  });

  it('gizli jetonları ve gizli adları göstermez; can durumunu kademe olarak verir', () => {
    let s = laidOut();
    s = dm(s, { type: 'board.patchToken', tokenId: token(s, 'İskelet 1').id, hidden: true });
    s = dm(s, { type: 'combatant.patch', combatantId: monster(s, 'Goblin 1').id, patch: { revealName: false, hp: 3 } });
    s = dm(s, { type: 'board.patchToken', tokenId: token(s, 'Goblin 1').id, label: 'Goblin şefi (gizli not)' });
    const board = player(s).board!;
    expect(board.tokens.map((t) => [t.label, t.kind, t.band, t.mine])).toEqual([
      ['Aria', 'character', 'healthy', true],
      ['Bilinmeyen yaratık', 'monster', 'bloodied', false],
    ]);
    // İskelet savaş listesinde zaten görünür; burada sızmaması gereken, gizlenen jetonu ve DM'in notu.
    const json = JSON.stringify(board);
    for (const leak of ['combatantId', 'hidden', 'Goblin', 'İskelet']) expect(json).not.toContain(leak);
    expect(JSON.stringify(player(s))).not.toContain('gizli not');
  });

  it('DM haritanın tamamını görür', () => {
    const s = laidOut();
    expect(viewFor('dm', s, [])).toMatchObject({ board: s.board, sheetId: null });
  });
});
