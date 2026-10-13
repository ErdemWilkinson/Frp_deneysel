import { useEffect, useState } from 'react';
import { fileMeta, type FileMeta } from './api';

const BY = { dm: 'DM', player: 'Oyuncu' } as const;

/** Yüklenen bir dosyanın kim tarafından, ne zaman yüklendiğini küçük bir satırda gösterir. */
export function FileStamp({ id }: { id: string }) {
  const [meta, setMeta] = useState<FileMeta | null>(null);
  useEffect(() => {
    let live = true;
    setMeta(null);
    fileMeta(id).then((m) => { if (live) setMeta(m); }).catch(() => { /* bilgi yoksa satır görünmez */ });
    return () => { live = false; };
  }, [id]);
  if (!meta || !Number.isFinite(meta.at)) return null;
  const when = new Date(meta.at).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  return (
    <p className="file-stamp">
      <strong>{meta.name}</strong> · {meta.by ? `${BY[meta.by]} yükledi` : 'Yüklendi'} · <time dateTime={new Date(meta.at).toISOString()}>{when}</time>
    </p>
  );
}
