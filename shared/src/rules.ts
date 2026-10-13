import { rollD20, type Rng, type RollMode } from './dice';

export interface AttackResult { rolls: number[]; kept: number; total: number; outcome: 'crit' | 'hit' | 'miss' }
export interface SaveResult { rolls: number[]; kept: number; total: number; success: boolean | null }
export interface Defenses { resistances: string[]; immunities: string[]; vulnerabilities: string[] }
export interface DeathSaves { successes: number; failures: number }
export type HpBand = 'healthy' | 'hurt' | 'bloodied' | 'down';

export const NO_DEFENSES: Defenses = { resistances: [], immunities: [], vulnerabilities: [] };

export const abilityMod = (score: number): number => Math.floor((score - 10) / 2);

export function resolveAttack(bonus: number, targetAc: number, mode: RollMode, rng: Rng): AttackResult {
  const { rolls, kept } = rollD20(rng, mode);
  const total = kept + bonus;
  const outcome = kept === 20 ? 'crit' : kept === 1 ? 'miss' : total >= targetAc ? 'hit' : 'miss';
  return { rolls, kept, total, outcome };
}

export function adjustDamage(amount: number, type: string, d: Defenses): number {
  let value = Math.max(0, amount);
  if (d.immunities.includes(type)) return 0;
  if (d.resistances.includes(type)) value = Math.floor(value / 2);
  if (d.vulnerabilities.includes(type)) value *= 2;
  return value;
}

export function applyDamage(v: { hp: number; tempHp: number }, amount: number): { hp: number; tempHp: number } {
  const damage = Math.max(0, amount);
  const absorbed = Math.min(v.tempHp, damage);
  return { tempHp: v.tempHp - absorbed, hp: Math.max(0, v.hp - (damage - absorbed)) };
}

export const heal = (v: { hp: number; maxHp: number }, amount: number): number =>
  Math.min(v.maxHp, v.hp + Math.max(0, amount));

export function resolveSave(bonus: number, dc: number | null, mode: RollMode, rng: Rng): SaveResult {
  const { rolls, kept } = rollD20(rng, mode);
  const total = kept + bonus;
  return { rolls, kept, total, success: dc === null ? null : total >= dc };
}

export function rollDeathSave(s: DeathSaves, rng: Rng) {
  const roll = rng(20);
  if (roll === 20) return { roll, saves: { successes: 0, failures: 0 }, outcome: 'revive' as const };
  const saves = { ...s };
  if (roll >= 10) saves.successes = Math.min(3, saves.successes + 1);
  else saves.failures = Math.min(3, saves.failures + (roll === 1 ? 2 : 1));
  const outcome =
    saves.failures >= 3 ? 'dead' : saves.successes >= 3 ? 'stable' : roll >= 10 ? 'success' : 'failure';
  return { roll, saves, outcome: outcome as 'success' | 'failure' | 'stable' | 'dead' };
}

export function sortInitiative<T extends { initiative: number; dexMod: number }>(list: T[]): T[] {
  return list
    .map((item, index) => ({ item, index }))
    .sort((a, b) =>
      b.item.initiative - a.item.initiative || b.item.dexMod - a.item.dexMod || a.index - b.index)
    .map((x) => x.item);
}

export function hpBand(hp: number, maxHp: number): HpBand {
  if (hp <= 0) return 'down';
  if (hp * 2 <= maxHp) return 'bloodied';
  return hp < maxHp ? 'hurt' : 'healthy';
}
