import { useEffect, useState, type ChangeEvent } from 'react';
import type { Character } from '@masa/shared';
import { fetchCharacters } from './api';
import { CharacterCard, readCharacter } from './CharacterCard';
import type { Send } from './useTable';

interface Props {
  /** Masada şu an duran karakter; varsa "geri dön" seçeneği çıkar. */
  current: Character | null;
  send: Send;
  /** Karakter seçildi ya da vazgeçildi: masaya dönülür. */
  onDone: () => void;
}

/** Oyuncunun ilk ekranı: yalnızca iki seçenek. */
export function PlayerStart({ current, send, onDone }: Props) {
  const [step, setStep] = useState<'menu' | 'new' | 'load'>('menu');
  const [saved, setSaved] = useState<Character[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (step !== 'load') return;
    setSaved(null);
    setError(null);
    fetchCharacters().then(setSaved).catch((e: Error) => { setSaved([]); setError(e.message); });
  }, [step]);

  const use = (character: object) => {
    send({ type: 'character.set', character });
    onDone();
  };
  const fromFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    file.text()
      .then((raw) => readCharacter(JSON.parse(raw)))
      .catch(() => null)
      .then((read) => (read ? use(read) : setError('Bu dosya bir karakter kartı değil. Buradan dışa aktarılmış bir .json dosyası seç.')));
  };

  if (step === 'new') {
    return (
      <main className="start">
        <button type="button" className="back" onClick={() => setStep('menu')}>Geri</button>
        <CharacterCard character={null} send={send} title="Yeni karakter" saveLabel="Karakteri kaydet ve masaya otur" onSaved={onDone} />
      </main>
    );
  }

  if (step === 'load') {
    return (
      <main className="start">
        <button type="button" className="back" onClick={() => setStep('menu')}>Geri</button>
        <h1>Eski karakteri yükle</h1>
        {error && <p role="alert" className="error">{error}</p>}
        {saved === null && <p className="hint">Karakterler getiriliyor…</p>}
        {saved?.length === 0 && !error && <p>Bu masada kayıtlı karakter yok. Dosyadan yükleyebilir ya da yeni bir karakter yapabilirsin.</p>}
        <ul className="roster" aria-label="Kayıtlı karakterler">
          {saved?.map((c) => (
            <li key={c.name}>
              <button type="button" className="choice" onClick={() => use(c)}>
                <strong>{c.name}</strong>
                <span>{c.level}. seviye · {c.hp}/{c.maxHp} can puanı · zırh sınıfı {c.ac}</span>
              </button>
            </li>
          ))}
        </ul>
        <label className="file-btn">Dosyadan yükle (.json)
          <input type="file" accept="application/json,.json" onChange={fromFile} />
        </label>
      </main>
    );
  }

  return (
    <main className="start">
      <h1>Masaya hoş geldin</h1>
      <p className="hint">Hangi karakterle oynayacaksın?</p>
      <div className="choices">
        <button type="button" className="choice" onClick={() => setStep('new')}>
          <strong>Yeni karakter yap</strong>
          <span>Adını, canını ve saldırılarını gir.</span>
        </button>
        <button type="button" className="choice" onClick={() => setStep('load')}>
          <strong>Eski karakteri yükle</strong>
          <span>Daha önce kaydettiğin karakterle devam et.</span>
        </button>
      </div>
      {current && (
        <button type="button" className="choice slim" onClick={onDone}>
          <strong>{current.name} ile devam et</strong>
          <span>Masada duran karakter: {current.level}. seviye, {current.hp}/{current.maxHp} can puanı.</span>
        </button>
      )}
    </main>
  );
}
