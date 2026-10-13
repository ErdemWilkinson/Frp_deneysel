import { scripted } from '@masa/shared/testing';
import { newTable, type Intent, type Monster, type Role, type TableState } from '@masa/shared';
import type { Outcome } from './context';
import { reduce } from './reduce';

const base = {
  size: 'Medium', type: 'humanoid', speed: '30 ft.', saves: {}, skills: {}, resistances: [],
  immunities: [], vulnerabilities: [], defenseNotes: [], conditionImmunities: [], senses: '',
  languages: '', traits: [], legendaryActions: [], legendaryCount: 0,
} satisfies Partial<Monster>;

export const goblin: Monster = {
  ...base, id: 'goblin', name: { tr: 'Goblin', en: 'Goblin' }, ac: 15, hp: 7, hitDice: '2d6',
  abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 }, cr: 0.25, xp: 50, regions: ['forest'],
  actions: [
    { name: { tr: 'Pala', en: 'Scimitar' }, text: { tr: null, en: 'Melee Weapon Attack.' },
      attack: { bonus: 4, damage: [{ dice: '1d6+2', type: 'slashing' }] } },
    { name: { tr: 'Çevik Kaçış', en: 'Nimble Escape' }, text: { tr: null, en: 'Disengage or Hide.' } },
  ],
};

export const skeleton: Monster = {
  ...base, id: 'skeleton', name: { tr: 'İskelet', en: 'Skeleton' }, type: 'undead', ac: 13, hp: 13,
  hitDice: '2d8+4', abilities: { str: 10, dex: 14, con: 15, int: 6, wis: 8, cha: 5 }, cr: 0.25, xp: 50,
  vulnerabilities: ['bludgeoning'], immunities: ['poison'], regions: ['ruins'],
  actions: [{ name: { tr: 'Kısa Kılıç', en: 'Shortsword' }, text: { tr: null, en: 'Melee Weapon Attack.' },
    attack: { bonus: 4, damage: [{ dice: '1d6+2', type: 'piercing' }] } }],
};

export const wyrm: Monster = {
  ...base, id: 'wyrm', name: { tr: null, en: 'Wyrm' }, type: 'dragon', ac: 18, hp: 100, hitDice: '10d10+45',
  abilities: { str: 23, dex: 10, con: 21, int: 14, wis: 11, cha: 19 }, cr: 10, xp: 5900,
  resistances: ['fire'], legendaryCount: 3, regions: ['mountain'],
  actions: [{ name: { tr: null, en: 'Bite' }, text: { tr: null, en: 'Melee Weapon Attack.' },
    attack: { bonus: 10, damage: [{ dice: '2d10+6', type: 'piercing' }, { dice: '1d6', type: 'fire' }] } }],
};

export const heroInput = {
  name: 'Aria', level: 3, ac: 16, maxHp: 24, hp: 24, tempHp: 0,
  abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 },
  proficiency: 2, saveProficiencies: ['str', 'con'],
  attacks: [
    { name: 'Uzun Kılıç', bonus: 5, damage: '1d8+3', type: 'slashing' },
    { name: 'Gürz', bonus: 5, damage: '1d6+3', type: 'bludgeoning' },
  ],
};

export const emptyState: TableState = newTable('ABC123');

let counter = 0;
export const newId = (): string => `id${(counter += 1)}`;
export const monsters = (): Map<string, Monster> =>
  new Map([goblin, skeleton, wyrm].map((m) => [m.id, structuredClone(m)]));

/** Tek bir hamleyi, verilen zar yüzleriyle çalıştırır. */
export function run(state: TableState, role: Role, intent: unknown, ...faces: number[]): Outcome {
  return reduce(state, intent as Intent, role, { rng: scripted(...faces), monsters: monsters(), now: () => 1000, newId });
}

/**
 * Taslaktaki savaşı başlatır, inisiyatifleri verilen zar yüzleriyle atar ve sırayı kurar.
 * Yüzler: önce canavarların (taslaktaki sırayla), sonuncusu karakterin d20'si.
 */
export function startFight(state: TableState, ...faces: number[]): TableState {
  let s = run(state, 'dm', { type: 'encounter.start' }).state;
  const monsterFaces = faces.slice(0, -1);
  if (monsterFaces.length > 0) s = run(s, 'dm', { type: 'combat.rollInitiative' }, ...monsterFaces).state;
  s = run(s, 'player', { type: 'combat.rollInitiative' }, faces.at(-1)!).state;
  return run(s, 'dm', { type: 'combat.begin' }).state;
}

/** Aria, Goblin 1 ve İskelet 1 ile süren bir savaş. Sıra: Aria (16), Goblin 1 (12), İskelet 1 (7). */
export function fightState(): TableState {
  let s = run(emptyState, 'player', { type: 'character.set', character: heroInput }).state;
  s = run(s, 'dm', { type: 'encounter.addMonster', monsterId: 'goblin', count: 1, hpMode: 'average' }).state;
  s = run(s, 'dm', { type: 'encounter.addMonster', monsterId: 'skeleton', count: 1, hpMode: 'average' }).state;
  s = startFight(s, 10, 5, 15);
  // Aria iki canavarın da dibinde durur; yakın dövüş menzili sınamaları ayrı dosyadadır.
  const aria = s.board.tokens.find((t) => t.kind === 'character')!;
  return run(s, 'dm', { type: 'board.moveToken', tokenId: aria.id, x: 0.125, y: 0.12 }).state;
}
