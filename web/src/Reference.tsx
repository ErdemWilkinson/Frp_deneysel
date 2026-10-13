import { useMemo, useState } from 'react';
import {
  RACES, SPELLS, SPELL_CLASSES, SPELL_CLASS_TR, SPELL_COMPONENT_TR, SPELL_SCHOOLS, SPELL_SCHOOL_TR, filterSpells,
  type Spell, type SpellClass, type SpellSchool,
} from '@masa/shared';

const levelLabel = (level: number): string => (level === 0 ? 'Büyü hilesi' : `${level}. seviye`);

function SpellCard({ spell }: { spell: Spell }) {
  return (
    <article className="spell-card" aria-label={spell.name.tr}>
      <h3>{spell.name.tr} <small>{spell.name.en}</small></h3>
      <p className="spell-meta">{levelLabel(spell.level)} · {SPELL_SCHOOL_TR[spell.school]}</p>
      <dl>
        <div><dt>Süre</dt><dd>{spell.time}</dd></div>
        <div><dt>Menzil</dt><dd>{spell.range}</dd></div>
        <div><dt>Bileşenler</dt><dd>{spell.components.map((c) => SPELL_COMPONENT_TR[c] ?? c).join(', ')}</dd></div>
        <div><dt>Etki süresi</dt><dd>{spell.duration}</dd></div>
        <div><dt>Sınıflar</dt><dd>{spell.classes.map((c) => SPELL_CLASS_TR[c]).join(', ')}</dd></div>
      </dl>
      <p>{spell.summary}</p>
    </article>
  );
}

/** Büyüler kitabı (1–9. seviye) ya da büyü hileleri kitabı (0. seviye). */
export function SpellBook({ cantrips }: { cantrips: boolean }) {
  const title = cantrips ? 'Büyü hileleri kitabı' : 'Büyüler kitabı';
  const [text, setText] = useState('');
  const [level, setLevel] = useState<number | ''>('');
  const [cls, setCls] = useState<SpellClass | ''>('');
  const [school, setSchool] = useState<SpellSchool | ''>('');
  const base = useMemo(() => SPELLS.filter((s) => (cantrips ? s.level === 0 : s.level > 0)), [cantrips]);
  const shown = useMemo(
    () => filterSpells(base, { text, level: level === '' ? undefined : level, cls, school }),
    [base, text, level, cls, school],
  );
  return (
    <section aria-label={title} className="bestiary spell-book">
      <h2>{title}</h2>
      <div className="filters">
        <label>Ara <input value={text} onChange={(e) => setText(e.target.value)} /></label>
        {!cantrips && (
          <label>Seviye{' '}
            <select value={level} onChange={(e) => setLevel(e.target.value === '' ? '' : Number(e.target.value))}>
              <option value="">Hepsi</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => <option key={n} value={n}>{n}. seviye</option>)}
            </select>
          </label>
        )}
        <label>Sınıf{' '}
          <select value={cls} onChange={(e) => setCls(e.target.value as SpellClass | '')}>
            <option value="">Hepsi</option>
            {SPELL_CLASSES.map((c) => <option key={c} value={c}>{SPELL_CLASS_TR[c]}</option>)}
          </select>
        </label>
        <label>Okul{' '}
          <select value={school} onChange={(e) => setSchool(e.target.value as SpellSchool | '')}>
            <option value="">Hepsi</option>
            {SPELL_SCHOOLS.map((s) => <option key={s} value={s}>{SPELL_SCHOOL_TR[s]}</option>)}
          </select>
        </label>
      </div>
      <p className="hint">{shown.length} büyü</p>
      <div className="spell-list">
        {shown.map((s) => <SpellCard key={s.id} spell={s} />)}
        {shown.length === 0 && <p className="hint">Bu süzgeçle büyü bulunamadı.</p>}
      </div>
    </section>
  );
}

/** Irklar kitabı: ırkın özellikleri ve alt ırkları. */
export function RaceBook() {
  return (
    <section aria-label="Irklar kitabı" className="bestiary race-book">
      <h2>Irklar kitabı</h2>
      {RACES.map((r) => (
        <details key={r.id} className="race-card">
          <summary>{r.name.tr} <small>{r.name.en}</small></summary>
          <p className="spell-meta">{r.size} boy · {r.speed} fit hız · {r.abilities}</p>
          <p>Diller: {r.languages}</p>
          <ul>{r.traits.map((t) => <li key={t.name}><strong>{t.name}.</strong> {t.text}</li>)}</ul>
          {r.subraces.map((sub) => (
            <div key={sub.name} className="subrace">
              <h4>{sub.name} <small>{sub.abilities}</small></h4>
              <ul>{sub.traits.map((t) => <li key={t.name}><strong>{t.name}.</strong> {t.text}</li>)}</ul>
            </div>
          ))}
        </details>
      ))}
    </section>
  );
}
