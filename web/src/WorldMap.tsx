import { useRef, useState, type ChangeEvent, type MouseEvent } from 'react';
import {
  DIFFICULTIES, DIFFICULTY_TR, REGIONS, REGION_TR, guessRegion,
  type Difficulty, type DmView, type PlayerView, type Region,
} from '@masa/shared';
import { fileUrl, uploadFile } from './api';
import { FileStamp } from './FileStamp';
import type { Send } from './useTable';

const clamp = (n: number): number => Math.max(0, Math.min(1, n));
const round = (n: number): number => Math.round(n * 1000) / 1000;

/** Resmin verilen noktası çevresindeki ortalama renge bakıp araziyi tahmin eder; resim okunamazsa null. */
export function regionAt(image: HTMLImageElement, x: number, y: number): Region | null {
  try {
    const size = 96;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx || !image.naturalWidth) return null;
    // Noktanın çevresindeki küçük bir kare (haritanın eninin %3'ü) tuvale küçültülerek ortalaması alınır.
    const span = image.naturalWidth * 0.03;
    ctx.drawImage(image, x * image.naturalWidth - span / 2, y * image.naturalHeight - span / 2, span, span, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    let r = 0; let g = 0; let b = 0;
    for (let i = 0; i < data.length; i += 4) { r += data[i]!; g += data[i + 1]!; b += data[i + 2]!; }
    const n = data.length / 4;
    return guessRegion(r / n, g / n, b / n);
  } catch {
    return null;
  }
}

interface SurfaceProps {
  mapId: string;
  x: number;
  y: number;
  label: string;
  /** Haritaya tıklanınca: nokta ve resmin kendisi (renk okumak için). */
  onPlace?: (x: number, y: number, image: HTMLImageElement) => void;
  onAspect?: (aspect: number) => void;
}

function WorldSurface({ mapId, x, y, label, onPlace, onAspect }: SurfaceProps) {
  const image = useRef<HTMLImageElement>(null);
  const click = (event: MouseEvent<HTMLDivElement>) => {
    if (!onPlace || !image.current) return;
    const box = event.currentTarget.getBoundingClientRect();
    onPlace(round(clamp((event.clientX - box.left) / (box.width || 1))), round(clamp((event.clientY - box.top) / (box.height || 1))), image.current);
  };
  return (
    <div className={onPlace ? 'board world clickable' : 'board world'} onClick={click}>
      <img ref={image} className="board-map" src={fileUrl(mapId)} alt="Ana harita" draggable={false}
        onLoad={(e) => onAspect?.(e.currentTarget.naturalHeight / (e.currentTarget.naturalWidth || 1))} />
      <span className="figurine" style={{ left: `${x * 100}%`, top: `${y * 100}%` }} role="img" aria-label={`${label} burada`}>
        <span className="figurine-pin" />
        <span className="pawn-name">{label}</span>
      </span>
    </div>
  );
}

/** Oyuncunun gördüğü ana harita: yalnızca harita ve karakterin yeri. */
export function PlayerWorld({ view }: { view: PlayerView }) {
  if (!view.world) return null;
  return (
    <section aria-label="Ana harita" className="board-panel">
      <WorldSurface mapId={view.world.mapId} x={view.world.x} y={view.world.y} label={view.character?.name ?? 'Karakter'} />
    </section>
  );
}

interface DmProps { view: DmView; send: Send; onEncounter?: () => void }

/** DM'in ana haritası: karakterin yerini işaretler, o yerin arazisine göre karşılaşmayı ve savaş alanını kurar. */
export function DmWorld({ view, send, onEncounter }: DmProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const { world, character } = view;
  const fighting = !!view.encounter && view.encounter.status !== 'draft';

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    uploadFile('map', file)
      .then(({ id }) => send({ type: 'world.setMap', mapId: id }))
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };
  const place = (x: number, y: number, image: HTMLImageElement) => {
    const region = regionAt(image, x, y);
    send({ type: 'world.move', x, y, ...(region ? { region } : {}) });
  };
  const onAspect = (aspect: number) => {
    if (Number.isFinite(aspect) && Math.abs(aspect - world.aspect) > 0.01) send({ type: 'world.setAspect', aspect });
  };
  const build = () => {
    if (!world.region) return;
    send({ type: 'encounter.generate', region: world.region, level: character?.level ?? 1, difficulty });
    onEncounter?.();
  };

  return (
    <section aria-label="Ana harita" className="board-panel">
      <h2>Ana harita</h2>
      <div className="board-tools">
        <label className="file-btn">{busy ? 'Yükleniyor…' : world.mapId ? 'Başka harita yükle' : 'Ana haritayı yükle'}
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={upload} />
        </label>
        {world.mapId && <button type="button" onClick={() => send({ type: 'world.setMap', mapId: null })}>Haritayı kaldır</button>}
        {world.mapId && (
          <label className="switch">
            <input type="checkbox" checked={world.visible} onChange={(e) => send({ type: 'world.show', visible: e.target.checked })} /> Oyuncuya açık
          </label>
        )}
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      {world.mapId && <FileStamp id={world.mapId} />}

      {world.mapId
        ? <WorldSurface mapId={world.mapId} x={world.x} y={world.y} label={character?.name ?? 'Karakter'} onPlace={place} onAspect={onAspect} />
        : <p className="board-closed">Dünyanın büyük haritasını yükle. Karakterin yerini haritaya tıklayarak işaretlersin; karşılaşma ve savaş alanı o yerin arazisine göre kurulur.</p>}

      {world.mapId && (
        <>
          <p className="hint">Karakterin yerini değiştirmek için haritaya tıkla. Arazi, tıkladığın yerin renginden tahmin edilir; yanlışsa aşağıdan düzelt.</p>
          <div className="board-tools here">
            <label>Buradaki arazi{' '}
              <select value={world.region ?? ''} onChange={(e) => send({ type: 'world.setRegion', region: (e.target.value || null) as Region | null })}>
                <option value="">Belirsiz</option>
                {REGIONS.map((r) => <option key={r} value={r}>{REGION_TR[r]}</option>)}
              </select>
            </label>
            <label>Zorluk{' '}
              <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}>
                {DIFFICULTIES.map((d) => <option key={d} value={d}>{DIFFICULTY_TR[d]}</option>)}
              </select>
            </label>
            <button type="button" className="btn-primary" disabled={!world.region || fighting} onClick={build}>Burada karşılaşma kur</button>
          </div>
          {fighting && <p className="hint">Savaş sürüyor; yeni karşılaşma için önce savaşı bitir.</p>}
          {!world.region && <p className="hint">Arazi belirsiz. Haritaya tıkla ya da araziyi listeden seç.</p>}
        </>
      )}
    </section>
  );
}
