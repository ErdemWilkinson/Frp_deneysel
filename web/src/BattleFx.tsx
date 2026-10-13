import { useEffect, useRef, useState } from 'react';

type Kind = 'alarm' | 'begin' | 'turn' | 'hit' | 'calm';
interface Fx { kind: Kind; key: number; text: string | null }

const TEXT: Record<Kind, string | null> = { alarm: 'SAVAŞ!', begin: 'Sıra belirlendi', turn: 'Sıra sende', hit: null, calm: 'Savaş bitti' };
const LIFE: Record<Kind, number> = { alarm: 2600, begin: 1700, turn: 1500, hit: 700, calm: 2000 };

interface Props { phase: 'initiative' | 'combat' | null; myTurn: boolean; hp: number | null }

/**
 * Oyuncunun ekranındaki anlık görsel tepkiler: savaş başlayınca kırmızı alarm, sıra gelince fener ışığı,
 * can kaybedince kırmızı çakma, savaş bitince sakin parıltı. Sayfa savaşın ortasında açıldıysa sessiz kalır.
 */
export function BattleFx({ phase, myTurn, hp }: Props) {
  const [fx, setFx] = useState<Fx | null>(null);
  const prev = useRef({ phase, myTurn, hp });
  const counter = useRef(0);

  useEffect(() => {
    const before = prev.current;
    prev.current = { phase, myTurn, hp };
    let kind: Kind | null = null;
    if (before.phase === null && phase !== null) kind = 'alarm';
    else if (before.phase !== null && phase === null) kind = 'calm';
    else if (before.phase === 'initiative' && phase === 'combat') kind = myTurn ? 'turn' : 'begin';
    else if (!before.myTurn && myTurn) kind = 'turn';
    else if (before.hp !== null && hp !== null && hp < before.hp) kind = 'hit';
    if (!kind) return undefined;
    counter.current += 1;
    setFx({ kind, key: counter.current, text: TEXT[kind] });
    const timer = setTimeout(() => setFx(null), LIFE[kind]);
    return () => clearTimeout(timer);
  }, [phase, myTurn, hp]);

  if (!fx) return null;
  return (
    <div className={`fx fx-${fx.kind}`} key={fx.key} aria-hidden="true">
      {fx.text && <span className="fx-banner">{fx.text}</span>}
    </div>
  );
}
