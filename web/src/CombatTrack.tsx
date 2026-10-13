import { useState } from 'react';
import { BAND_TR, CONDITION_TR, type PlayerView, type RollMode } from '@masa/shared';
import { HpBar, ModeSelect, TurnRail } from './controls';
import type { Send } from './useTable';

export function CombatTrack({ view, send }: { view: PlayerView; send: Send }) {
  const [mode, setMode] = useState<RollMode>('normal');
  const { encounter, character } = view;
  if (!encounter) {
    return <section aria-label="Savaş"><h2>Savaş</h2><p>Şu an savaş yok.</p></section>;
  }
  const myTurn = encounter.combatants.some((c) => c.current && c.kind === 'character');
  const attacks = character && character.hp > 0 ? character.attacks : [];

  return (
    <section aria-label="Savaş" className="track">
      <h2>Savaş — {encounter.round}. raunt</h2>
      <TurnRail items={encounter.combatants.map((c) => ({ id: c.id, name: c.name, current: c.current, down: c.band === 'down' }))} />
      <ModeSelect value={mode} onChange={setMode} />
      <ol>
        {encounter.combatants.map((c) => (
          <li key={c.id} className={c.current ? 'current' : ''} aria-current={c.current ? 'true' : undefined}>
            <strong>{c.name}</strong>{' '}
            <span>{c.hp !== null ? `${c.hp}/${c.maxHp} can puanı` : c.band ? BAND_TR[c.band] : ''}</span>{' '}
            <HpBar hp={c.hp} max={c.maxHp} band={c.band} />
            {c.conditions.length > 0 && <em>{c.conditions.map((x) => CONDITION_TR[x]).join(', ')}</em>}
            {c.kind === 'monster' && c.band !== 'down' && attacks.map((a, i) => (
              <button key={i} onClick={() => send({ type: 'character.attack', attackIndex: i, targetId: c.id, mode })}>
                {a.name}
              </button>
            ))}
          </li>
        ))}
      </ol>
      {myTurn && <button className="btn-primary" onClick={() => send({ type: 'combat.nextTurn' })}>Sıramı bitir</button>}
    </section>
  );
}
