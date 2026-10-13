import { describe, expect, it } from 'vitest';
import { buildLimits, countSpells, pickableSpells, spellAttack, weaponAttack, weaponsFor, WEAPONS } from './index';

const abil = { str: 10, dex: 14, con: 12, int: 16, wis: 12, cha: 10 };

describe('karakter yaratma sınırları', () => {
  it('sihirbaz 1. seviyede üç büyü hilesi ve zekâ + seviye kadar büyü seçer', () => {
    const l = buildLimits('Sihirbaz', 1, abil);
    expect(l).toMatchObject({ cantrips: 3, spells: 4, maxSpellLevel: 1, ability: 'int' });
  });

  it('büyü hilesi 4. seviyede artar; yüksek elf ek bir hile alır', () => {
    expect(buildLimits('Sihirbaz', 4, abil).cantrips).toBe(4);
    expect(buildLimits('Sihirbaz', 1, abil, 'Yüksek elf').cantrips).toBe(4);
    expect(buildLimits('Savaşçı', 1, abil, 'Yüksek elf').cantrips).toBe(1);
  });

  it('büyü yapmayan sınıfta büyü yoktur; paladin 1. seviyede büyü seçemez', () => {
    expect(buildLimits('Barbar', 5, abil)).toMatchObject({ spellClass: null, cantrips: 0, spells: 0 });
    expect(buildLimits('Paladin', 1, abil).spells).toBe(0);
    expect(buildLimits('Paladin', 5, abil).maxSpellLevel).toBe(2);
  });

  it('sorcerer 1. seviyede iki büyü bilir; warlock büyü seviyesi paktan gelir', () => {
    expect(buildLimits('Sorcerer', 1, abil)).toMatchObject({ cantrips: 4, spells: 2 });
    expect(buildLimits('Warlock', 5, abil).maxSpellLevel).toBe(3);
  });

  it('seçilebilen büyüler yalnızca sınıfın listesindedir', () => {
    const names = pickableSpells('Sihirbaz').map((s) => s.id);
    expect(names).toContain('fire-bolt');
    expect(names).not.toContain('sacred-flame');
    expect(pickableSpells('Barbar')).toHaveLength(0);
  });

  it('silahlar sınıfa göre süzülür ve bonusu kuvvet ya da çeviklikten gelir', () => {
    expect(weaponsFor('Sihirbaz').every((w) => !w.martial)).toBe(true);
    expect(weaponsFor('Savaşçı')).toHaveLength(WEAPONS.length);
    const sword = WEAPONS.find((w) => w.name === 'Uzun Kılıç')!;
    expect(weaponAttack(sword, 2, { ...abil, str: 16 })).toMatchObject({ bonus: 5, damage: '1d8+3' });
    const bow = WEAPONS.find((w) => w.name === 'Kısa Yay')!;
    expect(weaponAttack(bow, 2, abil)).toMatchObject({ bonus: 4, range: 80 });
  });

  it('büyü saldırısı yetkinlik ve büyü yeteneğini kullanır ve sayılır', () => {
    const fireBolt = pickableSpells('Sihirbaz').find((s) => s.id === 'fire-bolt')!;
    const a = spellAttack(fireBolt, 2, abil, 'int');
    expect(a).toMatchObject({ name: 'Ateş Oku', bonus: 5, damage: '1d10', type: 'fire', range: 120 });
    expect(countSpells([a], pickableSpells('Sihirbaz'))).toEqual({ cantrips: 1, spells: 0 });
  });
});
