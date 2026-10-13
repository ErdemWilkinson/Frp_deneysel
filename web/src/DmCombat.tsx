import { useState } from 'react';
import {
  ABILITIES, ABILITY_TR, CONDITIONS, CONDITION_TR, DAMAGE_TR, DAMAGE_TYPES, displayName,
  type Ability, type Combatant, type CombatantPatch, type Condition, type DamageType, type DmView,
  type Monster, type RollMode,
} from '@masa/shared';
import { HpBar, ModeSelect, TurnRail, num } from './controls';
import { StatBlock } from './StatBlock';
import type { Send } from './useTable';

interface RowProps { c: Combatant; view: DmView; def: Monster | undefined; current: boolean; mode: RollMode; send: Send; theater?: boolean }

function Row({ c, view, def, current, mode, send, theater = false }: RowProps) {
  const [amount, setAmount] = useState(0);
  const [damageType, setDamageType] = useState<DamageType>('slashing');
  const [ability, setAbility] = useState<Ability>('dex');
  const [dc, setDc] = useState(10);
  const vitals = c.kind === 'monster' ? c : view.character;
  const name = c.kind === 'monster' ? c.name : (view.character?.name ?? 'Karakter');
  const patch = (p: CombatantPatch) => send({ type: 'combatant.patch', combatantId: c.id, patch: p });
  const toggle = (x: Condition) =>
    patch({ conditions: c.conditions.includes(x) ? c.conditions.filter((y) => y !== x) : [...c.conditions, x] });

  return (
    <li className={current ? 'current' : ''} aria-current={current ? 'true' : undefined}>
      <strong>{name}</strong>{' '}
      <span>{vitals ? `${vitals.hp}/${vitals.maxHp} can puanı` : ''}{vitals && vitals.tempHp > 0 ? ` (+${vitals.tempHp} geçici)` : ''}</span>{' '}
      <span>Zırh sınıfı {vitals?.ac}</span>{!theater && <span> İnisiyatif {c.initiative}</span>}
      {c.kind === 'monster' && c.legendaryLeft !== null && (
        <span> Efsanevi hak: {c.legendaryLeft}{' '}
          <button disabled={c.legendaryLeft === 0} onClick={() => patch({ legendaryLeft: c.legendaryLeft! - 1 })}>Hak kullan</button>
        </span>
      )}

      <HpBar hp={vitals?.hp ?? null} max={vitals?.maxHp ?? null} band={null} />
      <div className="vitals">
        <label>Miktar <input type="number" min={0} value={amount} onChange={(e) => setAmount(num(e))} /></label>
        <label>Hasar türü{' '}
          <select value={damageType} onChange={(e) => setDamageType(e.target.value as DamageType)}>
            {DAMAGE_TYPES.map((t) => <option key={t} value={t}>{DAMAGE_TR[t]}</option>)}
          </select>
        </label>
        <button onClick={() => send({ type: 'combat.applyDamage', combatantId: c.id, amount, damageType })}>Hasar ver</button>
        <button onClick={() => send({ type: 'combat.heal', combatantId: c.id, amount })}>İyileştir</button>
        <button onClick={() => patch({ hp: amount })}>Can puanını bu yap</button>
        {theater && c.kind === 'monster' && <button onClick={() => patch({ hp: 0 })}>Öldür</button>}
        <button onClick={() => patch({ tempHp: amount })}>Geçici can puanını bu yap</button>
      </div>

      {c.kind === 'monster' && (
        <details className="row-more">
        <summary>Oyuncuya ne gösterilsin</summary>
        <div className="visibility">
          <label><input type="checkbox" checked={c.revealName} onChange={(e) => patch({ revealName: e.target.checked })} /> Ad oyuncuya açık</label>
          <label><input type="checkbox" checked={c.revealHp} onChange={(e) => patch({ revealHp: e.target.checked })} /> Can puanı oyuncuya açık</label>
          {view.identify && !c.revealName && (
            <>
              <label>Tanıma zorluğu{' '}
                <input type="number" min={1} max={30} key={c.identifyDc ?? 'auto'} defaultValue={c.identifyDc ?? ''} placeholder="otomatik"
                  onBlur={(e) => { const v = Number(e.target.value); if (e.target.value !== '' && v >= 1 && v !== c.identifyDc) patch({ identifyDc: v }); }} />
              </label>
              {c.identifyTried && <button type="button" onClick={() => patch({ identifyTried: false })}>Yeniden denesin</button>}
            </>
          )}
        </div>
        </details>
      )}

      <details open={c.conditions.length > 0}>
        <summary>Durum etkileri</summary>
        {CONDITIONS.map((x) => (
          <label key={x}><input type="checkbox" checked={c.conditions.includes(x)} onChange={() => toggle(x)} /> {CONDITION_TR[x]}</label>
        ))}
      </details>

      {c.kind === 'monster' && def && (
        <div className="actions">
          {def.actions.map((a, index) => (a.attack ? (
            <button key={a.name.en} disabled={c.hp === 0}
              onClick={() => send({ type: 'combat.monsterAttack', combatantId: c.id, actionIndex: index, mode })}>
              {displayName(a.name)} ({a.attack.bonus >= 0 ? '+' : ''}{a.attack.bonus})
            </button>
          ) : null))}
          <details className="full-stats">
            <summary>Tüm değerler ve eylem metinleri</summary>
            <StatBlock monster={def} />
          </details>
          <details className="row-more">
          <summary>Kurtarma zarı</summary>
          <div className="save">
            <label>Kurtarma{' '}
              <select value={ability} onChange={(e) => setAbility(e.target.value as Ability)}>
                {ABILITIES.map((a) => <option key={a} value={a}>{ABILITY_TR[a]}</option>)}
              </select>
            </label>
            <label>Zorluk derecesi <input type="number" min={1} max={40} value={dc} onChange={(e) => setDc(num(e))} /></label>
            <button onClick={() => send({ type: 'combat.monsterSave', combatantId: c.id, ability, dc, mode })}>Kurtarma zarı at</button>
          </div>
          </details>
          <button onClick={() => send({ type: 'encounter.remove', combatantId: c.id })}>Savaştan çıkar</button>
        </div>
      )}
    </li>
  );
}

