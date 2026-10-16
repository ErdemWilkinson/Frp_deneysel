import { useState, type FormEvent } from 'react';
import { loginDm, loginPlayer, type Session } from './api';
import { Die } from './Die';

export function Gate({ onEnter }: { onEnter: (session: Session) => void }) {
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const enter = (attempt: () => Promise<Session>) => (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    attempt()
      .then(onEnter)
      .catch((e: Error) => { setError(e.message); setBusy(false); });
  };

  return (
    <main className="gate">
      <div className="gate-hero">
        <Die value={20} tone="crit" size={132} />
        <h1>Açık Masa</h1>
        <p>İki kişilik bir D&D 5. sürüm masası. DM canavarları kitaptan seçer, zarlar sunucuda atılır.</p>
      </div>
      <form onSubmit={enter(() => loginPlayer(code))}>
        <h2>Oyuncu</h2>
        <label>Masa kodu <input value={code} onChange={(e) => setCode(e.target.value)} maxLength={12} required /></label>
        <button className="btn-primary" disabled={busy}>Masaya otur</button>
      </form>
      <form onSubmit={enter(() => loginDm(password))}>
        <h2>DM</h2>
        <label>Parola <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></label>
        <button className="btn-primary" disabled={busy}>DM olarak gir</button>
      </form>
      {error && <p role="alert">{error}</p>}
      <nav className="gate-explore" aria-label="Masa olmadan">
        <h2>Masa açık değil mi?</h2>
        <p>Giriş yapmadan karakterini hazırla ya da kitaplara göz at.</p>
        <a className="btn-primary" href="#atolye">Karakter atölyesi</a>
        <a className="btn-primary" href="#kitap">Kitaplığa göz at</a>
      </nav>
      <footer className="attribution">
        <p>
          This work includes material taken from the System Reference Document 5.1 (“SRD 5.1”) by Wizards of
          the Coast LLC and available at https://dnd.wizards.com/resources/systems-reference-document. The SRD
          5.1 is licensed under the Creative Commons Attribution 4.0 International License available at
          https://creativecommons.org/licenses/by/4.0/legalcode.
        </p>
        <p>SRD metinleri bu uygulamada Türkçeye çevrilmiş ve bölge etiketleriyle sınıflandırılmıştır.</p>
      </footer>
    </main>
  );
}
