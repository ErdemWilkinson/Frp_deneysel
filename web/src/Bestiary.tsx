import { useMemo, useState } from 'react';
import { REGIONS, REGION_TR, displayName, filterMonsters, type Monster, type MonsterFilter, type Region } from '@masa/shared';
import { num } from './controls';
import { StatBlock, crLabel, isCustom } from './StatBlock';
import type { Send } from './useTable';

interface Props {
  monsters: Monster[];
  send: Send;
  onRegions: (monsterId: string, regions: Region[]) => void;
  /** Kendi yarattığı canavarı düzenlemeye açar. */
  onEdit?: (monster: Monster) => void;
  /** Kitaptan bir kayıt silindiğinde çağrılır. */
  onDeleted?: () => void;
  /** Kitabın başlığı: canavar kitabı ya da insan kitabı. */
  title?: string;
}

export function Bestiary({ monsters, send, onRegions, onEdit, onDeleted, title = 'Canavar kitabı' }: Props) {
  const [filter, setFilter] = useState<MonsterFilter>({});
  const [onlyCustom, setOnlyCustom] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [count, setCount] = useState(1);
  const [hpMode, setHpMode] = useState<'average' | 'rolled'>('average');

  const shown = useMemo(
    () => filterMonsters(monsters, filter).filter((m) => !onlyCustom || isCustom(m)),
    [monsters, filter, onlyCustom],
  );
  const types = useMemo(() => [...new Set(monsters.map((m) => m.type))].sort(), [monsters]);
  const sizes = useMemo(() => [...new Set(monsters.map((m) => m.size))].sort(), [monsters]);
  const selected = monsters.find((m) => m.id === selectedId) ?? null;
  const patch = (p: Partial<MonsterFilter>) => setFilter((f) => ({ ...f, ...p }));
  const optionalNumber = (value: string): number | undefined => (value === '' ? undefined : Number(value));

  const toggleRegion = (m: Monster, region: Region) => {
    const regions = m.regions.includes(region) ? m.regions.filter((r) => r !== region) : [...m.regions, region];
    send({ type: 'monster.setRegions', monsterId: m.id, regions });
    onRegions(m.id, regions);
  };
  const remove = (m: Monster) => {
    if (!window.confirm(`${displayName(m.name)} kitaptan silinsin mi?`)) return;
    send({ type: 'monster.delete', monsterId: m.id });
    setSelectedId(null);
    onDeleted?.();
  };

  return (
    <section aria-label={title} className="bestiary">
      <h2>{title}</h2>
      <div className="filters">
        <label>Ara <input value={filter.text ?? ''} onChange={(e) => patch({ text: e.target.value })} /></label>
        <label>Bölge{' '}
          <select value={filter.region ?? ''} onChange={(e) => patch({ region: e.target.value as Region | '' })}>
            <option value="">Hepsi</option>
            {REGIONS.map((r) => <option key={r} value={r}>{REGION_TR[r]}</option>)}
          </select>
        </label>
        <details className="more-filters">
        <summary>Daha fazla süzgeç</summary>
        <label>Tür{' '}
          <select value={filter.type ?? ''} onChange={(e) => patch({ type: e.target.value })}>
            <option value="">Hepsi</option>
            {types.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </label>
        <label>Boyut{' '}
          <select value={filter.size ?? ''} onChange={(e) => patch({ size: e.target.value })}>
            <option value="">Hepsi</option>
            {sizes.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <label>En az meydan okuma derecesi <input type="number" min={0} step="any" value={filter.crMin ?? ''} onChange={(e) => patch({ crMin: optionalNumber(e.target.value) })} /></label>
        <label>En çok meydan okuma derecesi <input type="number" min={0} step="any" value={filter.crMax ?? ''} onChange={(e) => patch({ crMax: optionalNumber(e.target.value) })} /></label>
        <label><input type="checkbox" checked={onlyCustom} onChange={(e) => setOnlyCustom(e.target.checked)} /> Yalnızca kendi yarattıklarım</label>
        </details>
      </div>

      <p>{shown.length} canavar</p>
      <ul aria-label="Canavarlar" className="monster-list">
        {shown.map((m) => (
          <li key={m.id}>
            <button aria-pressed={m.id === selectedId} onClick={() => setSelectedId(m.id)}>
              {displayName(m.name)} <small>Meydan okuma derecesi {crLabel(m.cr)}</small>{isCustom(m) && <small className="tag">senin</small>}
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <StatBlock monster={selected}>
          {isCustom(selected) && (
            <div className="add">
              {onEdit && <button onClick={() => onEdit(selected)}>Düzenle</button>}
              <button onClick={() => remove(selected)}>Kitaptan sil</button>
            </div>
          )}
          <fieldset>
            <legend>Bölgeler</legend>
            {REGIONS.map((r) => (
              <label key={r}>
                <input type="checkbox" checked={selected.regions.includes(r)} onChange={() => toggleRegion(selected, r)} /> {REGION_TR[r]}
              </label>
            ))}
          </fieldset>

          <div className="add">
            <label>Adet <input type="number" min={1} max={10} value={count} onChange={(e) => setCount(num(e))} /></label>
            <label>Can puanı{' '}
              <select value={hpMode} onChange={(e) => setHpMode(e.target.value as 'average' | 'rolled')}>
                <option value="average">Ortalama</option>
                <option value="rolled">Zarla at</option>
              </select>
            </label>
            <button onClick={() => send({ type: 'encounter.addMonster', monsterId: selected.id, count, hpMode })}>
              Karşılaşmaya ekle
            </button>
          </div>
        </StatBlock>
      )}
    </section>
  );
}
