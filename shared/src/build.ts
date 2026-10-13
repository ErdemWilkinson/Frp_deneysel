// Karakter yaratırken sınıf ve ırka göre seçilebilecek saldırı ve büyü sınırları (SRD 5.1).
import { abilityMod } from './rules';
import { RACES } from './races';
import { SPELLS, SPELL_ROLLS, type Spell, type SpellClass } from './spells';
import { DAMAGE_TYPES, type Ability, type CharacterAttack, type DamageType } from './types';

interface ClassRule {
  spell?: SpellClass;
  ability?: Ability;
  /** Büyü hilesi sayısı: 1., 4. ve 10. seviyede. */
  cantrips?: [number, number, number];
  /** Büyü bilen sınıflarda seviye başına bilinen büyü sayısı (1–20). */
  known?: number[];
  /** Hazırlayan sınıflarda seviye için yetenek değiştiricisine eklenen: 'full' = seviye, 'half' = seviyenin yarısı. */
  prepared?: 'full' | 'half';
  caster: 'full' | 'half' | 'pact' | 'none';
  martial: boolean;
}

const RULES: Record<string, ClassRule> = {
  Barbar: { caster: 'none', martial: true },
  Savaşçı: { caster: 'none', martial: true },
  Keşiş: { caster: 'none', martial: false },
  Hırsız: { caster: 'none', martial: false },
  Bard: {
    spell: 'B', ability: 'cha', cantrips: [2, 3, 4], caster: 'full', martial: false,
    known: [4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 15, 15, 16, 18, 19, 19, 20, 22, 22, 22],
  },
  Rahip: { spell: 'C', ability: 'wis', cantrips: [3, 4, 5], prepared: 'full', caster: 'full', martial: false },
  Druid: { spell: 'D', ability: 'wis', cantrips: [2, 3, 4], prepared: 'full', caster: 'full', martial: false },
  Sihirbaz: { spell: 'W', ability: 'int', cantrips: [3, 4, 5], prepared: 'full', caster: 'full', martial: false },
  Sorcerer: {
    spell: 'S', ability: 'cha', cantrips: [4, 5, 6], caster: 'full', martial: false,
    known: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 12, 13, 13, 14, 14, 15, 15, 15, 15],
  },
  Warlock: {
    spell: 'L', ability: 'cha', cantrips: [2, 3, 4], caster: 'pact', martial: false,
    known: [2, 3, 4, 5, 6, 7, 8, 9, 10, 10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15],
  },
  Paladin: { spell: 'P', ability: 'cha', prepared: 'half', caster: 'half', martial: true },
  Korucu: {
    spell: 'R', ability: 'wis', caster: 'half', martial: true,
    known: [0, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11],
  },
};

export interface BuildLimits {
  /** Büyü sınıfı yoksa null. */
  spellClass: SpellClass | null;
  /** Büyü yapma yeteneği. */
  ability: Ability | null;
  cantrips: number;
  spells: number;
  maxSpellLevel: number;
}

const tier = (level: number): number => (level >= 10 ? 2 : level >= 4 ? 1 : 0);

function maxSpellLevel(rule: ClassRule, level: number): number {
  if (rule.caster === 'full') return Math.min(9, Math.ceil(level / 2));
  if (rule.caster === 'pact') return level >= 9 ? 5 : Math.ceil(level / 2);
  if (rule.caster === 'half') return level < 2 ? 0 : Math.min(5, Math.ceil(level / 4));
  return 0;
}

/** Sınıf, seviye ve ırka göre seçilebilecek büyü hilesi ve büyü sayısı. */
export function buildLimits(className: string, level: number, abilities: Record<Ability, number>, race = ''): BuildLimits {
  const rule = RULES[className];
  if (!rule || !rule.spell) {
    // Büyü yapmayan sınıfta bile yüksek elfin sihirbaz büyü hilesi kalır.
    if (race === 'Yüksek elf') return { spellClass: 'W', ability: 'int', cantrips: 1, spells: 0, maxSpellLevel: 0 };
    return { spellClass: null, ability: null, cantrips: 0, spells: 0, maxSpellLevel: 0 };
  }
  const lvl = Math.max(1, Math.min(20, Math.floor(level) || 1));
  const mod = abilityMod(abilities[rule.ability!] ?? 10);
  let cantrips = rule.cantrips ? rule.cantrips[tier(lvl)]! : 0;
  // Yüksek elf, sihirbaz listesinden ek bir büyü hilesi bilir.
  if (race === 'Yüksek elf') cantrips += 1;
  let spells = 0;
  if (rule.known) spells = rule.known[lvl - 1] ?? 0;
  else if (rule.prepared === 'full') spells = Math.max(1, mod + lvl);
  else if (rule.prepared === 'half') spells = lvl < 2 ? 0 : Math.max(1, mod + Math.floor(lvl / 2));
  return { spellClass: rule.spell, ability: rule.ability!, cantrips, spells, maxSpellLevel: maxSpellLevel(rule, lvl) };
}

