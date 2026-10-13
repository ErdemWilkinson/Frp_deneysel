import { DAYLIGHTS, barrier, feetBetween, movementLeft, spread, type Token } from '@masa/shared';
import { fail, type Raw, type Work } from './context';
import { int, oneOf, text } from './validate';

const MAX_TOKENS = 40;
const FILE_ID = /^[\w-]{1,64}$/;

export function fileId(v: unknown, label: string): string | null {
  if (v === null) return null;
  return typeof v === 'string' && FILE_ID.test(v) ? v : fail(`${label} geçersiz`);
}

function unit(v: unknown, label: string): number {
  if (typeof v !== 'number' || !Number.isFinite(v)) fail(`${label} geçersiz`);
  return Math.min(1, Math.max(0, v));
}

function tokenOf(w: Work, id: unknown): Token {
  return w.s.board.tokens.find((t) => t.id === id) ?? fail('Jeton bulunamadı');
}

function push(w: Work, token: Omit<Token, 'id'>): void {
  if (w.s.board.tokens.length >= MAX_TOKENS) fail(`Haritada en fazla ${MAX_TOKENS} jeton olabilir`);
  w.s.board.tokens.push({ id: w.ctx.newId(), ...token });
}

export function setMap(w: Work, i: Raw): void {
  w.s.board.mapId = fileId(i.mapId, 'Harita');
  if (w.s.board.mapId === null) w.s.board.visible = false;
}

export function showBoard(w: Work, i: Raw): void {
  if (typeof i.visible !== 'boolean') fail('Görünürlük geçersiz');
  w.s.board.visible = i.visible;
}

/** Duvarlı alanlarda (zindan, kasaba, şehir) herkes açık yerlere dizilir: karakter ilk alana, yaratıklar en uzaktakilere. */
function arrangeInScene(w: Work): void {
  const { seed, aspect, terrain, mapId } = w.s.board;
  const bar = mapId ? null : barrier(terrain, seed, aspect);
  if (!bar || bar.areas.length === 0) return;
  const hero = w.s.board.tokens.find((t) => t.kind === 'character');
  if (hero) {
    const [at] = spread(bar.areas[0]!, 1, aspect);
    Object.assign(hero, at);
  }
  const monsters = w.s.board.tokens.filter((t) => t.kind === 'monster');
  const farRooms = bar.areas.length > 1 ? bar.areas.slice(1).reverse() : bar.areas;
  const used = Math.max(1, Math.min(farRooms.length, Math.ceil(monsters.length / 4)));
  for (let k = 0; k < used; k += 1) {
    const group = monsters.filter((_, i) => i % used === k);
    const spots = spread(farRooms[k]!, group.length, aspect);
    group.forEach((token, j) => Object.assign(token, spots[j]));
  }
}

/** Karakter ve savaştaki her canavar için, henüz jetonu yoksa haritaya bir jeton dizer. */
export function placeCombatants(w: Work): void {
  const tokens = w.s.board.tokens;
  if (w.s.character && !tokens.some((t) => t.kind === 'character')) {
    push(w, { label: w.s.character.name, kind: 'character', combatantId: null, x: 0.5, y: 0.88, hidden: false });
  }
  let n = tokens.filter((t) => t.kind === 'monster').length;
  for (const c of w.s.encounter?.combatants ?? []) {
    if (c.kind !== 'monster' || tokens.some((t) => t.combatantId === c.id)) continue;
    push(w, { label: c.name, kind: 'monster', combatantId: c.id, x: 0.08 + (n % 10) * 0.09, y: n % 20 < 10 ? 0.1 : 0.22, hidden: false });
    n += 1;
  }
  arrangeInScene(w);
}

/** Duvarlı alan yeniden çizildiğinde jetonlar yeni yerlerine dizilir. */
export function rearrange(w: Work): void {
  arrangeInScene(w);
}

export function addMarker(w: Work, i: Raw): void {
  push(w, { label: text(i.label, 24, 'Etiket'), kind: 'marker', combatantId: null, x: 0.5, y: 0.5, hidden: false });
}

