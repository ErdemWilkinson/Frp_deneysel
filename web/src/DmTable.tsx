import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { DmView, Monster, Region } from '@masa/shared';
import { fetchMonsters } from './api';
import { Bestiary } from './Bestiary';
import { DmBoard } from './Board';
import { CharacterCard } from './CharacterCard';
import { DiceLog } from './DiceLog';
import { DmCombat } from './DmCombat';
import { EncounterPanel } from './EncounterPanel';
import { Inventory } from './Inventory';
import { MonsterEditor } from './MonsterEditor';
import { RaceBook, SpellBook } from './Reference';
import { SheetViewer } from './SheetViewer';
import { Split } from './Split';
import { useStored } from './storage';
import { Tabs } from './Tabs';
import type { Send } from './useTable';
import { DmWorld } from './WorldMap';

export function DmTable({ view, send }: { view: DmView; send: Send }) {
  const [monsters, setMonsters] = useState<Monster[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [bookTab, setBookTab] = useStored('masa.tab.dm-book', 'book');
  const [tableTab, setTableTab] = useStored('masa.tab.dm-table-2', 'combat');
  const [editing, setEditing] = useState<Monster | null>(null);
  const load = useCallback(() => {
    fetchMonsters().then(setMonsters).catch((e: Error) => setError(e.message));
  }, []);
  useEffect(load, [load]);
  // Yaratık kaydı ya da silme sunucuda işlenince yeni durum yayınlanır; kitap o zaman yeniden okunur.
  const stale = useRef(false);
  useEffect(() => {
    if (!stale.current) return;
    stale.current = false;
    load();
  }, [view, load]);
  const refreshSoon = () => { stale.current = true; };

  const byId = useMemo(() => new Map(monsters.map((m) => [m.id, m])), [monsters]);
  const types = useMemo(() => [...new Set(monsters.map((m) => m.type))].sort(), [monsters]);
  const onRegions = (monsterId: string, regions: Region[]) =>
    setMonsters((list) => list.map((m) => (m.id === monsterId ? { ...m, regions } : m)));

  const creatures = useMemo(() => monsters.filter((m) => !m.human), [monsters]);
  const people = useMemo(() => monsters.filter((m) => m.human), [monsters]);
  const bookOf = (list: Monster[], title: string) => (
    <>
      {error && <p role="alert" className="error">Kitap yüklenemedi: {error}</p>}
      <Bestiary monsters={list} title={title} send={send} onRegions={onRegions} onDeleted={refreshSoon}
        onEdit={(m) => { setEditing(m); setBookTab('create'); }} />
    </>
  );
  const create = (
    <MonsterEditor editing={editing} types={types} send={send}
      onSaved={(_id, human) => { refreshSoon(); setEditing(null); setBookTab(human ? 'people' : 'book'); }}
      onCancel={() => { setEditing(null); setBookTab('book'); }} />
  );
  const combat = view.encounter && view.encounter.status !== 'draft'
    ? <DmCombat view={view} monsters={byId} send={send} />
    : <EncounterPanel view={view} send={send} />;

  return (
    <Split id="dm-2" initial={[26, 50, 24]} labels={['Kitap', 'Masa', 'Zar']}>
      <Tabs label="Kitap" active={bookTab} onChange={setBookTab} tabs={[
        { key: 'book', label: 'Canavar kitabı', content: bookOf(creatures, 'Canavar kitabı') },
        { key: 'people', label: 'İnsan kitabı', content: bookOf(people, 'İnsan kitabı') },
        { key: 'spells', label: 'Büyüler kitabı', content: <SpellBook cantrips={false} /> },
        { key: 'cantrips', label: 'Büyü hileleri', content: <SpellBook cantrips /> },
        { key: 'races', label: 'Irklar kitabı', content: <RaceBook /> },
        { key: 'create', label: editing ? 'Yaratığı düzenle' : 'Yaratık yarat', content: create },
      ]} />
      <Tabs label="Masa" active={tableTab} onChange={setTableTab} tabs={[
        { key: 'combat', label: 'Savaş', content: <div className="dm-battle"><div className="dm-battle-combat">{combat}</div><div className="dm-battle-board"><DmBoard view={view} monsters={byId} send={send} /></div></div> },
        { key: 'world', label: 'Ana harita', content: <DmWorld view={view} send={send} onEncounter={() => setTableTab('combat')} /> },
        { key: 'hero', label: 'Oyuncunun karakteri', content: (
          <>
            <CharacterCard character={view.character} send={send} />
            {view.character && <Inventory character={view.character} send={send} />}
            <SheetViewer sheetId={view.sheetId} send={send} />
          </>
        ) },
      ]} />
      <DiceLog log={view.log} send={send} canSecret />
    </Split>
  );
}
