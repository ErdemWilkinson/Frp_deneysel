import { useEffect, useRef, useState } from 'react';
import type { LogEntry } from '@masa/shared';
import { Die, type DieTone } from './Die';

interface Shown { id: string; value: number; tone: DieTone; text: string }

const KINDS = new Set<LogEntry['kind']>(['roll', 'attack', 'save']);

/** Günlük satırından zarın sonucunu ve havasını çıkarır; çıkarılamıyorsa null. */
export function readRoll(entry: LogEntry): { value: number; tone: DieTone } | null {
  if (!KINDS.has(entry.kind)) return null;
  const m = entry.text.match(/→ (-?\d+)/) ?? entry.text.match(/: (-?\d+) (?:—|\()/);
  if (!m) return null;
  const t = entry.text;
  const tone: DieTone = /kritik isabet/.test(t) ? 'crit' : /ıska|başarısız/.test(t) ? 'miss' : /isabet|başarılı/.test(t) ? 'hit' : 'normal';
  return { value: Number(m[1]), tone };
}

/** Yeni gelen her zar atışını köşede bir an gösterir. İlk yüklemedeki eski kayıtları göstermez. */
export function RollToast({ log }: { log: LogEntry[] }) {
  const lastSeen = useRef<string | null | undefined>(undefined);
  const [shown, setShown] = useState<Shown | null>(null);

  useEffect(() => {
    const last = log.at(-1)?.id ?? null;
    if (lastSeen.current === undefined) { lastSeen.current = last; return undefined; }
    const from = lastSeen.current ? log.findIndex((e) => e.id === lastSeen.current) : -1;
    const fresh = from >= 0 ? log.slice(from + 1) : log.slice(-1);
    lastSeen.current = last;
    for (let i = fresh.length - 1; i >= 0; i -= 1) {
      const r = readRoll(fresh[i]!);
      if (r) {
        setShown({ id: fresh[i]!.id, text: fresh[i]!.text, ...r });
        const timer = setTimeout(() => setShown(null), 3400);
        return () => clearTimeout(timer);
      }
    }
    return undefined;
  }, [log]);

  if (!shown) return null;
  return (
    <div className={`roll-toast tone-${shown.tone}`} role="status" key={shown.id}>
      <Die value={shown.value} tone={shown.tone} size={96} />
      <p>{shown.text}</p>
    </div>
  );
}
