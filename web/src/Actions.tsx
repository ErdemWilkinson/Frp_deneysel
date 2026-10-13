import { useMemo, useState } from 'react';
import { DAMAGE_TR, SPELLS, SPELL_ROLLS, type Character, type DamageType, type RollMode } from '@masa/shared';
import type { Send } from './useTable';

type Kind = DamageType | 'healing' | 'attack';
const SIDES = [4, 6, 8, 10, 12, 20, 100];
/** Her zar, gerçek zarın siluetini taşır. */
const SHAPES: Record<number, string> = {
  4: '50% 4%, 96% 90%, 4% 90%',
  6: '10% 10%, 90% 10%, 90% 90%, 10% 90%',
  8: '50% 2%, 94% 50%, 50% 98%, 6% 50%',
  10: '50% 2%, 92% 38%, 74% 96%, 26% 96%, 8% 38%',
  12: '50% 3%, 93% 33%, 77% 88%, 23% 88%, 7% 33%',
  20: '50% 2%, 93% 26%, 93% 74%, 50% 98%, 7% 74%, 7% 26%',
  100: '50% 2%, 93% 26%, 93% 74%, 50% 98%, 7% 74%, 7% 26%',
};
const KIND_TR: Record<Kind, string> = { ...DAMAGE_TR, healing: 'İyileştirme', attack: 'Saldırı' };

const sidesOf = (expr: string): number => {
  const m = expr.match(/d(\d+)/);
  const n = m ? Number(m[1]) : 20;
  return SIDES.includes(n) ? n : 20;
};

/** Eylemin türüne göre renklenen, zarın şeklini taşıyan düğme. */
export function ActionDie({ label, expr, kind, onRoll }: { label: string; expr: string; kind: Kind; onRoll: () => void }) {
  const sides = sidesOf(expr);
  return (
    <button type="button" className={`action-die kind-${kind}`} onClick={onRoll} aria-label={`${label}: ${expr} at (${KIND_TR[kind]})`}>
      <span className="shape" style={{ clipPath: `polygon(${SHAPES[sides]})` }} aria-hidden="true">d{sides}</span>
      <span className="what"><strong>{label}</strong><small>{expr} · {KIND_TR[kind]}</small></span>
    </button>
  );
}

/** Zar panosunun altındaki eylemler: karakterin saldırıları ve büyülerin zarları. */
export function ActionDeck({ character, send, mode, secret = false, theater = false }: {
  character: Character | null | undefined; send: Send; mode: RollMode; secret?: boolean;
  /** Hayali savaşta saldırı d20'si atılmaz; yalnızca hasar zarları kalır. */
  theater?: boolean;
}) {
  const [text, setText] = useState('');
  const rollable = useMemo(() => SPELLS.filter((s) => SPELL_ROLLS[s.id]), []);
  const shown = useMemo(() => {
    const t = text.trim().toLocaleLowerCase('tr');
    return rollable.filter((s) => !t || s.name.tr.toLocaleLowerCase('tr').includes(t) || s.name.en.toLowerCase().includes(t));
  }, [rollable, text]);
  const go = (expr: string, label: string) => send({ type: 'roll', expr, mode, label, ...(secret ? { secret: true } : {}) });
  const signed = (n: number) => `${n >= 0 ? '+' : ''}${n}`;

  return (
    <section className="action-deck" aria-label="Eylem zarları">
      <h3>Eylemler</h3>
      {character === undefined ? null : character && character.attacks.length > 0 ? (
        <ul className="deck-list" aria-label="Saldırılar">
          {character.attacks.map((a, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <li key={i}>
              {!theater && (
                <ActionDie label={`${a.name} saldırı`} expr={`1d20${signed(a.bonus)}`} kind="attack" onRoll={() => go(`1d20${signed(a.bonus)}`, `${a.name} saldırı`)} />
              )}
              <ActionDie label={`${a.name} hasar`} expr={a.damage} kind={a.type} onRoll={() => go(a.damage, `${a.name} hasar`)} />
            </li>
          ))}
        </ul>
      ) : <p className="hint">Karakter kartında saldırı yok. Karakter kartından ekleyebilirsin.</p>}

      <details className="deck-spells">
        <summary>Büyü zarları ({rollable.length})</summary>
        <label>Büyü ara <input value={text} onChange={(e) => setText(e.target.value)} /></label>
        <ul className="deck-list" aria-label="Büyüler">
          {shown.map((s) => {
            const r = SPELL_ROLLS[s.id]!;
            const level = s.level === 0 ? 'büyü hilesi' : `${s.level}. seviye`;
            return (
              <li key={s.id}>
                <ActionDie label={s.name.tr} expr={r.dice} kind={r.kind as Kind} onRoll={() => go(r.dice, s.name.tr)} />
                <small className="deck-level">{level}</small>
              </li>
            );
          })}
        </ul>
      </details>
    </section>
  );
}