const nameOf = (c: Combatant, view: DmView): string => (c.kind === 'monster' ? c.name : (view.character?.name ?? 'Karakter'));

/** Savaş başladı, sıra henüz kurulmadı: oyuncu çeviklik zarını atar, DM yaratıklarınkini atar ve sırayı kurar. */
function Initiative({ view, send }: { view: DmView; send: Send }) {
  const [mode, setMode] = useState<RollMode>('normal');
  const e = view.encounter!;
  const waiting = e.combatants.filter((c) => c.initiative === null);
  const monstersWaiting = waiting.some((c) => c.kind === 'monster');
  const ordered = [...e.combatants].sort((a, b) => (b.initiative ?? -Infinity) - (a.initiative ?? -Infinity));
  return (
    <section aria-label="İnisiyatif" className="initiative">
      <h2>İnisiyatif</h2>
      <p>Oyuncunun çeviklik zarını bekle, yaratıkların zarını at, sonra sırayı kur.</p>
      <ModeSelect value={mode} onChange={setMode} />
      <ol>
        {ordered.map((c) => (
          <li key={c.id}>
            <strong>{nameOf(c, view)}</strong>
            {c.initiative === null ? (
              <>
                <span className="waiting">{c.kind === 'character' ? 'oyuncunun zarı bekleniyor' : 'bekleniyor'}</span>
                <button type="button" onClick={() => send({ type: 'combat.rollInitiative', combatantId: c.id, mode })}>
                  {c.kind === 'character' ? 'Oyuncu yerine at' : 'Zar at'}
                </button>
              </>
            ) : <span className="value">{c.initiative}</span>}
          </li>
        ))}
      </ol>
      {monstersWaiting && (
        <button type="button" onClick={() => send({ type: 'combat.rollInitiative', mode })}>Yaratıkların zarını at</button>
      )}
      <button type="button" className="btn-primary" disabled={waiting.length > 0} onClick={() => send({ type: 'combat.begin' })}>
        Sırayı kur ve başlat
      </button>
      <button type="button" onClick={() => { if (window.confirm('Savaş bitsin mi? Canavarlar masadan kalkar.')) send({ type: 'encounter.end' }); }}>
        Savaşı bitir
      </button>
    </section>
  );
}

export function DmCombat({ view, monsters, send }: { view: DmView; monsters: Map<string, Monster>; send: Send }) {
  const [mode, setMode] = useState<RollMode>('normal');
  const e = view.encounter;
  if (!e || e.status === 'draft') return null;
  if (e.status === 'initiative') return <Initiative view={view} send={send} />;
  if (view.theater) {
    return (
      <section aria-label="Hayali savaş" className="track">
        <h2>Hayali savaş</h2>
        <p className="hint">Sıra ve harita yok; oyuncu savaş ekranını görmez. Yaratığı öldür ya da canları düşür.</p>
        <ol>
          {e.combatants.map((c) => (
            <Row key={c.id} c={c} view={view} current={false} mode={mode} send={send} theater
              def={c.kind === 'monster' ? monsters.get(c.monsterId) : undefined} />
          ))}
        </ol>
        <button onClick={() => { if (window.confirm('Savaş bitsin mi? Canavarlar masadan kalkar.')) send({ type: 'encounter.end' }); }}>
          Savaşı bitir
        </button>
      </section>
    );
  }
  return (
    <section aria-label="Savaş" className="track">
      <h2>Savaş — {e.round}. raunt</h2>
      <TurnRail items={e.combatants.map((c, index) => ({
        id: c.id, current: index === e.turnIndex,
        name: c.kind === 'monster' ? c.name : (view.character?.name ?? 'Karakter'),
        down: c.kind === 'monster' ? c.hp === 0 : (view.character?.hp ?? 1) === 0,
      }))} />
      <ModeSelect value={mode} onChange={setMode} />
      <ol>
        {e.combatants.map((c, index) => (
          <Row key={c.id} c={c} view={view} current={index === e.turnIndex} mode={mode} send={send}
            def={c.kind === 'monster' ? monsters.get(c.monsterId) : undefined} />
        ))}
      </ol>
      <button className="btn-primary" onClick={() => send({ type: 'combat.nextTurn' })}>Sıradaki</button>
      <button onClick={() => { if (window.confirm('Savaş bitsin mi? Canavarlar masadan kalkar.')) send({ type: 'encounter.end' }); }}>
        Savaşı bitir
      </button>
    </section>
  );
}
