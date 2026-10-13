import { useState, type FormEvent } from 'react';
import type { DmView } from '@masa/shared';
import type { Send } from './useTable';
import { deleteGame, listGames, loadGame, newGame, saveGame, type SavedGame } from './api';

const when = (at: number): string => new Date(at).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' });

/**
 * DM'in oyun menüsü: yeni oyun, savaş kipi, oyunu kaydet, kayıtlı oyunu yükle.
 * `view` ve `send` verilirse hayali savaş ve yaratığı zarla tanıtma anahtarları da burada durur.
 */
export function GameMenu({ view, send }: { view?: DmView; send?: Send } = {}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [saves, setSaves] = useState<SavedGame[] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => listGames().then(setSaves).catch((e: Error) => setError(e.message));
  const run = (work: Promise<unknown>, done: string) => {
    setError(null);
    setNotice(null);
    return work.then(() => { setNotice(done); return refresh(); }).catch((e: Error) => setError(e.message));
  };
  const toggle = () => {
    setOpen(!open);
    setNotice(null);
    setError(null);
    if (!open) void refresh();
  };

  const startNew = () => {
    if (!window.confirm('Yeni oyun açılsın mı?\n\nMasadaki karakter, savaş, savaş alanı ve günlük temizlenir; kaydetmediğin ilerleme kaybolur. Oyuncu karakter seçim ekranına döner.\n\nKayıtlı oyunlar, karakter defteri ve kendi yarattığın canavarlar silinmez.')) return;
    void run(newGame(), 'Yeni oyun açıldı. Oyuncu karakterini seçiyor.');
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    void run(saveGame(name), `"${name.trim()}" kaydedildi.`).then(() => setName(''));
  };
  const load = (game: SavedGame) => {
    if (!window.confirm(`"${game.name}" yüklensin mi? Masanın şimdiki hali kaydedilmediyse kaybolur.`)) return;
    void run(loadGame(game.id), `"${game.name}" yüklendi.`);
  };
  const remove = (game: SavedGame) => {
    if (!window.confirm(`"${game.name}" kaydı silinsin mi?`)) return;
    void run(deleteGame(game.id), `"${game.name}" silindi.`);
  };

  return (
    <div className="game-menu">
      <button type="button" aria-expanded={open} onClick={toggle}>Oyun</button>
      {open && (
        <div className="game-panel" role="group" aria-label="Oyun menüsü">
          {view && send && (
            <section className="menu-group" aria-label="Savaş">
              <h3>Savaş</h3>
              <label className="switch">
                <input type="checkbox" checked={!!view.theater}
                  onChange={(e) => send({ type: 'table.setTheater', theater: e.target.checked })} /> Hayali savaş (DM yönetir)
              </label>
              <label className="switch">
                <input type="checkbox" checked={!!view.identify}
                  onChange={(e) => send({ type: 'table.setIdentify', identify: e.target.checked })} /> Yaratıkları zarla tanıt
              </label>
            </section>
          )}

          <section className="menu-group" aria-label="Kayıt">
            <h3>Kayıt</h3>
            <form onSubmit={save}>
              <input aria-label="Kayıt adı" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="Kayıt adı: 2. oturum" required />
              <button>Oyunu kaydet</button>
            </form>
            {saves === null && <p className="hint">Kayıtlar getiriliyor…</p>}
            {saves?.length === 0 && <p className="hint">Henüz kayıt yok.</p>}
            <ul aria-label="Kayıtlı oyunlar">
              {saves?.map((g) => (
                <li key={g.id}>
                  <span><strong>{g.name}</strong> <small>{when(g.at)}{g.hero ? ` · ${g.hero}` : ''}</small></span>
                  <button type="button" aria-label={`${g.name} kaydını yükle`} onClick={() => load(g)}>Yükle</button>
                  <button type="button" aria-label={`${g.name} kaydını sil`} onClick={() => remove(g)}>Sil</button>
                </li>
              ))}
            </ul>
          </section>

          <button type="button" className="danger" onClick={startNew}>Yeni oyun aç</button>
          {notice && <p role="status">{notice}</p>}
          {error && <p role="alert" className="error">{error}</p>}
        </div>
      )}
    </div>
  );
}
