import { useEffect, useState, type ChangeEvent } from 'react';
import { fileUrl, uploadFile } from './api';
import { FileStamp } from './FileStamp';
import type { Send } from './useTable';

/** Dışarıdan yüklenen karakter sayfası (PDF ya da resim). İçeriği okunmaz; olduğu gibi gösterilir. */
export function SheetViewer({ sheetId, send }: { sheetId: string | null; send: Send }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Türü bilmiyoruz: önce resim olarak denenir, açılmazsa PDF çerçevesine geçilir.
  const [asDocument, setAsDocument] = useState(false);
  useEffect(() => setAsDocument(false), [sheetId]);

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    uploadFile('sheet', file)
      .then(({ id }) => send({ type: 'sheet.set', fileId: id }))
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };

  return (
    <section aria-label="Karakter sayfası" className="sheet-viewer">
      <h2>Karakter sayfası</h2>
      <div className="board-tools">
        <label className="file-btn">{busy ? 'Yükleniyor…' : sheetId ? 'Başka sayfa yükle' : 'Sayfa yükle'}
          <input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" disabled={busy} onChange={upload} />
        </label>
        {sheetId && <a href={fileUrl(sheetId)} target="_blank" rel="noreferrer">Yeni sekmede aç</a>}
        {sheetId && <button type="button" onClick={() => send({ type: 'sheet.set', fileId: null })}>Sayfayı kaldır</button>}
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      {sheetId && <FileStamp id={sheetId} />}
      {!sheetId && <p>PDF ya da resim olarak karakter sayfanı yükle; iki taraf da burada görür. En fazla 8 MB.</p>}
      {sheetId && !asDocument && (
        <img className="sheet-image" src={fileUrl(sheetId)} alt="Yüklenen karakter sayfası" onError={() => setAsDocument(true)} />
      )}
      {sheetId && asDocument && <iframe className="sheet-frame" src={fileUrl(sheetId)} title="Yüklenen karakter sayfası" />}
      <p className="hint">Zarlar ve savaş, yandaki karttaki sayılarla işler; sayfadaki değerleri karta sen geçirirsin.</p>
    </section>
  );
}
