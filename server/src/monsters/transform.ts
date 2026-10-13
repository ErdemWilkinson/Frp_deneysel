import { DAMAGE_TYPES, parseDice, type DamagePart, type DamageType, type Monster, type MonsterText } from '@masa/shared';

const isDamageType = (x: unknown): x is DamageType => DAMAGE_TYPES.includes(x as DamageType);
const text = (name: string, desc: string): MonsterText => ({
  name: { tr: null, en: name }, text: { tr: null, en: desc ?? '' },
});
const parses = (dice: unknown): dice is string => {
  try { parseDice(dice as string); return true; } catch { return false; }
};

function describeMap(map: Record<string, unknown> | undefined, primary: string): string {
  return Object.entries(map ?? {})
    .map(([key, value]) => (key === primary ? String(value) : `${key.replace(/_/g, ' ')} ${value}`))
    .join(', ');
}

export function transformMonster(raw: any): Monster {
  const defenseNotes: string[] = [];
  const split = (list: unknown, label: string): DamageType[] => {
    const typed: DamageType[] = [];
    for (const entry of Array.isArray(list) ? list : []) {
      if (isDamageType(entry)) typed.push(entry);
      else defenseNotes.push(`${label}: ${entry}`);
    }
    return typed;
  };

  const saves: Monster['saves'] = {};
  const skills: Monster['skills'] = {};
  for (const p of raw.proficiencies ?? []) {
    const index: string = p.proficiency?.index ?? '';
    if (index.startsWith('saving-throw-')) saves[index.slice(13) as keyof Monster['saves']] = p.value;
    else if (index.startsWith('skill-')) skills[index.slice(6)] = p.value;
  }

  const actions = (raw.actions ?? []).map((a: any) => {
    const damage: DamagePart[] = [];
    let clean = Array.isArray(a.damage) && a.damage.length > 0;
    for (const d of a.damage ?? []) {
      if (parses(d.damage_dice) && isDamageType(d.damage_type?.index)) damage.push({ dice: d.damage_dice, type: d.damage_type.index });
      else clean = false;
    }
    const attack = typeof a.attack_bonus === 'number' && clean ? { bonus: a.attack_bonus, damage } : undefined;
    return { ...text(a.name, a.desc), ...(attack ? { attack } : {}) };
  });

  const armor = raw.armor_class;
  const legendaryActions = (raw.legendary_actions ?? []).map((a: any) => text(a.name, a.desc));

  return {
    id: raw.index,
    name: { tr: null, en: raw.name },
    size: raw.size,
    type: raw.type,
    ac: typeof armor === 'number' ? armor : armor?.[0]?.value,
    hp: raw.hit_points,
    hitDice: parses(raw.hit_points_roll) ? raw.hit_points_roll : raw.hit_dice,
    speed: describeMap(raw.speed, 'walk'),
    abilities: {
      str: raw.strength, dex: raw.dexterity, con: raw.constitution,
      int: raw.intelligence, wis: raw.wisdom, cha: raw.charisma,
    },
    saves,
    skills,
    resistances: split(raw.damage_resistances, 'Resistance'),
    immunities: split(raw.damage_immunities, 'Immunity'),
    vulnerabilities: split(raw.damage_vulnerabilities, 'Vulnerability'),
    defenseNotes,
    conditionImmunities: (raw.condition_immunities ?? []).map((c: any) => c.index),
    senses: describeMap(raw.senses, ''),
    languages: raw.languages ?? '',
    cr: raw.challenge_rating,
    xp: raw.xp,
    traits: (raw.special_abilities ?? []).map((a: any) => text(a.name, a.desc)),
    actions,
    legendaryActions,
    legendaryCount: legendaryActions.length > 0 ? 3 : 0,
    regions: [],
  };
}
