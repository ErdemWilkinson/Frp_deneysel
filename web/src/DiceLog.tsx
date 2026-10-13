import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Character, LogEntry, RollMode } from '@masa/shared';
import { ActionDeck } from './Actions';
import { ModeSelect } from './controls';
import type { Send } from './useTable';

const QUICK = [4, 6, 8, 10, 12, 20, 100];
const WHO = { dm: 'DM', player: 'Oyuncu' } as const;

const clock = (at: number): string => new Date(at).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

/** Sohbet gibi akan günlük: kutunun boyu sabittir, eski satırlar yukarı kayar; altta değilsen "Yeni" düğmesi çıkar. */
export function DiceLog({ log, send, canSecret, character, theater = false }: {
  log: LogEntry[]; send: Send; canSecret: boolean; character?: Character | null; theater?: boolean;
}) {
  const [expr, setExpr] = useState('1d20');
  const [mode, setMode] = useState<RollMode>('normal');
  const [secret, setSecret] = useState(false);
  const [unread, setUnread] = useState(0);
  const list = useRef<HTMLOListElement>(null);
  const pinned = useRef(true);
  const seen = useRef(log.length);

  const toBottom = () => {
    const el = list.current;
    if (el) el.scrollTop = el.scrollHeight;
    pinned.current = true;
    setUnread(0);
  };
  // Yalnızca günlük kutusunu kaydır; sayfayı kaydırmak oyuncuyu savaş listesinden koparır.
  useEffect(() => {
    const added = Math.max(0, log.length - seen.current);
    seen.current = log.length;
    if (pinned.current) toBottom();
    else if (added > 0) setUnread((n) => n + added);
  }, [log.length]);
  const onScroll = () => {
    const el = list.current;
    if (!el) return;
    pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
    if (pinned.current) setUnread(0);
  };

  const rollExpr = (dice: string) => send({ type: 'roll', expr: dice, mode, ...(canSecret && secret ? { secret: true } : {}) });
  const roll = (event: FormEvent) => {
    event.preventDefault();
    rollExpr(expr);
  };

  return (
    <section aria-label="Zar ve günlük" className="log">
      <h2>Zar ve günlük</h2>
      <div className="chat">
        <ol ref={list} onScroll={onScroll} aria-label="Günlük">
          {log.length === 0 && <li className="empty">Henüz zar atılmadı.</li>}
          {log.map((entry) => (
            <li key={entry.id} className={`${entry.kind} ${entry.visibility === 'dm' ? 'secret' : ''}`}>
              <span className="meta">
                <b>{WHO[entry.actor]}</b> <time dateTime={new Date(entry.at).toISOString()}>{clock(entry.at)}</time>
                {entry.visibility === 'dm' && <span className="tag"> · yalnızca DM</span>}
              </span>
              {entry.text}
            </li>
          ))}
        </ol>
        {unread > 0 && <button type="button" className="chat-new" onClick={toBottom}>{unread} yeni ↓</button>}
      </div>
      <div className="quick-dice" role="group" aria-label="Hızlı zar">
        {QUICK.map((sides) => (
          <button key={sides} type="button" className={`d${sides}`} onClick={() => rollExpr(`1d${sides}`)}>d{sides}</button>
        ))}
      </div>
      <form onSubmit={roll}>
        <label>Zar <input value={expr} onChange={(e) => setExpr(e.target.value)} placeholder="2d6+3" maxLength={60} required /></label>
        <ModeSelect value={mode} onChange={setMode} />
        {canSecret && (
          <label><input type="checkbox" checked={secret} onChange={(e) => setSecret(e.target.checked)} /> Gizli</label>
        )}
        <button className="btn-primary">Zar at</button>
      </form>
      <ActionDeck character={character} send={send} mode={mode} secret={canSecret && secret} theater={theater} />
    </section>
  );
}
