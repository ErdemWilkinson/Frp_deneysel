import { describe, expect, it } from 'vitest';
import { validateMonster } from '@masa/shared';
import { IntentError } from './context';
import { emptyState, fightState, run } from './fixtures';

export const draft = {
  id: 'custom-gece-kurdu', name: 'Gece Kurdu', size: 'Large', type: 'monstrosity', ac: 14, hp: 45, hitDice: '6d10+12',
  speed: '50 ft.', abilities: { str: 18, dex: 15, con: 14, int: 6, wis: 12, cha: 8 }, cr: 3, xp: 700,
  resistances: ['cold'], immunities: [], vulnerabilities: ['radiant', 'radiant'], regions: ['forest', 'arctic'],
  saves: { dex: 4 },
  traits: [{ name: 'Karanlıkta Av', text: 'Loş ışıkta ve karanlıkta gizlenme zarlarında avantajlıdır.' }],
  actions: [
    { name: 'Isırık', text: '', attack: { bonus: 6, damage: [{ dice: '2d6 + 4', type: 'piercing' }, { dice: '1d6', type: 'cold' }] } },
    { name: 'Uluma', text: '30 ft. içindeki her yaratık zorluk derecesi 13 Bilgelik kurtarma zarı atar.' },
  ],
  legendaryActions: [],
};
const save = (monster: unknown, role: 'dm' | 'player' = 'dm') => run(emptyState, role, { type: 'monster.save', monster });

describe('monster.save', () => {
  it('geçerli bir canavarı şemaya uygun kurar ve sonuçta döndürür', () => {
    const out = save(draft);
    const m = (out.monster as { save: any }).save;
    expect(validateMonster(m)).toEqual([]);
    expect(m).toMatchObject({
      id: 'custom-gece-kurdu', name: { tr: 'Gece Kurdu', en: 'Gece Kurdu' }, hitDice: '6d10+12',
      vulnerabilities: ['radiant'], saves: { dex: 4 }, legendaryCount: 0,
    });
    expect(m.actions[0].attack).toEqual({ bonus: 6, damage: [{ dice: '2d6+4', type: 'piercing' }, { dice: '1d6', type: 'cold' }] });
    expect(m.actions[1].attack).toBeUndefined();
    expect(out.state).toEqual(emptyState);
  });

  it('formda olmayan alanları taşımaz', () => {
    const m = (save({ ...draft, isAdmin: true, actions: [{ ...draft.actions[1], script: 'x' }] }).monster as { save: any }).save;
    expect(JSON.stringify(m)).not.toMatch(/isAdmin|script/);
  });

  it.each([
    ['SRD kimliğinin üzerine yazmak', { id: 'goblin' }],
    ['kimlikte büyük harf', { id: 'custom-Kurt' }],
    ['boş ad', { name: ' ' }],
    ['bozuk can zarı', { hitDice: '6dx' }],
    ['Zırh sınıfı aralık dışı', { ac: 99 }],
    ['CR aralık dışı', { cr: 31 }],
    ['bilinmeyen hasar türü', { actions: [{ name: 'Lazer', attack: { bonus: 5, damage: [{ dice: '1d6', type: 'laser' }] } }] }],
    ['bozuk hasar zarı', { actions: [{ name: 'Isırık', attack: { bonus: 5, damage: [{ dice: 'çok', type: 'piercing' }] } }] }],
    ['bilinmeyen bölge', { regions: ['moon'] }],
    ['çok fazla eylem', { actions: Array.from({ length: 21 }, () => draft.actions[1]) }],
  ])('reddeder: %s', (_label, patch) => {
    expect(() => save({ ...draft, ...patch })).toThrow(IntentError);
  });

  it('oyuncu canavar yaratamaz', () => {
    expect(() => save(draft, 'player')).toThrow('Bu işlem yalnızca DM içindir');
  });
});

describe('monster.delete', () => {
  it('SRD canavarını ya da olmayan kaydı silmez', () => {
    expect(() => run(emptyState, 'dm', { type: 'monster.delete', monsterId: 'goblin' })).toThrow('Yalnızca kendi yarattığın');
    expect(() => run(emptyState, 'dm', { type: 'monster.delete', monsterId: 'custom-yok' })).toThrow(IntentError);
  });
  it('karşılaşmadaki canavarı silmez', () => {
    expect(() => run(fightState(), 'dm', { type: 'monster.delete', monsterId: 'goblin' })).toThrow(IntentError);
  });
});
