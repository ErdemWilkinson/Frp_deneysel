import { useMemo, useState } from 'react';
import {
  DAMAGE_TR, buildLimits, countSpells, pickableSpells, spellAttack, weaponAttack, weaponsFor,
  type Ability, type CharacterAttack,
} from '@masa/shared';

interface Props {
  className: string;
  race: string;
  level: number;
  abilities: Record<Ability, number>;
  proficiency: number;
  attacks: CharacterAttack[];
  /** Saldırı sayısı üst sınıra ulaştıysa true. */
  full: boolean;
  onAdd: (attack: CharacterAttack) => void;
}

/** Sınıf ve ırka göre silah ve büyü seçtirir; büyü hilesi ve büyü sayısı sınıfın sınırıyla kısıtlıdır. */
export function AttackPicker({ className, race, level, abilities, proficiency, attacks, full, onAdd }: Props) {
  const [weapon, setWeapon] = useState('');
  const [spell, setSpell] = useState('');
  const weapons = useMemo(() => weaponsFor(className), [className]);
  const pool = useMemo(() => pickableSpells(className, race), [className, race]);
  const limits = useMemo(() => buildLimits(className, level, abilities, race), [className, level, abilities, race]);
  const used = useMemo(() => countSpells(attacks, pool), [attacks, pool]);
  const taken = new Set(attacks.map((a) => a.name));

  if (!className) return <p className="hint">Silah ve büyü seçmek için önce sınıfını seç.</p>;

  const cantripsLeft = limits.cantrips - used.cantrips;
  const spellsLeft = limits.spells - used.spells;
  const available = pool.filter((s) => !taken.has(s.name.tr)
    && (s.level === 0 ? cantripsLeft > 0 : spellsLeft > 0 && s.level <= limits.maxSpellLevel));

  const addWeapon = () => {
    const w = weapons.find((x) => x.name === weapon);
    if (!w) return;
    onAdd(weaponAttack(w, proficiency, abilities));
    setWeapon('');
  };
  const addSpell = () => {
    const s = pool.find((x) => x.id === spell);
    if (!s) return;
    onAdd(spellAttack(s, proficiency, abilities, limits.ability));
    setSpell('');
  };

  return (
    <div className="attack-picker">
      <div className="picker-row">
        <label>Silah seç{' '}
          <select value={weapon} onChange={(e) => setWeapon(e.target.value)}>
            <option value="">Seçilmedi</option>
            {weapons.map((w) => (
              <option key={w.name} value={w.name} disabled={taken.has(w.name)}>
                {w.name} · {w.damage} {DAMAGE_TR[w.type]}
              </option>
            ))}
          </select>
        </label>
        <button type="button" disabled={!weapon || full} onClick={addWeapon}>Silahı ekle</button>
      </div>

      {limits.spellClass ? (
        <div className="picker-row">
          <label>Büyü seç{' '}
            <select value={spell} onChange={(e) => setSpell(e.target.value)}>
              <option value="">Seçilmedi</option>
              {available.length === 0 && <option disabled value="">Seçilebilir büyü kalmadı</option>}
              {available.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name.tr} · {s.level === 0 ? 'büyü hilesi' : `${s.level}. seviye`}
                </option>
              ))}
            </select>
          </label>
          <button type="button" disabled={!spell || full} onClick={addSpell}>Büyüyü ekle</button>
          <p className="hint" role="status">
            Büyü hilesi: {used.cantrips} / {limits.cantrips} · Büyü: {used.spells} / {limits.spells}
            {limits.maxSpellLevel > 0 ? ` · en çok ${limits.maxSpellLevel}. seviye` : ''}
          </p>
        </div>
      ) : <p className="hint">{className} büyü yapamaz.</p>}
    </div>
  );
}
