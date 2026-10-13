import { describe, expect, it } from 'vitest';
import { validateMonster } from '@masa/shared';
import { transformMonster } from './transform';

const raw = {
  index: 'young-red-dragon', name: 'Young Red Dragon', size: 'Large', type: 'dragon',
  armor_class: [{ type: 'natural', value: 18 }], hit_points: 178, hit_dice: '17d10',
  hit_points_roll: '17d10+85', speed: { walk: '40 ft.', climb: '40 ft.', fly: '80 ft.' },
  strength: 23, dexterity: 10, constitution: 21, intelligence: 14, wisdom: 11, charisma: 19,
  proficiencies: [
    { value: 4, proficiency: { index: 'saving-throw-dex' } },
    { value: 8, proficiency: { index: 'skill-perception' } },
  ],
  damage_vulnerabilities: [], damage_resistances: ['bludgeoning, piercing, and slashing from nonmagical attacks'],
  damage_immunities: ['fire'], condition_immunities: [{ index: 'frightened', name: 'Frightened' }],
  senses: { blindsight: '30 ft.', passive_perception: 18 }, languages: 'Common, Draconic',
  challenge_rating: 10, xp: 5900,
  special_abilities: [{ name: 'Amphibious', desc: 'Can breathe air and water.' }],
  actions: [
    { name: 'Bite', desc: 'Melee Weapon Attack...', attack_bonus: 10, damage: [
      { damage_type: { index: 'piercing' }, damage_dice: '2d10+6' },
      { damage_type: { index: 'fire' }, damage_dice: '1d6' },
    ] },
    { name: 'Fire Breath', desc: 'The dragon exhales fire...', damage: [{ damage_type: { index: 'fire' }, damage_dice: '16d6' }] },
    { name: 'Claw', desc: 'Melee...', attack_bonus: 10, damage: [{ choose: 1, from: {} }] },
  ],
  legendary_actions: [{ name: 'Detect', desc: 'Makes a Perception check.' }],
};

describe('transformMonster', () => {
  const m = transformMonster(raw);

  it('geçerli bir Monster üretir', () => {
    expect(validateMonster(m)).toEqual([]);
  });
  it('temel alanları taşır; can puanı zarı olarak değiştiricili ifadeyi kullanır', () => {
    expect(m).toMatchObject({
      id: 'young-red-dragon', name: { tr: null, en: 'Young Red Dragon' }, ac: 18, hp: 178,
      hitDice: '17d10+85', speed: '40 ft., climb 40 ft., fly 80 ft.', cr: 10, xp: 5900,
      abilities: { str: 23, dex: 10, con: 21, int: 14, wis: 11, cha: 19 },
      saves: { dex: 4 }, skills: { perception: 8 }, legendaryCount: 3, regions: [],
      senses: 'blindsight 30 ft., passive perception 18', conditionImmunities: ['frightened'],
    });
  });
  it('tek türe inen savunmaları yapılandırır, gerisini not olarak tutar', () => {
    expect(m.immunities).toEqual(['fire']);
    expect(m.resistances).toEqual([]);
    expect(m.defenseNotes).toEqual(['Resistance: bludgeoning, piercing, and slashing from nonmagical attacks']);
  });
  it('yalnızca isabet bonusu ve geçerli hasar zarı olan eylemleri saldırı sayar', () => {
    expect(m.actions[0]!.attack).toEqual({
      bonus: 10, damage: [{ dice: '2d10+6', type: 'piercing' }, { dice: '1d6', type: 'fire' }],
    });
    expect(m.actions[1]!.attack).toBeUndefined();
    expect(m.actions[2]!.attack).toBeUndefined();
  });
  it('eski biçimdeki sayısal zırh sınıfı değerini de kabul eder', () => {
    expect(transformMonster({ ...raw, armor_class: 13 }).ac).toBe(13);
  });
});
