import {
  ABILITIES, DAMAGE_TYPES, REGIONS, validateMonster,
  type Ability, type Monster, type MonsterAction, type MonsterText,
} from '@masa/shared';
import { fail, type Raw, type Work } from './context';
import { int, oneOf, text } from './validate';

const CUSTOM_ID = /^custom-[a-z0-9-]{1,60}$/;
const MAX_ITEMS = 20;

const list = (v: unknown, label: string): any[] =>
  Array.isArray(v) && v.length <= MAX_ITEMS ? v : fail(`${label} en fazla ${MAX_ITEMS} kayıt içerebilir`);
const optional = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const subset = <T extends string>(v: unknown, all: readonly T[], label: string): T[] =>
  [...new Set(list(v ?? [], label).map((x) => oneOf(x, all, label)))];

function entry(raw: any, label: string): MonsterText {
  const name = text(raw?.name, 60, `${label} adı`);
  const body = optional(raw?.text, 2000);
  // Özel canavarın tek bir dili var; iki alana da aynı metin yazılır.
  return { name: { tr: name, en: name }, text: { tr: body || null, en: body || name } };
}

/** DM'in formdan gönderdiği canavarı baştan kurar; tanımadığı alanları atar. */
export function parseMonster(input: unknown): Monster {
  if (!input || typeof input !== 'object') fail('Canavar geçersiz');
  const m = input as Record<string, any>;
  if (typeof m.id !== 'string' || !CUSTOM_ID.test(m.id)) fail('Canavar kimliği geçersiz');
  const name = text(m.name, 60, 'Ad');
  const abilities = {} as Record<Ability, number>;
  for (const a of ABILITIES) abilities[a] = int(m.abilities?.[a], 1, 30, 'Yetenek puanı');

  const actions: MonsterAction[] = list(m.actions ?? [], 'Eylemler').map((raw) => {
    const base = entry(raw, 'Eylem');
    if (!raw?.attack) return base;
    const damage = list(raw.attack.damage, 'Hasar').slice(0, 3).map((d) => ({
      dice: text(d?.dice, 30, 'Hasar zarı').replace(/\s+/g, ''),
      type: oneOf(d?.type, DAMAGE_TYPES, 'Hasar türü'),
    }));
    return { ...base, attack: { bonus: int(raw.attack.bonus, -10, 30, 'İsabet bonusu'), damage } };
  });
  const legendaryActions = list(m.legendaryActions ?? [], 'Efsanevi eylemler').map((raw) => entry(raw, 'Efsanevi eylem'));

  const monster: Monster = {
    id: m.id,
    name: { tr: name, en: name },
    size: text(m.size, 20, 'Boyut'),
    type: text(m.type, 30, 'Tür'),
    ac: int(m.ac, 1, 40, 'Zırh sınıfı'),
    hp: int(m.hp, 1, 9999, 'Can puanı'),
    hitDice: text(m.hitDice, 30, 'Can zarı').replace(/\s+/g, ''),
    speed: optional(m.speed, 80) || '30 ft.',
    abilities,
    saves: {},
    skills: {},
    resistances: subset(m.resistances, DAMAGE_TYPES, 'Direnç'),
    immunities: subset(m.immunities, DAMAGE_TYPES, 'Bağışıklık'),
    vulnerabilities: subset(m.vulnerabilities, DAMAGE_TYPES, 'Zayıflık'),
    defenseNotes: [],
    conditionImmunities: [],
    senses: optional(m.senses, 120),
    languages: optional(m.languages, 120),
    cr: typeof m.cr === 'number' && m.cr >= 0 && m.cr <= 30 ? m.cr : fail('CR 0 ile 30 arasında olmalı'),
    xp: int(m.xp ?? 0, 0, 1_000_000, 'XP'),
    traits: list(m.traits ?? [], 'Özellikler').map((raw) => entry(raw, 'Özellik')),
    actions,
    legendaryActions,
    legendaryCount: legendaryActions.length > 0 ? int(m.legendaryCount ?? 3, 1, 5, 'Efsanevi eylem hakkı') : 0,
    regions: subset(m.regions, REGIONS, 'Bölge'),
  };
  if (m.human === true) monster.human = true;
  for (const a of ABILITIES) {
    if (m.saves?.[a] !== undefined && m.saves[a] !== null) monster.saves[a] = int(m.saves[a], -10, 30, 'Kurtarma bonusu');
  }
  const errors = validateMonster(monster);
  if (errors.length > 0) fail(errors[0]!.replace(/^[^:]+: /, 'Canavar: '));
  return monster;
}

export function saveMonster(w: Work, i: Raw): void {
  w.monster = { save: parseMonster(i.monster) };
}

export function deleteMonster(w: Work, i: Raw): void {
  const id = String(i.monsterId);
  if (!CUSTOM_ID.test(id) || !w.ctx.monsters.has(id)) fail('Yalnızca kendi yarattığın canavarlar silinebilir');
  if (w.s.encounter?.combatants.some((c) => c.kind === 'monster' && c.monsterId === id)) {
    fail('Bu canavar şu anki karşılaşmada; önce karşılaşmadan çıkar');
  }
  w.monster = { remove: id };
}
