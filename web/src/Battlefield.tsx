import { useState, type CSSProperties, type KeyboardEvent, type PointerEvent as ReactPointerEvent } from 'react';
import {
  ABILITIES, ABILITY_TR, BAND_TR, CONDITION_TR, DAYLIGHT_TR, REACH_SLACK, carriedLight, feetBetween, nextLevelXp, type LightSource, type PlayerView,
  type RollMode,
} from '@masa/shared';
import { BoardSurface, moveIntent, type Pawn, type Walk } from './Board';
import { HpBar, ModeSelect, TurnRail } from './controls';
import type { Send } from './useTable';
import { PlayerWorld } from './WorldMap';
import { BattleFx } from './BattleFx';
import { useStored } from './storage';
import { QuickBag } from './Inventory';

const GLANCE_MIN = 7;
const GLANCE_MAX = 26;
const GLANCE_DEFAULT = 13;
/** Bu genişliğin altında özet küçük hâle geçer. */
const GLANCE_WIDE = 11;

/** Oyuncunun savaş ekranı: alan, sıra şeridi ve eylem çubuğu. Sırası gelince yürür, saldırıyı seçip hedefe tıklar. */
export function Battlefield({ view, send }: { view: PlayerView; send: Send }) {
  const [armed, setArmed] = useState<number | null>(null);
  const [mode, setMode] = useState<RollMode>('normal');
  const [note, setNote] = useState<string | null>(null);
  // Oyuncu d20'sini kendisi attıysa buraya yazar; boşsa sunucu atar. Hasar zarını her durumda sunucu atar.
  const [own20, setOwn20] = useState('');
  // Karakter özetinin genişliği (rem): ayırıcı sürüklenerek ayarlanır, tarayıcıda hatırlanır. Dar olunca yalnızca ad ve can görünür.
  const [glanceWidth, setGlanceWidth] = useStored<number>('masa.glance.width', GLANCE_DEFAULT,
    (v) => typeof v === 'number' && v >= GLANCE_MIN && v <= GLANCE_MAX);
  const small = glanceWidth < GLANCE_WIDE;
  const dragGlance = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    const x0 = event.clientX;
    const base = glanceWidth;
    const move = (e: PointerEvent) => setGlanceWidth(Math.max(GLANCE_MIN, Math.min(GLANCE_MAX, base + (e.clientX - x0) / rem)));
    const stop = () => {
      window.removeEventListener('pointermove', move);
      document.body.classList.remove('resizing');
    };
    document.body.classList.add('resizing');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
  };
  const keyGlance = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') setGlanceWidth(Math.max(GLANCE_MIN, glanceWidth - 1));
    else if (event.key === 'ArrowRight') setGlanceWidth(Math.min(GLANCE_MAX, glanceWidth + 1));
    else if (event.key === 'Enter') setGlanceWidth(GLANCE_DEFAULT);
    else return;
    event.preventDefault();
  };
  const { board, encounter, character } = view;
  const me = encounter?.combatants.find((c) => c.kind === 'character') ?? null;
  const myTurn = !!me?.current;
  const turnOf = encounter?.combatants.find((c) => c.current)?.name;
  const standing = !!character && character.hp > 0;
  const attack = armed !== null ? character?.attacks[armed] : undefined;
  const own = board?.tokens.find((t) => t.mine);
  const phase = encounter?.phase ?? null;
  const rolling = phase === 'initiative';
  const theater = !!encounter?.theater;
  const mapMode: 'battle' | 'world' | 'none' = encounter
    ? (board ? 'battle' : view.world ? 'world' : 'none')
    : (view.world ? 'world' : board ? 'battle' : 'none');
  const dexMod = character ? Math.floor((character.abilities.dex - 10) / 2) : 0;

  const pawns: Pawn[] = (board?.tokens ?? []).map((t) => {
    const foe = !!attack && t.targetId !== null && t.band !== 'down';
    return {
      id: t.id, label: t.label, kind: t.kind, x: t.x, y: t.y, band: t.band, hidden: false,
      // Savaşta jeton yalnızca kendi sıranda oynar; savaş dışında serbesttir.
      movable: t.mine && (!encounter || (myTurn && standing && !rolling)) && armed === null,
      // Kendi jetonu alanda değilse mesafe ölçülemez; menzile DM karar verir.
      aim: foe ? (!own || feetBetween(own, t, board!) <= attack!.range + REACH_SLACK ? 'in' : 'out') : null,
    };
  });
  const walk: Walk | null = own && me && myTurn && !rolling && armed === null ? { pawnId: own.id, left: me.moveLeft ?? 0, enforce: true } : null;

  const pick = (id: string) => {
    if (armed === null) return;
    const pawn = pawns.find((p) => p.id === id);
    const targetId = board?.tokens.find((t) => t.id === id)?.targetId;
    if (!pawn?.aim || !targetId) return;
    if (pawn.aim === 'out') { setNote(`${pawn.label} menzil dışında. Önce yaklaş.`); return; }
    const d20 = Number(own20);
    send({ type: 'character.attack', attackIndex: armed, targetId, mode, ...(own20 !== '' && d20 >= 1 && d20 <= 20 ? { d20 } : {}) });
    setArmed(null);
    setOwn20('');
    setNote(null);
  };
  const ground = (x: number, y: number) => {
    if (!own || armed !== null) return;
    if (encounter && !(myTurn && standing && !rolling)) return;
    if (walk && feetBetween(own, { x, y }, board!) > walk.left + 0.5) { setNote('Orası yürüme menzilinin dışında.'); return; }
    setNote(null);
    send({ type: 'board.moveToken', tokenId: own.id, x, y });
  };
  const unknownFoes = (encounter?.combatants ?? []).filter((c) => c.kind === 'monster' && c.identifiable);
  const lights: LightSource[] = (board?.tokens ?? []).filter((t) => (t.light ?? 0) > 0).map((t) => ({ x: t.x, y: t.y, r: t.light ?? 0 }));
  const arm = (index: number) => { setArmed(armed === index ? null : index); setNote(null); };

  return (
    <section aria-label="Savaş alanı" className={`battlefield${myTurn && !rolling ? ' my-turn' : ''}`}>
      <BattleFx phase={phase} myTurn={myTurn && !rolling} hp={character?.hp ?? null} />
      <div className="field-layout" style={{ '--glance': `${glanceWidth}rem` } as CSSProperties}>
      {character && (
        <aside className={`glance${small ? ' small' : ''}`} aria-label="Karakter özeti">
          <strong className="glance-name">{character.name}</strong>
          {!small && (
            <span className="glance-sub">
              {character.level}. seviye{character.profile?.className ? ` · ${character.profile.className}` : ''}
            </span>
          )}
          <HpBar hp={character.hp} max={character.maxHp} band={null} />
          <span className="glance-hp">
            {small ? `${character.hp}/${character.maxHp}` : `${character.hp}/${character.maxHp} can puanı`}{character.tempHp > 0 ? ` (+${character.tempHp})` : ''}
          </span>
          {!small && <dl className="glance-stats">
            <div><dt>Zırh sınıfı</dt><dd>{character.ac}</dd></div>
            <div><dt>Hız</dt><dd>{character.speed} fit</dd></div>
            {ABILITIES.map((a) => {
              const mod = Math.floor((character.abilities[a] - 10) / 2);
              return (
                <div key={a}>
                  <dt>{ABILITY_TR[a]}</dt>
                  <dd>{character.abilities[a]} <small>({mod >= 0 ? '+' : ''}{mod})</small></dd>
                </div>
              );
            })}
          </dl>}
          {!small && me && me.conditions.length > 0 && (
            <ul className="glance-conditions" aria-label="Durumlar">
              {me.conditions.map((c) => <li key={c}>{CONDITION_TR[c]}</li>)}
            </ul>
          )}
          {!small && (character.profile?.experience ?? 0) > 0 && (
            <span className="steps">
              Tecrübe: {character.profile!.experience}{nextLevelXp(character.level) ? ` / ${nextLevelXp(character.level)}` : ''}
            </span>
          )}
          {!small && carriedLight(character) > 0 && <span className="steps">Işık: {carriedLight(character)} fit</span>}
          {!small && me && !theater && <span className="steps">Yürüme: {myTurn ? `${Math.round(me.moveLeft ?? 0)} fit kaldı` : `${character.speed} fit`}</span>}
          {character.hp === 0 && !character.dead && (
            <button type="button" onClick={() => send({ type: 'character.deathSave' })}>Ölüm kurtarma zarı at</button>
          )}
          {!small && <QuickBag character={character} send={send} />}
        </aside>
      )}
      {character && (
        <div className="split-handle" role="separator" tabIndex={0} aria-orientation="vertical"
          aria-label="Karakter özeti ile harita arasındaki ayırıcı" aria-valuenow={Math.round(glanceWidth)}
          aria-valuemin={GLANCE_MIN} aria-valuemax={GLANCE_MAX}
          title="Sürükle ya da ok tuşlarıyla genişlet; çift tıkla sıfırla"
          onPointerDown={dragGlance} onKeyDown={keyGlance} onDoubleClick={() => setGlanceWidth(GLANCE_DEFAULT)} />
      )}
      <div className="field-main">
      {rolling && me && (
        <div className="initiative" role="group" aria-label="İnisiyatif">
          <h2>Savaş başladı!</h2>
          {me.initiative === null ? (
            <>
              <p>Sıranın belirlenmesi için çeviklik zarını at. DM herkesin zarını görünce sırayı kurar.</p>
              <button type="button" className="btn-primary roll-big" onClick={() => send({ type: 'combat.rollInitiative', mode })}>
                İnisiyatif zarı at (Çeviklik {dexMod >= 0 ? '+' : ''}{dexMod})
              </button>
              <ModeSelect value={mode} onChange={setMode} />
            </>
          ) : (
            <p role="status">Zarın: <strong>{me.initiative}</strong>. DM sırayı belirliyor…</p>
          )}
        </div>
      )}
      {theater && (
        <div className="theater" role="status">
          <h2>Hayali savaş</h2>
          <p>DM savaşı yönetiyor. Zar atman gerekirse DM söyler.</p>
        </div>
      )}
      {encounter && !rolling && !theater && (
        <header className="battle-head">
          <h2>{encounter.round}. raunt</h2>
          <TurnRail items={encounter.combatants.map((c) => ({ id: c.id, name: c.name, current: c.current, down: c.band === 'down' }))} />
          <p className={myTurn ? 'turn mine' : 'turn'} role="status">{myTurn ? 'Sıra sende' : `Sıra: ${turnOf ?? '—'}`}</p>
        </header>
      )}

      {/* Oyuncunun tek haritası: savaş yokken ana harita, savaş başlayınca yerini savaş alanı alır. */}
      {!theater && <div key={mapMode} className="map-swap">
        {mapMode === 'battle' && board && (
          <BoardSurface mapId={board.mapId} terrain={board.terrain} seed={board.seed} scale={board} pawns={pawns} walk={walk} onSelect={pick} onMove={moveIntent(send)} onGround={ground}
            daylight={board.daylight} lights={lights} reach={own && attack ? { pawnId: own.id, feet: attack.range } : null} />
        )}
        {mapMode === 'battle' && board && board.daylight !== 'day' && (
          <p className="daylight-badge" role="status">{DAYLIGHT_TR[board.daylight]}</p>
        )}
        {mapMode === 'world' && <PlayerWorld view={view} />}
        {mapMode === 'none' && <p className="board-closed">DM henüz bir harita açmadı.</p>}
      </div>}

      {unknownFoes.length > 0 && !rolling && (
        <div className="identify" role="group" aria-label="Yaratıkları tanı">
          <span>Bilinmeyen yaratıklar:</span>
          {unknownFoes.map((c, i) => (
            <button key={c.id} type="button" onClick={() => send({ type: 'character.identify', targetId: c.id })}
              aria-label={`Yaratık ${i + 1} tanımayı dene`}>
              Yaratık {i + 1}: tanımayı dene
            </button>
          ))}
        </div>
      )}
      {note && <p role="alert" className="hint warn">{note}</p>}
      {attack && (
        <div className="own-d20" role="group" aria-label="Saldırı zarı">
          <p className="hint" role="status">{attack.name} seçili ({attack.range} fit). Menzildeki düşmana tıkla.</p>
          <label>d20 zarım <input type="number" min={1} max={20} value={own20} placeholder="boşsa otomatik"
            onChange={(e) => setOwn20(e.target.value)} /></label>
        </div>
      )}

      {character && (
        <div className="action-bar" role="group" aria-label="Eylemler">
          {encounter && !rolling && !theater && standing && (
            <div className="moves">
              {character.attacks.map((a, i) => (
                // eslint-disable-next-line react/no-array-index-key
                <button key={i} type="button" className="move" aria-pressed={armed === i} onClick={() => arm(i)}>
                  {a.name} <small>{a.bonus >= 0 ? '+' : ''}{a.bonus} · {a.range} fit</small>
                </button>
              ))}
              <button type="button" className="move" disabled={!myTurn} onClick={() => send({ type: 'combat.dash' })}>Koş <small>+{character.speed} fit</small></button>
              <ModeSelect value={mode} onChange={setMode} />
              <button type="button" className="btn-primary" disabled={!myTurn} onClick={() => { setArmed(null); send({ type: 'combat.nextTurn' }); }}>Sırayı bitir</button>
            </div>
          )}
        </div>
      )}
      </div>
      </div>
    </section>
  );
}
