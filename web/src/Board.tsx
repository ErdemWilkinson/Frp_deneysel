import { useId, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent, type MouseEvent, type PointerEvent } from 'react';
import {
  AMBIENT, BAND_TR, DAYLIGHTS, DAYLIGHT_TR, LIGHT_RADII, bestSpeed, feetBetween, hpBand, movementLeft, tokenLight,
  REGIONS, REGION_TR,
  type Daylight, type DmView, type HpBand, type LightSource, type Monster, type Region, type Scale, type Token,
} from '@masa/shared';
import { fileUrl, uploadFile } from './api';
import { FileStamp } from './FileStamp';
import { Terrain } from './Terrain';
import type { Send } from './useTable';

export interface Pawn {
  id: string;
  label: string;
  kind: Token['kind'];
  x: number;
  y: number;
  band: HpBand | null;
  movable: boolean;
  hidden: boolean;
  /** Saldırı seçiliyken: hedef menzilde mi ('in'), dışında mı ('out'). */
  aim?: 'in' | 'out' | null;
}
/** Sırası gelenin yürüme hakkı: halka olarak çizilir. `enforce` açıksa dışına bırakılan jeton yerine döner. */
export interface Walk { pawnId: string; left: number; enforce: boolean }

const clamp = (n: number): number => Math.max(0, Math.min(1, n));
const round = (n: number): number => Math.round(n * 1000) / 1000;
/** "Goblin 2" → "G2": jetonun üstüne sığan kısa ad. */
const short = (label: string): string => `${[...label.trim()][0] ?? '?'}${label.match(/(\d+)\s*$/)?.[1] ?? ''}`;
const KEY_STEP: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

interface SurfaceProps {
  mapId: string | null;
  /** Yüklenmiş harita yoksa çizilecek arazi ve tohumu. */
  terrain?: Region | null;
  seed?: number;
  scale: Scale;
  pawns: Pawn[];
  walk?: Walk | null;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  /** Boş zemine tıklanınca: tıklanan nokta, alana oranla. */
  onGround?: (x: number, y: number) => void;
  /** Harita resmi yüklenince gerçek oranı (boy / en). */
  onAspect?: (aspect: number) => void;
  /** Günün saati ve ışık kaynakları: karanlık, kaynakların çevresi hariç alanı örter. */
  daylight?: Daylight;
  lights?: LightSource[];
  /** DM önizlemesi: karanlık, alanın görülebileceği kadar hafif çizilir. */
  preview?: boolean;
  /** Seçili saldırının menzili: jetonun çevresinde halka olarak çizilir. */
  reach?: { pawnId: string; feet: number } | null;
}

