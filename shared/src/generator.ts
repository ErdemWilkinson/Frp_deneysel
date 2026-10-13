import type { Rng } from './dice';
import { inRegion } from './monster';
import type { Difficulty, Monster, Region } from './types';

export class GenerateError extends Error {}

export const BUDGET_FACTOR: Record<Difficulty, number> = { easy: 0.125, medium: 0.25, hard: 0.5, deadly: 0.75 };
export const MAX_GENERATED = 4;

export const crBudget = (level: number, difficulty: Difficulty): number => level * BUDGET_FACTOR[difficulty];

// CR 0 yaratıklar bütçeyi hiç tüketmesin diye küçük bir taban maliyet.
const cost = (m: Monster): number => Math.max(m.cr, 0.05);

export function generateEncounter(
  input: { region: Region; level: number; difficulty: Difficulty },
  monsters: Monster[],
  rng: Rng,
): string[] {
  const pool = monsters.filter((m) => inRegion(m, input.region));
  let remaining = crBudget(input.level, input.difficulty);
  const picked: string[] = [];
  while (picked.length < MAX_GENERATED) {
    const fits = pool
      .filter((m) => cost(m) <= remaining + 1e-9)
      .sort((a, b) => b.cr - a.cr || a.id.localeCompare(b.id));
    if (fits.length === 0) break;
    // Bütçeye sığanların güçlü yarısından seç; yoksa karşılaşma hep en zayıf yaratıklarla dolar.
    const strong = fits.slice(0, Math.max(1, Math.ceil(fits.length / 2)));
    const choice = strong[rng(strong.length) - 1]!;
    picked.push(choice.id);
    remaining -= cost(choice);
  }
  if (picked.length === 0) throw new GenerateError('Bu bölgede bu zorluğa uyan canavar yok');
  return picked;
}
