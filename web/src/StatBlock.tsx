import type { ReactNode } from 'react';
import { ABILITIES, ABILITY_TR, DAMAGE_TR, abilityMod, displayName, type Monster, type MonsterText } from '@masa/shared';

const CR_LABEL: Record<string, string> = { '0.125': '1/8', '0.25': '1/4', '0.5': '1/2' };
export const crLabel = (value: number): string => CR_LABEL[String(value)] ?? String(value);
export const signed = (n: number): string => (n >= 0 ? `+${n}` : String(n));
export const isCustom = (m: Monster): boolean => m.id.startsWith('custom-');
const body = (t: MonsterText): string => t.text.tr ?? t.text.en;

/** Canavarın kitaptaki bütün değerleri. Yalnızca DM ekranında çizilir. */
export function StatBlock({ monster: m, children }: { monster: Monster; children?: ReactNode }) {
  const saves = ABILITIES.filter((a) => m.saves[a] !== undefined).map((a) => `${ABILITY_TR[a]} ${signed(m.saves[a]!)}`);
  const skills = Object.entries(m.skills).map(([name, bonus]) => `${name} ${signed(bonus)}`);
  return (
    <article role="region" aria-label={displayName(m.name)} className="statblock">
      <h3>{displayName(m.name)} {m.name.tr && m.name.tr !== m.name.en && <small>({m.name.en})</small>}</h3>
      <p>{m.size} {m.type} · Meydan okuma derecesi {crLabel(m.cr)} ({m.xp} deneyim puanı)</p>
      <p>Zırh sınıfı {m.ac} · Can puanı {m.hp} ({m.hitDice}) · Hız {m.speed}</p>
      <dl className="abilities">
        {ABILITIES.map((a) => (
          <div key={a}><dt>{ABILITY_TR[a]}</dt><dd>{m.abilities[a]} <small>({signed(abilityMod(m.abilities[a]))})</small></dd></div>
        ))}
      </dl>
      {saves.length > 0 && <p>Kurtarma zarları: {saves.join(', ')}</p>}
      {skills.length > 0 && <p>Beceriler: {skills.join(', ')}</p>}
      {m.resistances.length > 0 && <p>Direnç: {m.resistances.map((t) => DAMAGE_TR[t]).join(', ')}</p>}
      {m.immunities.length > 0 && <p>Bağışıklık: {m.immunities.map((t) => DAMAGE_TR[t]).join(', ')}</p>}
      {m.vulnerabilities.length > 0 && <p>Zayıflık: {m.vulnerabilities.map((t) => DAMAGE_TR[t]).join(', ')}</p>}
      {m.defenseNotes.map((note) => <p key={note}>{note}</p>)}
      {m.conditionImmunities.length > 0 && <p>Durum bağışıklığı: {m.conditionImmunities.join(', ')}</p>}
      {m.senses && <p>Duyular: {m.senses}</p>}
      {m.languages && <p>Diller: {m.languages}</p>}
      {m.traits.map((t) => <p key={t.name.en}><strong>{displayName(t.name)}.</strong> {body(t)}</p>)}
      {m.actions.length > 0 && <h4>Eylemler</h4>}
      {m.actions.map((a) => (
        <p key={a.name.en}>
          <strong>{displayName(a.name)}.</strong>{' '}
          {a.attack && <em>{signed(a.attack.bonus)}, {a.attack.damage.map((d) => `${d.dice} ${DAMAGE_TR[d.type]}`).join(' + ')}. </em>}
          {body(a)}
        </p>
      ))}
      {m.legendaryActions.length > 0 && <h4>Efsanevi eylemler ({m.legendaryCount})</h4>}
      {m.legendaryActions.map((a) => <p key={a.name.en}><strong>{displayName(a.name)}.</strong> {body(a)}</p>)}
      {children}
    </article>
  );
}
