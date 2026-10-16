import { useEffect, useState } from 'react';
import { ApiError, logout, me, type Session } from './api';
import { GameMenu } from './GameMenu';
import { Gate } from './Gate';
import { Library } from './Library';
import { Workshop } from './Workshop';
import { DmTable } from './DmTable';
import { PlayerTable } from './PlayerTable';
import { RollToast } from './RollToast';
import { useTable } from './useTable';

function Table({ session, fresh, onLeave }: { session: Session; fresh: boolean; onLeave: () => void }) {
  const { view, status, error, send } = useTable();
  return (
    <div className="app">
      <header className="bar">
        <strong>Açık Masa</strong>
        <span>Masa kodu: {session.code}</span>
        {session.role === 'dm' ? <h1 className="role-title">DM</h1> : <span>Oyuncu</span>}
        {session.role === 'dm' && <GameMenu view={view?.role === 'dm' ? view : undefined} send={send} />}
        {status === 'connecting' && <span role="status">Masa uyanıyor, yeniden bağlanılıyor…</span>}
        <button onClick={onLeave}>Çık</button>
      </header>
      {error && <p role="alert" className="error">{error}</p>}
      {view && <RollToast log={view.log} />}
      {!view && <p className="notice">Masaya bağlanılıyor…</p>}
      {view?.role === 'player' && <PlayerTable view={view} send={send} startOpen={fresh} />}
      {view?.role === 'dm' && <DmTable view={view} send={send} />}
    </div>
  );
}

/** Giriş gerektirmeyen sayfalar adres çubuğundaki # ile açılır; bağlantı arkadaşa olduğu gibi gönderilebilir. */
function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => setHash(window.location.hash);
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

export function App() {
  const hash = useHash();
  // undefined: henüz bilinmiyor (sunucu uyanıyor olabilir); null: giriş yapılmamış.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  // Giriş bu sayfada yapıldıysa oyuncu karakter seçimiyle karşılanır; sayfa yenilemede kaldığı yerden sürer.
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      me()
        .then((s) => { if (!stopped) setSession(s); })
        .catch((e) => {
          if (stopped) return;
          if (e instanceof ApiError && e.status === 401) setSession(null);
          else timer = setTimeout(check, 3000);
        });
    };
    check();
    return () => { stopped = true; clearTimeout(timer); };
  }, []);

  // Atölye ve kitaplık, sunucu uyanırken ya da giriş yokken de açılır.
  if (hash === '#atolye') return <Workshop />;
  if (hash === '#kitap') return <Library />;
  if (session === undefined) return <p className="notice">Masa uyanıyor…</p>;
  if (session === null) return <Gate onEnter={(s) => { setFresh(true); setSession(s); }} />;
  return <Table session={session} fresh={fresh} onLeave={() => { void logout().finally(() => setSession(null)); }} />;
}
