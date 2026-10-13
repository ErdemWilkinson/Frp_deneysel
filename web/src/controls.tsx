import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent } from 'react';
import type { RollMode } from '@masa/shared';

export const num = (event: ChangeEvent<HTMLInputElement>): number => Number(event.target.value);

export function ModeSelect({ value, onChange }: { value: RollMode; onChange: (mode: RollMode) => void }) {
  return (
    <label>
      Zar kipi{' '}
      <select value={value} onChange={(e) => onChange(e.target.value as RollMode)}>
        <option value="normal">Normal</option>
        <option value="advantage">Avantaj</option>
        <option value="disadvantage">Dezavantaj</option>
      </select>
    </label>
  );
}

const BAND_FRACTION = { healthy: 1, hurt: 0.75, bloodied: 0.4, down: 0 } as const;

/** Can puanı çubuğu. Sayı biliniyorsa kesin oranı, yoksa kademeyi çizer; can puanı düşünce "−n" yüzer. */
export function HpBar({ hp, max, band }: { hp: number | null; max: number | null; band: keyof typeof BAND_FRACTION | null }) {
  const fraction = hp !== null && max ? Math.max(0, Math.min(1, hp / max)) : band ? BAND_FRACTION[band] : 0;
  const prev = useRef({ fraction, hp });
  const [lost, setLost] = useState<{ n: number | null; key: number } | null>(null);

  useEffect(() => {
    const before = prev.current;
    prev.current = { fraction, hp };
    if (fraction < before.fraction) {
      const n = hp !== null && before.hp !== null ? before.hp - hp : null;
      setLost({ n, key: Date.now() });
      const timer = setTimeout(() => setLost(null), 1100);
      return () => clearTimeout(timer);
    }
    return undefined;
  }, [fraction, hp]);

  const level = fraction > 0.6 ? 'high' : fraction > 0.3 ? 'mid' : 'low';
  return (
    <span className={`hpbar level-${level}`} aria-hidden="true">
      <i style={{ width: `${fraction * 100}%` }} />
      {lost && <b key={lost.key} className="lost">{lost.n !== null ? `−${lost.n}` : '✕'}</b>}
    </span>
  );
}

/** Sıra şeridi: katılımcıları sırayla küçük jetonlar olarak gösterir; sıradaki halkayla işaretlenir. */
export function TurnRail({ items }: { items: { id: string; name: string; current: boolean; down: boolean }[] }) {
  return (
    <div className="turn-rail" aria-hidden="true">
      {items.map((x) => (
        <span key={x.id} className={`token ${x.current ? 'current' : ''} ${x.down ? 'down' : ''}`} title={x.name}>
          {[...x.name][0]}
        </span>
      ))}
    </div>
  );
}
