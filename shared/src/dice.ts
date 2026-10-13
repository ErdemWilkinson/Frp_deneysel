export type Rng = (sides: number) => number;
export type RollMode = 'normal' | 'advantage' | 'disadvantage';
export interface DiceTerm { count: number; sides: number }
export interface DiceExpr { terms: DiceTerm[]; modifier: number }
export interface RollResult { dice: { sides: number; value: number }[]; modifier: number; total: number }
export class DiceError extends Error {}

export const MAX_DICE = 100;
export const MAX_SIDES = 1000;

// İfade bir zarla ya da sayıyla başlar; sonrasında zar yalnızca eklenir, sayı eklenir ya da çıkarılır.
const SHAPE = /^(\d*d\d+|\d+)(\+\d*d\d+|[+-]\d+)*$/;
const TERM = /([+-]?)(?:(\d*)d(\d+)|(\d+))/g;

export function parseDice(input: string): DiceExpr {
  const text = typeof input === 'string' ? input.replace(/\s+/g, '').toLowerCase() : '';
  if (!text || text.length > 60 || !SHAPE.test(text)) throw new DiceError('Geçersiz zar ifadesi');
  const terms: DiceTerm[] = [];
  let modifier = 0;
  for (const m of text.matchAll(TERM)) {
    if (m[3] !== undefined) {
      const count = m[2] ? Number(m[2]) : 1;
      const sides = Number(m[3]);
      if (count < 1 || sides < 2 || sides > MAX_SIDES) throw new DiceError('Geçersiz zar ifadesi');
      terms.push({ count, sides });
    } else {
      modifier += (m[1] === '-' ? -1 : 1) * Number(m[4]);
    }
  }
  if (terms.reduce((n, t) => n + t.count, 0) > MAX_DICE) {
    throw new DiceError(`En fazla ${MAX_DICE} zar atılabilir`);
  }
  return { terms, modifier };
}

export function rollExpr(input: string, rng: Rng, opts: { critical?: boolean } = {}): RollResult {
  const { terms, modifier } = parseDice(input);
  const dice: RollResult['dice'] = [];
  for (const term of terms) {
    const count = opts.critical ? term.count * 2 : term.count;
    for (let i = 0; i < count; i += 1) dice.push({ sides: term.sides, value: rng(term.sides) });
  }
  return { dice, modifier, total: dice.reduce((n, d) => n + d.value, 0) + modifier };
}

export function rollD20(rng: Rng, mode: RollMode): { rolls: number[]; kept: number } {
  if (mode === 'normal') {
    const roll = rng(20);
    return { rolls: [roll], kept: roll };
  }
  const rolls = [rng(20), rng(20)];
  return { rolls, kept: mode === 'advantage' ? Math.max(...rolls) : Math.min(...rolls) };
}