/** Ortam karanlığı: ışık kaynaklarının etrafı açılır, ışığın ucu loşlaşır. */
function Dusk({ daylight, lights, scale, preview }: { daylight: Daylight; lights: LightSource[]; scale: Scale; preview: boolean }) {
  const id = useId().replace(/:/g, '');
  const { darkness, tint } = AMBIENT[daylight];
  if (darkness === 0) return null;
  const height = 100 * scale.aspect;
  const radius = (feet: number): number => (feet / scale.widthFt) * 100;
  return (
    <svg className="daylight" data-daylight={daylight} viewBox={`0 0 100 ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <filter id={`soft-${id}`} x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.4" /></filter>
        <mask id={`lit-${id}`} maskUnits="userSpaceOnUse" x="0" y="0" width="100" height={height}>
          <rect width="100" height={height} fill="#fff" />
          <g filter={`url(#soft-${id})`}>
            {lights.map((l, i) => <circle key={`dim${i}`} cx={l.x * 100} cy={l.y * height} r={radius(l.r * 2)} fill="#8c8c8c" />)}
            {lights.map((l, i) => <circle key={`bright${i}`} cx={l.x * 100} cy={l.y * height} r={radius(l.r)} fill="#000" />)}
          </g>
        </mask>
      </defs>
      <rect width="100" height={height} fill={tint} opacity={preview ? Math.min(darkness, 0.55) : darkness} mask={`url(#lit-${id})`} />
    </svg>
  );
}

/** Savaş alanı ve üstündeki jetonlar. Kare yoktur; yol, alanın ölçeğine göre ft olarak ölçülür. */
export function BoardSurface({ mapId, terrain, seed = 1, scale, pawns, walk, selectedId, onSelect, onMove, onGround, onAspect, daylight = 'day', lights = [], preview = false, reach: ring = null }: SurfaceProps) {
  const surface = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<{ id: string; x: number; y: number; moved: boolean } | null>(null);

  const at = (event: { clientX: number; clientY: number }): { x: number; y: number } => {
    const box = surface.current!.getBoundingClientRect();
    return { x: round(clamp((event.clientX - box.left) / (box.width || 1))), y: round(clamp((event.clientY - box.top) / (box.height || 1))) };
  };
  const walker = walk ? pawns.find((p) => p.id === walk.pawnId) : undefined;
  const ringPawn = ring ? pawns.find((p) => p.id === ring.pawnId) : undefined;
  const reach = (p: Pawn): number | null => (walk && walker && p.id === walker.id ? walk.left : null);
  const tooFar = (p: Pawn, to: { x: number; y: number }): boolean => {
    const left = reach(p);
    return !!walk?.enforce && left !== null && feetBetween(p, to, scale) > left + 0.5;
  };

  const down = (p: Pawn) => (event: PointerEvent<HTMLButtonElement>) => {
    onSelect?.(p.id);
    if (!p.movable) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setDrag({ id: p.id, x: p.x, y: p.y, moved: false });
  };
  const move = (event: PointerEvent) => { if (drag) setDrag({ id: drag.id, ...at(event), moved: true }); };
  const up = (p: Pawn) => () => {
    if (drag?.moved && !tooFar(p, drag)) onMove(drag.id, drag.x, drag.y);
    setDrag(null);
  };
  const key = (p: Pawn) => (event: KeyboardEvent) => {
    const step = KEY_STEP[event.key];
    if (!step || !p.movable) return;
    event.preventDefault();
    const size = event.shiftKey ? 0.005 : 0.02;
    const to = { x: round(clamp(p.x + step[0] * size)), y: round(clamp(p.y + step[1] * size)) };
    if (!tooFar(p, to)) onMove(p.id, to.x, to.y);
  };
  const ground = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget || !onGround) return;
    const to = at(event);
    onGround(to.x, to.y);
  };

  const dragged = drag?.moved ? pawns.find((p) => p.id === drag.id) : undefined;
  const feet = dragged && drag ? feetBetween(dragged, drag, scale) : 0;
  const over = dragged && drag ? tooFar(dragged, drag) : false;

  return (
    <div className={`board${mapId ? '' : ' blank'}${onGround ? ' clickable' : ''}`} ref={surface} onClick={ground}
      data-terrain={mapId ? undefined : terrain ?? undefined}
      style={mapId ? undefined : { aspectRatio: `1 / ${scale.aspect}` }}>
      {mapId
        ? <img className="board-map" src={fileUrl(mapId)} alt="Savaş alanı" draggable={false}
            onLoad={(e) => onAspect?.(e.currentTarget.naturalHeight / (e.currentTarget.naturalWidth || 1))} />
        : terrain
          ? <Terrain terrain={terrain} seed={seed} aspect={scale.aspect} />
          : <p className="board-empty">Boş alan. Arazi seçilince ya da karşılaşma kurulunca burada çizilir.</p>}

      <Dusk daylight={daylight} lights={lights} scale={scale} preview={preview} />
      {ring && ringPawn && (
        <div className="reach-ring" data-testid="reach-ring"
          style={{ left: `${ringPawn.x * 100}%`, top: `${ringPawn.y * 100}%`, width: `${(2 * ring.feet / scale.widthFt) * 100}%` }} />
      )}
      {walk && walker && walk.left > 0 && (
        <div className="walk-ring" data-testid="walk-ring"
          style={{ left: `${walker.x * 100}%`, top: `${walker.y * 100}%`, width: `${(2 * walk.left / scale.widthFt) * 100}%` }} />
      )}
      {dragged && drag && (
        <>
          <svg className={over ? 'measure over' : 'measure'} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <line x1={dragged.x * 100} y1={dragged.y * 100} x2={drag.x * 100} y2={drag.y * 100} />
          </svg>
          <output className={over ? 'measure-label over' : 'measure-label'} style={{ left: `${drag.x * 100}%`, top: `${drag.y * 100}%` }}>
            {Math.round(feet)} fit{over ? ' — çok uzak' : ''}
          </output>
        </>
      )}

      {pawns.map((p) => {
        const pos = drag?.id === p.id ? drag : p;
        const state = [
          p.hidden ? 'oyuncudan gizli' : '', p.band ? BAND_TR[p.band] : '',
          p.aim === 'in' ? 'menzilde' : p.aim === 'out' ? 'menzil dışında' : '',
        ].filter(Boolean).join(', ');
        return (
          <button key={p.id} type="button"
            className={['pawn', `kind-${p.kind}`, p.band ? `band-${p.band}` : '', p.hidden ? 'hidden' : '', p.movable ? 'movable' : '',
              p.aim ? `aim-${p.aim}` : '', drag?.id === p.id ? 'dragging' : '', selectedId === p.id ? 'selected' : ''].filter(Boolean).join(' ')}
            style={{ left: `${pos.x * 100}%`, top: `${pos.y * 100}%` }}
            aria-label={`${p.label} jetonu${state ? ` (${state})` : ''}`} aria-pressed={selectedId !== undefined ? selectedId === p.id : undefined}
            onPointerDown={down(p)} onPointerMove={move} onPointerUp={up(p)} onPointerCancel={() => setDrag(null)} onKeyDown={key(p)}>
            <span className="pawn-disc">{short(p.label)}</span>
            <span className="pawn-name">{p.label}</span>
          </button>
        );
      })}
    </div>
  );
}

