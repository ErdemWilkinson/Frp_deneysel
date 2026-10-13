import { describe, expect, it } from 'vitest';
import type { PlayerView, TableState } from '@masa/shared';
import { viewFor } from '../view';
import { IntentError } from './context';
import { emptyState, heroInput, run } from './fixtures';

const draft = (): TableState => {
  let s = run(emptyState, 'player', { type: 'character.set', character: heroInput }).state;
  s = run(s, 'dm', { type: 'encounter.addMonster', monsterId: 'goblin', count: 1, hpMode: 'average' }).state;
  return run(s, 'dm', { type: 'encounter.addMonster', monsterId: 'skeleton', count: 1, hpMode: 'average' }).state;
};
const started = (): TableState => run(draft(), 'dm', { type: 'encounter.start' }).state;
const player = (s: TableState) => viewFor('player', s, []) as PlayerView;

describe('inisiyatif aşaması', () => {
  it('savaş başlayınca zar atılmaz; kimsenin sırası yoktur ve oyuncu zarı bekler', () => {
    const s = started();
    expect(s.encounter).toMatchObject({ status: 'initiative', round: 0 });
    expect(s.encounter!.combatants.every((c) => c.initiative === null)).toBe(true);
    expect(player(s).encounter).toMatchObject({ phase: 'initiative' });
    expect(player(s).encounter!.combatants.some((c) => c.current)).toBe(false);
  });

  it('oyuncu kendi çeviklik zarını atar; bir kez', () => {
    const out = run(started(), 'player', { type: 'combat.rollInitiative' }, 15);
    const me = out.state.encounter!.combatants.find((c) => c.kind === 'character')!;
    expect(me.initiative).toBe(16); // 15 + çeviklik 12 → +1
    expect(out.log[0]!.text).toBe('Aria inisiyatif zarı attı: 16 (zar 15 +1)');
    expect(() => run(out.state, 'player', { type: 'combat.rollInitiative' }, 3)).toThrow('zaten attın');
  });

  it('DM yaratıkların zarını tek seferde ya da tek tek atar', () => {
    const begun = started();
    const all = run(begun, 'dm', { type: 'combat.rollInitiative' }, 10, 5).state;
    expect(all.encounter!.combatants.filter((c) => c.kind === 'monster').map((c) => c.initiative)).toEqual([12, 7]);
    expect(() => run(all, 'dm', { type: 'combat.rollInitiative' })).toThrow('kalmadı');

    const second = begun.encounter!.combatants[1]!;
    const one = run(begun, 'dm', { type: 'combat.rollInitiative', combatantId: second.id }, 20).state;
    expect(one.encounter!.combatants.map((c) => c.initiative)).toEqual([null, 22, null]);
  });

  it('DM tüm zarlar atılmadan sırayı kuramaz; kurunca sıra zarlara göre dizilir', () => {
    let s = run(started(), 'dm', { type: 'combat.rollInitiative' }, 10, 5).state;
    expect(() => run(s, 'dm', { type: 'combat.begin' })).toThrow('Aria');
    s = run(s, 'player', { type: 'combat.rollInitiative' }, 15).state;
    s = run(s, 'dm', { type: 'combat.begin' }).state;
    expect(s.encounter).toMatchObject({ status: 'active', round: 1, turnIndex: 0 });
    expect(s.encounter!.combatants.map((c) => c.initiative)).toEqual([16, 12, 7]);
    expect(player(s).encounter).toMatchObject({ phase: 'combat', round: 1 });
  });

  it('oyuncu sırayı kuramaz, yaratık adına zar atamaz; zar aşaması dışında zar istenmez', () => {
    const s = started();
    expect(() => run(s, 'player', { type: 'combat.begin' })).toThrow('Bu işlem yalnızca DM içindir');
    const sneaky = run(s, 'player', { type: 'combat.rollInitiative', combatantId: s.encounter!.combatants[0]!.id }, 5).state;
    expect(sneaky.encounter!.combatants.map((c) => c.initiative)).toEqual([null, null, 6]);
    expect(() => run(draft(), 'player', { type: 'combat.rollInitiative' }, 5)).toThrow(IntentError);
  });

  it('savaş bitirilince inisiyatif aşamasından da çıkılır', () => {
    const s = run(started(), 'dm', { type: 'encounter.end' }).state;
    expect(s.encounter).toBeNull();
  });
});
