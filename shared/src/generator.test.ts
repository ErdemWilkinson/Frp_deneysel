import { describe, expect, it } from 'vitest';
import { GenerateError, crBudget, generateEncounter } from './generator';
import { scripted } from './testing';
import type { Monster } from './types';

const m = (id: string, cr: number, regions: Monster['regions']) => ({ id, cr, regions }) as Monster;
const pool = [
  m('rat', 0, ['urban']), m('goblin', 0.25, ['forest']), m('wolf', 0.25, ['forest']),
  m('bugbear', 1, ['forest']), m('owlbear', 3, ['forest']), m('shark', 2, ['underwater']),
];
const sumCr = (ids: string[]) => ids.reduce((n, id) => n + pool.find((x) => x.id === id)!.cr, 0);

describe('crBudget', () => {
  it('seviye ve zorlukla büyür', () => {
    expect(crBudget(4, 'easy')).toBe(0.5);
    expect(crBudget(4, 'medium')).toBe(1);
    expect(crBudget(4, 'hard')).toBe(2);
    expect(crBudget(4, 'deadly')).toBe(3);
  });
});

describe('generateEncounter', () => {
  it('yalnızca seçilen bölgeden canavar alır ve bütçeyi aşmaz', () => {
    for (let face = 1; face <= 2; face += 1) {
      const ids = generateEncounter({ region: 'forest', level: 4, difficulty: 'hard' }, pool, () => face);
      expect(ids.length).toBeGreaterThan(0);
      expect(ids.every((id) => pool.find((x) => x.id === id)!.regions.includes('forest'))).toBe(true);
      expect(sumCr(ids)).toBeLessThanOrEqual(2);
    }
  });
  it('en fazla dört canavar seçer', () => {
    const ids = generateEncounter({ region: 'forest', level: 20, difficulty: 'deadly' }, pool, () => 1);
    expect(ids.length).toBeLessThanOrEqual(4);
  });
  it('aynı zarlarla aynı sonucu verir', () => {
    const run = () => generateEncounter({ region: 'forest', level: 4, difficulty: 'medium' }, pool, scripted(1));
    expect(run()).toEqual(run());
    expect(run()).toEqual(['bugbear']);
  });
  it('bölgede bütçeye uyan canavar yoksa anlaşılır hata verir', () => {
    expect(() => generateEncounter({ region: 'underwater', level: 1, difficulty: 'easy' }, pool, () => 1))
      .toThrow(GenerateError);
    expect(() => generateEncounter({ region: 'arctic', level: 10, difficulty: 'hard' }, pool, () => 1))
      .toThrow('Bu bölgede bu zorluğa uyan canavar yok');
  });
});
