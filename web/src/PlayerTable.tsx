import { useState } from 'react';
import type { PlayerView } from '@masa/shared';
import { Battlefield } from './Battlefield';
import { CharacterCard } from './CharacterCard';
import { DiceLog } from './DiceLog';
import { Inventory } from './Inventory';
import { PlayerStart } from './PlayerStart';
import { SheetViewer } from './SheetViewer';
import { Split } from './Split';
import { Tabs } from './Tabs';
import type { Send } from './useTable';

interface Props {
  view: PlayerView;
  send: Send;
  /** Oyuncu masaya yeni oturduysa önce karakter seçim ekranı açılır. */
  startOpen?: boolean;
}

export function PlayerTable({ view, send, startOpen = false }: Props) {
  const [choosing, setChoosing] = useState(startOpen);
  const [tab, setTab] = useState('field');
  if (!view.character || choosing) {
    return <PlayerStart current={view.character} send={send} onDone={() => { setChoosing(false); setTab('field'); }} />;
  }

  const mine = (
    <>
      <button type="button" className="back" onClick={() => setChoosing(true)}>Başka karakter seç</button>
      <CharacterCard character={view.character} send={send} />
      <SheetViewer sheetId={view.sheetId} send={send} />
    </>
  );
  return (
    <Split id="player-2" initial={[70, 30]} labels={['Savaş alanı', 'Zar']} min={20}>
      <Tabs label="Masa" active={tab} onChange={setTab} tabs={[
        { key: 'field', label: 'Harita', content: <Battlefield view={view} send={send} /> },
        { key: 'mine', label: 'Karakterim', content: mine },
        { key: 'bag', label: 'Çanta', content: <Inventory character={view.character} send={send} /> },
      ]} />
      <DiceLog log={view.log} send={send} canSecret={false} character={view.character} theater={!!(view.theater || view.encounter?.theater)} />
    </Split>
  );
}
