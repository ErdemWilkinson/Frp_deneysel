import {
  DiceError, rollExpr, type Character, type Encounter, type LogEntry, type Monster,
  type MonsterCombatant, type Region, type Rng, type Role, type RollResult, type TableState,
} from '@masa/shared';

export class IntentError extends Error {}

export interface Ctx { rng: Rng; monsters: Map<string, Monster>; now: () => number; newId: () => string }
export interface Outcome {
  state: TableState;
  log: LogEntry[];
  regions?: { monsterId: string; regions: Region[] };
  /** Özel canavar kaydı ya da silinmesi; durum yazıldıktan sonra uygulanır. */
  monster?: { save: Monster } | { remove: string };
}
/** Bir hamle işlenirken üzerinde çalışılan değiştirilebilir kopya. */
export interface Work {
  s: TableState; log: LogEntry[]; ctx: Ctx; role: Role;
  regions?: Outcome['regions']; monster?: Outcome['monster'];
}
/** Ağdan gelen, henüz doğrulanmamış niyet. */
export type Raw = Record<string, unknown>;

export function fail(message: string): never {
  throw new IntentError(message);
}

export function say(w: Work, kind: LogEntry['kind'], text: string, visibility: LogEntry['visibility'] = 'public'): void {
  w.log.push({ id: w.ctx.newId(), at: w.ctx.now(), actor: w.role, visibility, kind, text });
}

/** Oyuncuya görünen ad. Herkese açık günlük metinlerinde yalnızca bu kullanılır. */
export const publicName = (c: MonsterCombatant): string => (c.revealName ? c.name : 'Bilinmeyen yaratık');

export function character(w: Work): Character {
  return w.s.character ?? fail('Önce karakter kartı doldurulmalı');
}

export function activeEncounter(w: Work): Encounter {
  const e = w.s.encounter;
  return e && e.status === 'active' ? e : fail('Süren bir savaş yok');
}

export function monsterIn(e: Encounter, id: unknown): MonsterCombatant {
  const c = e.combatants.find((x) => x.id === id);
  return c && c.kind === 'monster' ? c : fail('Hedef bulunamadı');
}

export function roll(w: Work, expr: unknown, critical = false): RollResult {
  try {
    return rollExpr(expr as string, w.ctx.rng, { critical });
  } catch (e) {
    if (e instanceof DiceError) fail(e.message);
    throw e;
  }
}