/** Bu sınıfın seçebileceği, zarla çözülen (hasar veren) büyüler; ırkın ek büyü hilesi için sihirbaz listesi de eklenir. */
export function pickableSpells(className: string, race = ''): Spell[] {
  const rule = RULES[className];
  const classes = new Set<SpellClass>();
  if (rule?.spell) classes.add(rule.spell);
  return SPELLS.filter((s) => {
    const r = SPELL_ROLLS[s.id];
    if (!r || r.kind === 'healing') return false;
    if (!(DAMAGE_TYPES as readonly string[]).includes(r.kind)) return false;
    if (s.classes.some((c) => classes.has(c))) return true;
    return race === 'Yüksek elf' && s.level === 0 && s.classes.includes('W');
  });
}

const feet = (text: string): number => {
  const m = text.match(/(\d+)\s*fit/);
  return m ? Number(m[1]) : 5;
};

/** Seçilen büyüden kart saldırısı üretir: isabet bonusu = yetkinlik + büyü yetenek değiştiricisi. */
export function spellAttack(spell: Spell, proficiency: number, abilities: Record<Ability, number>, ability: Ability | null): CharacterAttack {
  const r = SPELL_ROLLS[spell.id]!;
  return {
    name: spell.name.tr,
    bonus: proficiency + abilityMod(abilities[ability ?? 'int'] ?? 10),
    damage: r.dice,
    type: r.kind as DamageType,
    range: feet(spell.range),
  };
}

export interface Weapon { name: string; damage: string; type: DamageType; range: number; martial: boolean; ranged: boolean; finesse: boolean }
export const WEAPONS: Weapon[] = [
  { name: 'Hançer', damage: '1d4', type: 'piercing', range: 20, martial: false, ranged: false, finesse: true },
  { name: 'Asa', damage: '1d6', type: 'bludgeoning', range: 5, martial: false, ranged: false, finesse: false },
  { name: 'Gürz', damage: '1d6', type: 'bludgeoning', range: 5, martial: false, ranged: false, finesse: false },
  { name: 'Mızrak', damage: '1d6', type: 'piercing', range: 20, martial: false, ranged: false, finesse: false },
  { name: 'Hafif Arbalet', damage: '1d8', type: 'piercing', range: 80, martial: false, ranged: true, finesse: false },
  { name: 'Kısa Yay', damage: '1d6', type: 'piercing', range: 80, martial: false, ranged: true, finesse: false },
  { name: 'Sapan', damage: '1d4', type: 'bludgeoning', range: 30, martial: false, ranged: true, finesse: false },
  { name: 'Kısa Kılıç', damage: '1d6', type: 'piercing', range: 5, martial: true, ranged: false, finesse: true },
  { name: 'Eğri Kılıç', damage: '1d6', type: 'slashing', range: 5, martial: true, ranged: false, finesse: true },
  { name: 'Uzun Kılıç', damage: '1d8', type: 'slashing', range: 5, martial: true, ranged: false, finesse: false },
  { name: 'Savaş Baltası', damage: '1d8', type: 'slashing', range: 5, martial: true, ranged: false, finesse: false },
  { name: 'Savaş Çekici', damage: '1d8', type: 'bludgeoning', range: 5, martial: true, ranged: false, finesse: false },
  { name: 'Büyük Balta', damage: '1d12', type: 'slashing', range: 5, martial: true, ranged: false, finesse: false },
  { name: 'Büyük Kılıç', damage: '2d6', type: 'slashing', range: 5, martial: true, ranged: false, finesse: false },
  { name: 'Uzun Yay', damage: '1d8', type: 'piercing', range: 150, martial: true, ranged: true, finesse: false },
];

/** Sınıfın yetkin olduğu silahlar: savaşçı sınıfları hepsini, diğerleri yalnızca basit silahları kullanır. */
export function weaponsFor(className: string): Weapon[] {
  const martial = RULES[className]?.martial ?? false;
  return WEAPONS.filter((w) => martial || !w.martial);
}

/** Silahtan kart saldırısı: yakın dövüşte kuvvet, menzilli ve hafif silahta (daha iyi olanla) çeviklik. */
export function weaponAttack(weapon: Weapon, proficiency: number, abilities: Record<Ability, number>): CharacterAttack {
  const str = abilityMod(abilities.str);
  const dex = abilityMod(abilities.dex);
  const mod = weapon.ranged ? dex : weapon.finesse ? Math.max(str, dex) : str;
  return {
    name: weapon.name,
    bonus: proficiency + mod,
    damage: mod === 0 ? weapon.damage : `${weapon.damage}${mod > 0 ? '+' : ''}${mod}`,
    type: weapon.type,
    range: weapon.range,
  };
}

/** Karttaki saldırılardan büyü olanların sayısı: [büyü hilesi, seviyeli büyü]. */
export function countSpells(attacks: CharacterAttack[], pool: Spell[]): { cantrips: number; spells: number } {
  let cantrips = 0;
  let spells = 0;
  for (const a of attacks) {
    const s = pool.find((x) => x.name.tr === a.name);
    if (!s) continue;
    if (s.level === 0) cantrips += 1;
    else spells += 1;
  }
  return { cantrips, spells };
}

/** Irkların listesi: alt ırk adı seçildiyse ana ırk adı döner. */
export const baseRace = (name: string): string => RACES.find((r) => r.name.tr === name || r.subraces.some((s) => s.name === name))?.name.tr ?? name;
