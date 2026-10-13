import { DARK_PLACES, REGIONS, type Region } from '@masa/shared';
import { fileId, rearrange } from './board';
import { fail, type Raw, type Work } from './context';
import { oneOf } from './validate';

const unit = (v: unknown): number =>
  (typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fail('Konum geçersiz'));
const region = (v: unknown): Region | null => (v === null ? null : oneOf(v, REGIONS, 'Bölge'));

/** Savaş alanı her kurulduğunda yeni bir çizim tohumu alır. */
export function newSeed(w: Work): number {
  // Zar atılmaz: tohum oyunun zarlarını tüketmemeli. Yeni bir kimliğin özeti yeterince rastgeledir.
  let hash = 2166136261;
  for (const ch of w.ctx.newId()) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  return (hash >>> 0) % 1_000_000_000;
}

export function setWorldMap(w: Work, i: Raw): void {
  w.s.world.mapId = fileId(i.mapId, 'Harita');
  // Oyuncunun tek haritası ana haritadır; DM koyunca hemen görünür, isterse gizler.
  w.s.world.visible = w.s.world.mapId !== null;
}

export function showWorld(w: Work, i: Raw): void {
  if (typeof i.visible !== 'boolean') fail('Görünürlük geçersiz');
  w.s.world.visible = i.visible;
}

/** Karakterin ana haritadaki yeri. DM isterse o noktanın arazi türünü de birlikte bildirir. */
export function moveOnWorld(w: Work, i: Raw): void {
  w.s.world.x = unit(i.x);
  w.s.world.y = unit(i.y);
  if (i.region !== undefined) w.s.world.region = region(i.region);
}

export function setWorldRegion(w: Work, i: Raw): void {
  w.s.world.region = region(i.region);
}

export function setWorldAspect(w: Work, i: Raw): void {
  if (typeof i.aspect !== 'number' || !Number.isFinite(i.aspect)) fail('Harita oranı geçersiz');
  w.s.world.aspect = Math.min(4, Math.max(0.25, Math.round(i.aspect * 1000) / 1000));
}

/** Savaş alanının arazisi: yüklenmiş harita yoksa alan bu türe göre çizilir. Aynı türü yeniden seçmek yeni bir alan çizer. */
export function setTerrain(w: Work, i: Raw): void {
  w.s.board.terrain = region(i.terrain);
  w.s.board.seed = newSeed(w);
  // Zindan karanlıktır; DM isterse günün saatini sonra değiştirir. Jetonlar yeni odalara yerleşir.
  // Yeraltı mekânları karanlıktır; oradan başka araziye geçince karanlık kalkar. DM isterse saati sonra değiştirir.
  const dark = w.s.board.terrain !== null && DARK_PLACES.includes(w.s.board.terrain);
  if (dark) w.s.board.daylight = 'dark';
  else if (w.s.board.daylight === 'dark') w.s.board.daylight = 'day';
  rearrange(w);
}
