import { describe, expect, it } from 'vitest';
import { displayName, filterMonsters, validateMonster } from './monster';
import type { Monster } from './types';

export const goblin: Monster = {
  id: 'goblin', name: { tr: 'Goblin', en: 'Goblin' }, size: 'Small', type: 'humanoid',
  ac: 15, hp: 7, hitDice: '2d6', speed: '30 ft.',
  abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 },
  saves: {}, skills: { stealth: 6 }, resistances: [], immunities: [], vulnerabilities: [],
  defenseNotes: [], conditionImmunities: [], senses: 'darkvision 60 ft.', languages: 'Common, Goblin',
  cr: 0.25, xp: 50, traits: [],
  actions: [{
    name: { tr: 'Pala', en: 'Scimitar' }, text: { tr: null, en: 'Melee Weapon Attack...' },
    attack: { bonus: 4, damage: [{ dice: '1d6+2', type: 'slashing' }] },
  }],
  legendaryActions: [], legendaryCount: 0, regions: ['forest', 'underground'],
};
const imp: Monster = {
  ...goblin, id: 'imp', name: { tr: 'İblis Yavrusu', en: 'Imp' }, type: 'fiend', size: 'Tiny',
  cr: 1, regions: ['planar'],
};

describe('validateMonster', () => {
  it('geçerli canavarda hata döndürmez', () => {
    expect(validateMonster(goblin)).toEqual([]);
  });
  it('bozuk alanları adıyla bildirir', () => {
    const errors = validateMonster({
      ...goblin, ac: 0, regions: ['moon'],
      actions: [{ ...goblin.actions[0]!, attack: { bonus: 4, damage: [{ dice: '1dx', type: 'slashing' }] } }],
    });
    expect(errors.join(' ')).toMatch(/ac/);
    expect(errors.join(' ')).toMatch(/regions/);
    expect(errors.join(' ')).toMatch(/actions\[0\]/);
  });
  it('nesne olmayan girdiyi reddeder', () => {
    expect(validateMonster(null)).toEqual(['canavar bir nesne değil']);
  });
});

describe('filterMonsters', () => {
  const list = [goblin, imp];
  it('iki dildeki ada göre arar; Türkçe İ/ı harflerinde takılmaz', () => {
    expect(filterMonsters(list, { text: 'IMP' }).map((m) => m.id)).toEqual(['imp']);
    expect(filterMonsters(list, { text: 'iblis' }).map((m) => m.id)).toEqual(['imp']);
    expect(filterMonsters(list, { text: 'GOBLİN' }).map((m) => m.id)).toEqual(['goblin']);
  });
  it('bölge, tür, boyut ve CR aralığına göre süzer', () => {
    expect(filterMonsters(list, { region: 'planar' }).map((m) => m.id)).toEqual(['imp']);
    expect(filterMonsters(list, { type: 'humanoid' }).map((m) => m.id)).toEqual(['goblin']);
    expect(filterMonsters(list, { size: 'Tiny' }).map((m) => m.id)).toEqual(['imp']);
    expect(filterMonsters(list, { crMin: 0.5 }).map((m) => m.id)).toEqual(['imp']);
    expect(filterMonsters(list, { crMax: 0.5 }).map((m) => m.id)).toEqual(['goblin']);
  });
  it('boş filtre hepsini ada göre sıralı döndürür', () => {
    expect(filterMonsters([imp, goblin], {}).map((m) => m.id)).toEqual(['goblin', 'imp']);
  });
});

describe('displayName', () => {
  it('Türkçesi yoksa İngilizcesine düşer', () => {
    expect(displayName({ tr: null, en: 'Imp' })).toBe('Imp');
    expect(displayName({ tr: 'İblis', en: 'Imp' })).toBe('İblis');
  });
});
