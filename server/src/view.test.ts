import { describe, expect, it } from 'vitest';
import type { LogEntry, MonsterCombatant, PlayerView, TableState } from '@masa/shared';
import { emptyState, fightState, run } from './game/fixtures';
import { viewFor } from './view';

const monster = (s: TableState, name: string) =>
  s.encounter!.combatants.find((c) => c.kind === 'monster' && c.name === name) as MonsterCombatant;
const patch = (s: TableState, name: string, p: object) =>
  run(s, 'dm', { type: 'combatant.patch', combatantId: monster(s, name).id, patch: p }).state;

/** Goblin 1: adı gizli, 3/7 can puanı. İskelet 1: can puanı açık. */
function scene(): TableState {
  let s = fightState();
  s = patch(s, 'Goblin 1', { hp: 3, revealName: false });
  return patch(s, 'İskelet 1', { revealHp: true });
}
const log: LogEntry[] = [
  { id: 'a', at: 1, actor: 'dm', visibility: 'public', kind: 'roll', text: 'DM gizlice zar attı' },
  { id: 'b', at: 2, actor: 'dm', visibility: 'dm', kind: 'roll', text: 'DM zar attı: 1d20 → 13 [13]' },
];
const player = (s: TableState) => viewFor('player', s, log) as PlayerView;

describe('viewFor: oyuncu', () => {
  it('canavarlar için yalnızca izin verilen alanları içerir', () => {
    for (const c of player(scene()).encounter!.combatants) {
      expect(Object.keys(c).filter((k) => k !== 'identifiable').sort()).toEqual(
        ['band', 'conditions', 'current', 'hp', 'id', 'initiative', 'kind', 'maxHp', 'moveLeft', 'name'],
      );
    }
  });

  it('gizli adı ve gizli can puanı değerini göstermez, kademeyi gösterir', () => {
    const [hero, hidden, open] = player(scene()).encounter!.combatants;
    expect(hero).toMatchObject({ kind: 'character', name: 'Aria', hp: 24, maxHp: 24, band: 'healthy', current: true });
    expect(hidden).toMatchObject({ name: 'Bilinmeyen yaratık', hp: null, maxHp: null, band: 'bloodied', current: false });
    expect(open).toMatchObject({ name: 'İskelet 1', hp: 13, maxHp: 13, band: 'healthy' });
  });

  it('serileştirilmiş görünümde stat block izine rastlanmaz', () => {
    const json = JSON.stringify(player(scene()));
    for (const leak of ['monsterId', 'dexMod', 'revealName', 'revealHp', 'legendaryLeft', 'Goblin', '"goblin"']) {
      expect(json).not.toContain(leak);
    }
  });

  it('taslak karşılaşmayı göstermez', () => {
    const draft = run(emptyState, 'dm', { type: 'encounter.addMonster', monsterId: 'goblin', count: 1, hpMode: 'average' }).state;
    expect(player(draft).encounter).toBeNull();
  });

  it('yalnızca herkese açık günlük kayıtlarını içerir', () => {
    expect(player(scene()).log.map((l) => l.id)).toEqual(['a']);
  });
});

describe('viewFor: DM', () => {
  it('durumun ve günlüğün tamamını görür', () => {
    const s = scene();
    expect(viewFor('dm', s, log)).toEqual({
      role: 'dm', code: s.code, character: s.character, encounter: s.encounter, board: s.board, world: s.world, sheetId: null, theater: false, identify: false, log,
    });
  });
});
