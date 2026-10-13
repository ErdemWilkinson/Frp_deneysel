import { describe, expect, it } from 'vitest';
import { RACES, SPELLS, filterSpells } from './index';

describe('büyüler ve ırklar kitabı', () => {
  it('her büyünün kimliği tekildir ve alanları doludur', () => {
    expect(new Set(SPELLS.map((s) => s.id)).size).toBe(SPELLS.length);
    for (const s of SPELLS) {
      expect(s.name.tr && s.name.en && s.time && s.range && s.duration && s.summary, s.id).toBeTruthy();
      expect(s.classes.length, s.id).toBeGreaterThan(0);
      expect(s.level).toBeGreaterThanOrEqual(0);
      expect(s.level).toBeLessThanOrEqual(9);
    }
  });

  it('büyü hileleri ve her seviye kitapta bulunur', () => {
    expect(SPELLS.filter((s) => s.level === 0).length).toBeGreaterThanOrEqual(20);
    for (let n = 1; n <= 9; n += 1) expect(SPELLS.some((s) => s.level === n), `seviye ${n}`).toBe(true);
  });

  it('metin, seviye ve sınıf süzgeci çalışır; Türkçe harfler duyarsızdır', () => {
    expect(filterSpells(SPELLS, { text: 'ates topu' }).map((s) => s.id)).toEqual(['fireball']);
    expect(filterSpells(SPELLS, { text: 'fireball' })).toHaveLength(1);
    expect(filterSpells(SPELLS, { level: 3, cls: 'C' }).every((s) => s.level === 3 && s.classes.includes('C'))).toBe(true);
  });

  it('SRD ırkları tamdır', () => {
    expect(RACES.map((r) => r.id).sort()).toEqual(
      ['dragonborn', 'dwarf', 'elf', 'gnome', 'half-elf', 'half-orc', 'halfling', 'human', 'tiefling']);
  });
});
