import { useState } from 'react';
import { DIFFICULTIES, DIFFICULTY_TR, REGIONS, REGION_TR, type Difficulty, type DmView, type Region } from '@masa/shared';
import { num } from './controls';
import type { Send } from './useTable';

export function EncounterPanel({ view, send }: { view: DmView; send: Send }) {
  // Bölge, DM elle değiştirmedikçe karakterin ana haritadaki yerinden gelir.
  const [picked, setRegion] = useState<Region | null>(null);
  const region = picked ?? view.world.region ?? 'forest';
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [level, setLevel] = useState<number | null>(null);
  const draft = view.encounter?.status === 'draft' ? view.encounter.combatants : [];
  const effectiveLevel = level ?? view.character?.level ?? 1;

  return (
    <section aria-label="Karşılaşma" className="encounter">
      <h2>Karşılaşma taslağı</h2>
      <div className="generator">
        <label>Bölge{' '}
          <select value={region} onChange={(e) => setRegion(e.target.value as Region)}>
            {REGIONS.map((r) => <option key={r} value={r}>{REGION_TR[r]}</option>)}
          </select>
        </label>
        <label>Oyuncu seviyesi <input type="number" min={1} max={20} value={effectiveLevel} onChange={(e) => setLevel(num(e))} /></label>
        <label>Zorluk{' '}
          <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
            {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_TR[d]}</option>)}
          </select>
        </label>
        <button onClick={() => send({ type: 'encounter.generate', region, level: effectiveLevel, difficulty })}>Rastgele üret</button>
      </div>

      {view.world.region && <p className="hint">Karakter ana haritada {REGION_TR[view.world.region]} bölgesinde.</p>}
      {draft.length === 0 && <p>Karşılaşma boş. Kitaptan canavar ekle ya da rastgele üret.</p>}
      <ul>
        {draft.map((c) => c.kind === 'monster' && (
          <li key={c.id}>
            {c.name} — {c.hp} can puanı, zırh sınıfı {c.ac}{' '}
            <button aria-label={`${c.name} çıkar`} onClick={() => send({ type: 'encounter.remove', combatantId: c.id })}>Çıkar</button>
          </li>
        ))}
      </ul>

      {!view.character && <p>Oyuncu karakter kartını doldurmadan savaş başlatılamaz.</p>}
      <button className="btn-primary" disabled={draft.length === 0 || !view.character} onClick={() => send({ type: 'encounter.start' })}>Savaşı başlat</button>
      <button disabled={draft.length === 0} onClick={() => send({ type: 'board.placeCombatants' })}>Savaşçıları diz</button>
      {draft.length > 0 && <button onClick={() => send({ type: 'encounter.end' })}>Taslağı sil</button>}
    </section>
  );
}
