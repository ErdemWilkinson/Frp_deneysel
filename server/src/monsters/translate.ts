import { DAMAGE_TR, type DamageType } from '@masa/shared';

const KIND: Record<string, string> = {
  'Melee Weapon Attack': 'Yakın Dövüş Silah Saldırısı',
  'Ranged Weapon Attack': 'Menzilli Silah Saldırısı',
  'Melee or Ranged Weapon Attack': 'Yakın Dövüş ya da Menzilli Silah Saldırısı',
  'Melee Spell Attack': 'Yakın Dövüş Büyü Saldırısı',
  'Ranged Spell Attack': 'Menzilli Büyü Saldırısı',
};
const DMG = String.raw`(\d+(?: \(\d+d\d+(?: [+-] \d+)?\))?) (\w+) damage`;
const ATTACK = new RegExp(
  String.raw`^(Melee|Ranged|Melee or Ranged) (Weapon|Spell) Attack: ([+-]\d+) to hit, ` +
  String.raw`(reach \d+ ft\.|range \d+(?:\/\d+)? ft\.|reach \d+ ft\. or range \d+(?:\/\d+)? ft\.), one (target|creature)\. ` +
  String.raw`Hit: ${DMG}(?: plus ${DMG})?\.$`,
);

/** Yalnızca isabet ve hasar bildiren saldırı satırını çevirir; ek kural içeren satırlar için null döner. */
export function translateAttack(en: string): string | null {
  const m = en.match(ATTACK);
  if (!m) return null;
  const [, style, kind, bonus, where, who, amount1, type1, amount2, type2] = m;
  const types = [type1, type2].filter(Boolean) as string[];
  if (types.some((t) => !(t in DAMAGE_TR))) return null;
  const reach = where!.replace(/reach/g, 'erişim').replace(/range/g, 'menzil').replace(' or ', ' ya da ');
  const part = (amount: string, type: string) => `${amount} ${DAMAGE_TR[type as DamageType]} hasar`;
  const damage = amount2 ? `${part(amount1!, type1!)} artı ${part(amount2, type2!)}` : part(amount1!, type1!);
  return `${KIND[`${style} ${kind} Attack`]}: isabet için ${bonus}, ${reach}, ${who === 'target' ? 'tek hedef' : 'tek yaratık'}. İsabet: ${damage}.`;
}
