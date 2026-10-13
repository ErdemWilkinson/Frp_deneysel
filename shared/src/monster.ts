import { parseDice } from './dice';
import { ABILITIES, DAMAGE_TYPES, REGIONS, type Localized, type Monster, type Region } from './types';

/** Açık su arazileri, kitaptaki kıyı ve su etiketlerinin birleşiminden seçer. */
export const REGION_ALIASES: Partial<Record<Region, Region[]>> = {
  sea: ['coast', 'underwater'],
  lake: ['coast', 'swamp', 'underwater'],
  dungeon: ['underground', 'ruins'],
  town: ['urban'],
  city: ['urban'],
  castle: ['urban', 'ruins'],
  ship: ['coast', 'underwater'],
  camp: ['forest', 'grassland'],
  graveyard: ['ruins', 'underground'],
  temple: ['ruins', 'underground'],
  farm: ['grassland', 'urban'],
  river: ['grassland', 'forest', 'swamp'],
  tavern: ['urban'],
  market: ['urban'],
  cavern: ['underground'],
  sewer: ['underground', 'urban'],
  mine: ['underground', 'mountain'],
};
export const inRegion = (m: { regions: Region[] }, region: Region): boolean =>
  m.regions.includes(region) || (REGION_ALIASES[region] ?? []).some((r) => m.regions.includes(r));

export const displayName = (x: Localized): string => x.tr ?? x.en;

const isLocalized = (x: any): boolean =>
  !!x && typeof x.en === 'string' && x.en.length > 0 && (x.tr === null || typeof x.tr === 'string');
const isInt = (x: unknown, min: number, max: number): boolean =>
  typeof x === 'number' && Number.isInteger(x) && x >= min && x <= max;
const allIn = (x: unknown, list: readonly string[]): boolean =>
  Array.isArray(x) && x.every((v) => list.includes(v));

export function validateMonster(input: unknown): string[] {
  if (!input || typeof input !== 'object') return ['canavar bir nesne değil'];
  const m = input as Record<string, any>;
  const errors: string[] = [];
  const check = (ok: boolean, field: string) => { if (!ok) errors.push(`${m.id ?? '?'}: ${field} geçersiz`); };

  check(typeof m.id === 'string' && /^[a-z0-9-]+$/.test(m.id), 'id');
  check(isLocalized(m.name), 'name');
  check(isInt(m.ac, 1, 40), 'ac');
  check(isInt(m.hp, 1, 9999), 'hp');
  check(typeof m.cr === 'number' && m.cr >= 0 && m.cr <= 30, 'cr');
  check(isInt(m.xp, 0, 1_000_000), 'xp');
  check(isInt(m.legendaryCount, 0, 5), 'legendaryCount');
  try { parseDice(m.hitDice); } catch { check(false, 'hitDice'); }
  for (const a of ABILITIES) check(isInt(m.abilities?.[a], 1, 30), `abilities.${a}`);
  for (const key of ['resistances', 'immunities', 'vulnerabilities'] as const) check(allIn(m[key], DAMAGE_TYPES), key);
  check(allIn(m.regions, REGIONS), 'regions');
  for (const key of ['traits', 'actions', 'legendaryActions'] as const) {
    if (!Array.isArray(m[key])) { check(false, key); continue; }
    m[key].forEach((item: any, i: number) => {
      check(isLocalized(item?.name) && isLocalized(item?.text), `${key}[${i}]`);
      if (item?.attack) {
        let ok = isInt(item.attack.bonus, -10, 30) && Array.isArray(item.attack.damage) && item.attack.damage.length > 0;
        for (const part of item.attack.damage ?? []) {
          try { parseDice(part.dice); } catch { ok = false; }
          if (!DAMAGE_TYPES.includes(part.type)) ok = false;
        }
        check(ok, `${key}[${i}].attack`);
      }
    });
  }
  return errors;
}

export interface MonsterFilter {
  text?: string;
  region?: Region | '';
  type?: string;
  size?: string;
  crMin?: number;
  crMax?: number;
}

// "İ".toLowerCase() "i" + birleşen nokta üretir; noktayı atıp "ı"yı "i"ye katlıyoruz ki iki dilde de eşleşsin.
const fold = (s: string): string => s.toLowerCase().replace(/̇/g, '').replace(/ı/g, 'i');

export function filterMonsters(list: Monster[], f: MonsterFilter): Monster[] {
  const text = f.text ? fold(f.text.trim()) : '';
  return list
    .filter((m) =>
      (!text || fold(m.name.en).includes(text) || (m.name.tr !== null && fold(m.name.tr).includes(text))) &&
      (!f.region || inRegion(m, f.region)) &&
      (!f.type || m.type === f.type) &&
      (!f.size || m.size === f.size) &&
      (f.crMin === undefined || m.cr >= f.crMin) &&
      (f.crMax === undefined || m.cr <= f.crMax))
    .sort((a, b) => displayName(a.name).localeCompare(displayName(b.name), 'tr'));
}
