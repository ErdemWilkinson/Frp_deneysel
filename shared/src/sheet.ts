import { abilityMod } from './rules';
import type { Ability, Character } from './types';

/** Karakter sayfasındaki on sekiz beceri ve hangi yeteneğe bağlı oldukları. */
export const SKILLS = [
  { key: 'acrobatics', tr: 'Akrobasi', ability: 'dex' },
  { key: 'animalHandling', tr: 'Hayvan İdaresi', ability: 'wis' },
  { key: 'arcana', tr: 'Arkana', ability: 'int' },
  { key: 'athletics', tr: 'Atletizm', ability: 'str' },
  { key: 'deception', tr: 'Aldatma', ability: 'cha' },
  { key: 'history', tr: 'Tarih', ability: 'int' },
  { key: 'insight', tr: 'Sezgi', ability: 'wis' },
  { key: 'intimidation', tr: 'Korkutma', ability: 'cha' },
  { key: 'investigation', tr: 'Araştırma', ability: 'int' },
  { key: 'medicine', tr: 'Tıp', ability: 'wis' },
  { key: 'nature', tr: 'Doğa', ability: 'int' },
  { key: 'perception', tr: 'Algı', ability: 'wis' },
  { key: 'performance', tr: 'Performans', ability: 'cha' },
  { key: 'persuasion', tr: 'İkna', ability: 'cha' },
  { key: 'religion', tr: 'İlahiyat', ability: 'int' },
  { key: 'sleightOfHand', tr: 'El Çabukluğu', ability: 'dex' },
  { key: 'stealth', tr: 'Gizlilik', ability: 'dex' },
  { key: 'survival', tr: 'Hayatta Kalma', ability: 'wis' },
] as const satisfies readonly { key: string; tr: string; ability: Ability }[];

export type SkillKey = (typeof SKILLS)[number]['key'];
export const SKILL_KEYS = SKILLS.map((s) => s.key) as SkillKey[];
export type SkillRank = 'proficient' | 'expertise';
export const SKILL_RANK_TR: Record<SkillRank, string> = { proficient: 'Yetkin', expertise: 'Uzman' };

/** Sayfanın oyun kurallarını etkilemeyen, kimliği ve öyküyü anlatan bölümü. */
export interface CharacterProfile {
  className: string;
  background: string;
  playerName: string;
  race: string;
  alignment: string;
  experience: number;
  inspiration: number;
  /** Toplam can zarı, ör. "3d10". */
  hitDice: string;
  skills: Partial<Record<SkillKey, SkillRank>>;
  personality: string;
  ideals: string;
  bonds: string;
  flaws: string;
  equipment: string;
  features: string;
  languages: string;
}

export const PROFILE_TEXT_LIMITS = {
  className: 60, background: 60, playerName: 60, race: 60, alignment: 40, hitDice: 20,
  personality: 600, ideals: 600, bonds: 600, flaws: 600, equipment: 2000, features: 3000, languages: 1000,
} as const;

export const blankProfile = (): CharacterProfile => ({
  className: '', background: '', playerName: '', race: '', alignment: '', experience: 0, inspiration: 0, hitDice: '',
  skills: {}, personality: '', ideals: '', bonds: '', flaws: '', equipment: '', features: '', languages: '',
});

type Sheet = Pick<Character, 'abilities' | 'proficiency'> & { profile?: CharacterProfile };

/** Becerinin zar bonusu: yetenek değiştiricisi ile yetkinlik (uzmanlıkta iki katı). */
export function skillBonus(c: Sheet, key: SkillKey): number {
  const skill = SKILLS.find((s) => s.key === key)!;
  const rank = c.profile?.skills[key];
  const factor = rank === 'expertise' ? 2 : rank === 'proficient' ? 1 : 0;
  return abilityMod(c.abilities[skill.ability]) + factor * c.proficiency;
}

export const passivePerception = (c: Sheet): number => 10 + skillBonus(c, 'perception');
export const initiativeBonus = (c: Sheet): number => abilityMod(c.abilities.dex);

/** SRD 5.1'deki on iki sınıf. */
export const CHARACTER_CLASSES = [
  'Barbar', 'Bard', 'Rahip', 'Druid', 'Savaşçı', 'Keşiş', 'Paladin', 'Korucu', 'Hırsız',
  'Sorcerer', 'Warlock', 'Sihirbaz',
] as const;
