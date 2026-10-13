import { useId, type KeyboardEvent, type ReactNode } from 'react';

export interface Tab { key: string; label: string; content: ReactNode }

interface Props { label: string; tabs: Tab[]; active: string; onChange: (key: string) => void }

/** Sekmeler. Yalnızca açık sekmenin içeriği çizilir. */
export function Tabs({ label, tabs, active, onChange }: Props) {
  const base = useId();
  const current = tabs.find((t) => t.key === active) ?? tabs[0]!;
  const move = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = tabs[(tabs.indexOf(current) + step + tabs.length) % tabs.length]!;
    onChange(next.key);
    document.getElementById(`${base}-${next.key}`)?.focus();
  };

  return (
    <div className="tabs">
      <div role="tablist" aria-label={label} onKeyDown={move}>
        {tabs.map((t) => (
          <button key={t.key} id={`${base}-${t.key}`} role="tab" type="button" aria-selected={t === current}
            tabIndex={t === current ? 0 : -1} onClick={() => onChange(t.key)}>{t.label}</button>
        ))}
      </div>
      <div role="tabpanel" aria-labelledby={`${base}-${current.key}`}>{current.content}</div>
    </div>
  );
}
