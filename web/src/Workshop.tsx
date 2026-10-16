import { useState, type ChangeEvent } from 'react';
import { CharacterCard, readCharacter } from './CharacterCard';
import {
  deleteLocalCharacter, loadLocalCharacters, saveLocalCharacter, type SavedCharacter,
} from './localCharacters';
import type { Send } from './useTable';

const download = (c: SavedCharacter) => {
  const blob = new Blob([JSON.stringify({ format: 'acik-masa-karakter', version: 1, character: c }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${c.name.trim() || 'karakter'}.json`;
  link.click();
  URL.revokeObjectURL(link.href);
};

/**
 * Karakter atölyesi: masa ya da giriş olmadan karakter yap, düzenle, dosyaya aktar.
 * Karakterler yalnızca bu tarayıcıda durur; masada "Eski karakteri yükle → Dosyadan yükle" ile kullanılır.
 */
export function Workshop() {
  const [saved, setSaved] = useState(loadLocalCharacters);
  const [editing, setEditing] = useState<SavedCharacter | 'new' | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const send: Send = (intent) => {
    if (intent.type !== 'character.set') return;
    const character = readCharacter(intent.character);
    if (!character) return;
    setNotice(saveLocalCharacter(character)
      ? `"${character.name}" bu tarayıcıya kaydedildi.`
      : 'Karakter kaydedilemedi: tarayıcı depolaması kapalı. Kartı dosyaya aktararak sakla.');
    setSaved(loadLocalCharacters());
  };
  const fromFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    file.text()
      .then((raw) => readCharacter(JSON.parse(raw)))
      .catch(() => null)
      .then((read) => {
        if (!read) { setNotice('Bu dosya bir karakter kartı değil. Buradan dışa aktarılmış bir .json dosyası seç.'); return; }
        setEditing(read);
        setNotice('Karakter dosyadan açıldı. Kaydetmek için kartın altındaki düğmeye bas.');
      });
  };

  if (editing) {
    const existing = editing === 'new' ? null : { ...editing, deathSaves: { successes: 0, failures: 0 }, dead: false };
    return (
      <main className="start workshop">
        <button type="button" className="back" onClick={() => setEditing(null)}>Atölyeye dön</button>
        <CharacterCard key={editing === 'new' ? 'new' : editing.name} character={existing} send={send} offline
          title={editing === 'new' ? 'Yeni karakter' : editing.name} saveLabel="Karakteri bu tarayıcıya kaydet"
          onSaved={() => setEditing(null)} />
      </main>
    );
  }

  return (
    <main className="start workshop">
      <a className="back" href="#">Ana menüye dön</a>
      <h1>Karakter atölyesi</h1>
      <p className="hint">
        Masa açık olmasa da karakterini yap ya da düzenle. Karakterler yalnızca bu tarayıcıda saklanır;
        masaya otururken <em>Eski karakteri yükle → Dosyadan yükle</em> ile kullanmak için önce dosyaya aktar.
      </p>
      <div className="choices">
        <button type="button" className="choice" onClick={() => { setNotice(null); setEditing('new'); }}>
          <strong>Yeni karakter yap</strong>
          <span>Boş karakter kartından başla.</span>
        </button>
        <label className="choice file-choice">
          <strong>Dosyadan aç (.json)</strong>
          <span>Daha önce dışa aktardığın bir karakteri düzenle.</span>
          <input type="file" accept="application/json,.json" onChange={fromFile} />
        </label>
      </div>
      {notice && <p role="status" className="hint">{notice}</p>}
      <h2>Kayıtlı karakterler</h2>
      {saved.length === 0 && <p className="hint">Bu tarayıcıda henüz karakter yok.</p>}
      <ul className="roster" aria-label="Kayıtlı karakterler">
        {saved.map((c) => (
          <li key={c.name}>
            <button type="button" className="choice" onClick={() => { setNotice(null); setEditing(c); }}>
              <strong>{c.name}</strong>
              <span>{c.profile?.className || 'Sınıf seçilmedi'} · {c.level}. seviye · {c.maxHp} can puanı · zırh sınıfı {c.ac}</span>
            </button>
            <div className="roster-actions">
              <button type="button" aria-label={`${c.name} dosyaya aktar`} onClick={() => download(c)}>Dosyaya aktar</button>
              <button type="button" aria-label={`${c.name} sil`} onClick={() => {
                if (!window.confirm(`"${c.name}" bu tarayıcıdan silinsin mi?`)) return;
                deleteLocalCharacter(c.name);
                setSaved(loadLocalCharacters());
              }}>Sil</button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