export const moveIntent = (send: Send) => (tokenId: string, x: number, y: number) => send({ type: 'board.moveToken', tokenId, x, y });

export function DmBoard({ view, monsters, send }: { view: DmView; monsters?: Map<string, Monster>; send: Send }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [marker, setMarker] = useState('');
  const [rename, setRename] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { board, encounter } = view;
  const selected = board.tokens.find((t) => t.id === selectedId) ?? null;

  const bandOf = (t: Token): HpBand | null => {
    if (t.kind === 'character') return view.character ? hpBand(view.character.hp, view.character.maxHp) : null;
    const c = encounter?.combatants.find((x) => x.id === t.combatantId);
    return c?.kind === 'monster' ? hpBand(c.hp, c.maxHp) : null;
  };
  const pawns: Pawn[] = board.tokens.map((t) => ({ ...t, band: bandOf(t), movable: true }));
  const lights: LightSource[] = board.tokens
    .map((t) => ({ x: t.x, y: t.y, r: tokenLight(t, view.character) }))
    .filter((l) => l.r > 0);

  // Sırası gelenin yürüme halkası. DM için yol göstericidir; jetonu dilediği yere bırakabilir.
  const turn = encounter?.status === 'active' ? encounter.combatants[encounter.turnIndex] : undefined;
  let walk: Walk | null = null;
  if (turn) {
    const token = board.tokens.find((t) => (turn.kind === 'character' ? t.kind === 'character' : t.combatantId === turn.id));
    const speed = turn.kind === 'character' ? (view.character?.speed ?? 0) : bestSpeed(monsters?.get(turn.monsterId)?.speed ?? '');
    if (token) walk = { pawnId: token.id, left: movementLeft(speed, turn), enforce: false };
  }

  const upload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true);
    setError(null);
    uploadFile('map', file)
      .then(({ id }) => send({ type: 'board.setMap', mapId: id }))
      .catch((e: Error) => setError(e.message))
      .finally(() => setBusy(false));
  };
  const addMarker = (event: FormEvent) => {
    event.preventDefault();
    send({ type: 'board.addMarker', label: marker });
    setMarker('');
  };
  const select = (id: string) => {
    setSelectedId(id);
    setRename(board.tokens.find((t) => t.id === id)?.label ?? '');
  };
  const onAspect = (aspect: number) => {
    if (Number.isFinite(aspect) && Math.abs(aspect - board.aspect) > 0.01) send({ type: 'board.setScale', aspect });
  };

  return (
    <section aria-label="Savaş alanı" className="board-panel">
      <h2>Savaş alanı</h2>
      <label className="switch board-visible">
        <input type="checkbox" checked={board.visible} onChange={(e) => send({ type: 'board.show', visible: e.target.checked })} /> Oyuncuya açık
      </label>
      <details className="tool-drawer">
        <summary>Alan ayarları <small>{board.terrain ? REGION_TR[board.terrain] : 'Boş'} · {DAYLIGHT_TR[board.daylight]} · {board.widthFt} fit</small></summary>
      <div className="board-tools">
        <label>Arazi{' '}
          <select value={board.terrain ?? ''} onChange={(e) => send({ type: 'board.setTerrain', terrain: (e.target.value || null) as Region | null })}>
            <option value="">Boş</option>
            {REGIONS.map((r) => <option key={r} value={r}>{REGION_TR[r]}</option>)}
          </select>
        </label>
        {board.terrain && !board.mapId && (
          <button type="button" onClick={() => send({ type: 'board.setTerrain', terrain: board.terrain })}>Alanı yeniden çiz</button>
        )}
        <label className="file-btn">{busy ? 'Yükleniyor…' : 'Kendi savaş haritamı yükle'}
          <input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy} onChange={upload} />
        </label>
        {board.mapId && <button type="button" onClick={() => send({ type: 'board.setMap', mapId: null })}>Yüklenen haritayı kaldır</button>}
        <button type="button" onClick={() => send({ type: 'board.placeCombatants' })}>Savaşçıları diz</button>
        <label>Alanın eni (fit){' '}
          <input type="number" min={20} max={2000} step={10} key={board.widthFt} defaultValue={board.widthFt}
            onBlur={(e) => { const v = Number(e.target.value); if (v && v !== board.widthFt) send({ type: 'board.setScale', widthFt: v }); }} />
        </label>
        <label>Günün saati{' '}
          <select value={board.daylight} onChange={(e) => send({ type: 'board.setDaylight', daylight: e.target.value as Daylight })}>
            {DAYLIGHTS.map((d) => <option key={d} value={d}>{DAYLIGHT_TR[d]}</option>)}
          </select>
        </label>
      </div>
      <form className="board-tools" onSubmit={addMarker}>
        <label>İşaret adı <input value={marker} onChange={(e) => setMarker(e.target.value)} maxLength={24} placeholder="Tuzak, kapı, sandık…" required /></label>
        <button>İşaret koy</button>
      </form>
      </details>
      {error && <p role="alert" className="error">{error}</p>}
      {board.mapId && <FileStamp id={board.mapId} />}
      <p className="hint">{board.visible ? 'Oyuncu alanı ve gizlemediğin jetonları görüyor.' : 'Oyuncu şu an alanı görmüyor.'}</p>

      <BoardSurface mapId={board.mapId} terrain={board.terrain} seed={board.seed} scale={board} pawns={pawns} walk={walk} selectedId={selectedId}
        daylight={board.daylight} lights={lights} preview
        onSelect={select} onMove={moveIntent(send)} onAspect={onAspect} />

      {selected && (
        <fieldset className="board-selected">
          <legend>Seçili jeton: {selected.label}</legend>
          <label>Etiket <input value={rename} onChange={(e) => setRename(e.target.value)} maxLength={24} /></label>
          <button type="button" disabled={!rename.trim() || rename === selected.label}
            onClick={() => send({ type: 'board.patchToken', tokenId: selected.id, label: rename })}>Etiketi değiştir</button>
          <label>Jetonun ışığı{' '}
            <select value={selected.light ?? 0}
              onChange={(e) => send({ type: 'board.patchToken', tokenId: selected.id, light: Number(e.target.value) })}>
              {LIGHT_RADII.map((r) => <option key={r} value={r}>{r === 0 ? 'Işık vermez' : `${r} fit`}</option>)}
            </select>
          </label>
          <label className="switch">
            <input type="checkbox" checked={selected.hidden}
              onChange={(e) => send({ type: 'board.patchToken', tokenId: selected.id, hidden: e.target.checked })} /> Oyuncudan gizle
          </label>
          <button type="button" onClick={() => { send({ type: 'board.removeToken', tokenId: selected.id }); setSelectedId(null); }}>Jetonu kaldır</button>
          {selected.combatantId && <p className="hint">Oyuncu bu jetonda savaş listesindeki adı görür; buraya yazdığın etiket yalnızca sende kalır.</p>}
        </fieldset>
      )}
    </section>
  );
}