export function moveToken(w: Work, i: Raw): void {
  const token = tokenOf(w, i.tokenId);
  if (w.role !== 'dm' && (token.kind !== 'character' || token.hidden || !w.s.board.visible)) {
    fail('Yalnızca kendi jetonunu oynatabilirsin');
  }
  const to = { x: unit(i.x, 'Konum'), y: unit(i.y, 'Konum') };
  if (w.role !== 'dm') stopAtWalls(w, token, to);
  walk(w, token, to);
  token.x = to.x;
  token.y = to.y;
}

/** Duvarlı alanda oyuncu duvarın içinden geçemez. Duvarın içinde kalmış bir jeton serbestçe çıkabilir. */
function stopAtWalls(w: Work, token: Token, to: { x: number; y: number }): void {
  const { terrain, mapId, seed, aspect } = w.s.board;
  const bar = mapId ? null : barrier(terrain, seed, aspect);
  if (!bar) return;
  if (!bar.stand(to)) fail('Orası geçilemez: duvar, su ya da başka bir engel var');
  if (bar.stand(token) && !bar.clear(token, to)) fail('Yolun üstünde duvar ya da engel var; kapıdan, köprüden veya açık yoldan git');
}

/** Savaşta yürüme: oyuncu yalnızca kendi sırasında ve kalan mesafesi kadar yürür. DM hakemdir, engellenmez. */
function walk(w: Work, token: Token, to: { x: number; y: number }): void {
  const e = w.s.encounter;
  if (!e || e.status !== 'active') return;
  const mover = e.combatants.find((c) => (token.kind === 'character' ? c.kind === 'character' : c.id === token.combatantId));
  if (!mover) return;
  const current = e.combatants[e.turnIndex]?.id === mover.id;
  const feet = feetBetween(token, to, w.s.board);
  if (w.role === 'dm') {
    // DM'in sırası gelen canavarı yürütmesi sayılır; karakteri ya da sırası gelmeyeni taşıması düzeltmedir.
    if (current && mover.kind === 'monster') mover.moved = Math.round((mover.moved + feet) * 10) / 10;
    return;
  }
  if (!current) fail('Sıra sende değil; sıran gelince yürüyebilirsin');
  const hero = w.s.character;
  if (!hero || hero.hp <= 0) fail('Karakter ayakta değil');
  const left = movementLeft(hero.speed, mover);
  if (feet > left + 0.5) fail(`O kadar uzağa yürüyemezsin: ${Math.round(feet)} fit gerekiyor, ${Math.round(left)} fit kaldı`);
  mover.moved = Math.round((mover.moved + feet) * 10) / 10;
}

export function setScale(w: Work, i: Raw): void {
  if (i.widthFt !== undefined) {
    if (typeof i.widthFt !== 'number' || !Number.isFinite(i.widthFt)) fail('Alan genişliği geçersiz');
    w.s.board.widthFt = Math.min(2000, Math.max(20, Math.round(i.widthFt)));
  }
  if (i.aspect !== undefined) {
    if (typeof i.aspect !== 'number' || !Number.isFinite(i.aspect)) fail('Alan oranı geçersiz');
    w.s.board.aspect = Math.min(4, Math.max(0.25, Math.round(i.aspect * 1000) / 1000));
  }
}


export function patchToken(w: Work, i: Raw): void {
  const token = tokenOf(w, i.tokenId);
  if (typeof i.hidden === 'boolean') token.hidden = i.hidden;
  if (i.label !== undefined) token.label = text(i.label, 24, 'Etiket');
  if (i.light !== undefined) token.light = int(i.light, 0, 120, 'Işık yarıçapı');
}

export function setDaylight(w: Work, i: Raw): void {
  w.s.board.daylight = oneOf(i.daylight, DAYLIGHTS, 'Günün saati');
}

export function removeToken(w: Work, i: Raw): void {
  const token = tokenOf(w, i.tokenId);
  w.s.board.tokens = w.s.board.tokens.filter((t) => t.id !== token.id);
}

export function setSheet(w: Work, i: Raw): void {
  w.s.sheetId = fileId(i.fileId, 'Dosya');
}

/** Savaştan çıkan canavarların jetonlarını kaldırır. */
export function dropTokensFor(w: Work, combatantIds: string[]): void {
  w.s.board.tokens = w.s.board.tokens.filter((t) => t.combatantId === null || !combatantIds.includes(t.combatantId));
}
