import {
  DARK_PLACES, DIFFICULTIES, GenerateError, REGIONS, abilityMod, displayName, generateEncounter, sortInitiative,
  type Encounter, type Monster, type MonsterCombatant, type TableState,
} from '@masa/shared';
import { character, fail, publicName, roll, say, type Raw, type Work } from './context';
import { dropTokensFor, placeCombatants, rearrange } from './board';
import { int, oneOf } from './validate';
import { newSeed } from './world';

const MAX_COMBATANTS = 20;

const emptyDraft = (w: Work): Encounter =>
  ({ id: w.ctx.newId(), status: 'draft', round: 0, turnIndex: 0, combatants: [] });

function nextNumber(e: Encounter, monsterId: string): number {
  const used = e.combatants
    .filter((c): c is MonsterCombatant => c.kind === 'monster' && c.monsterId === monsterId)
    .map((c) => Number(c.name.match(/ (\d+)$/)?.[1] ?? 0));
  return Math.max(0, ...used) + 1;
}

/** Sırayı inisiyatife göre yeniden dizer; sıradaki katılımcı aynı kalır. */
export function resort(e: Encounter, s: TableState): void {
  const currentId = e.combatants[e.turnIndex]?.id;
  const heroDex = abilityMod(s.character?.abilities.dex ?? 10);
  e.combatants = sortInitiative(
    e.combatants.map((c) => ({ c, initiative: c.initiative ?? 0, dexMod: c.kind === 'monster' ? c.dexMod : heroDex })),
  ).map((x) => x.c);
  e.turnIndex = Math.max(0, e.combatants.findIndex((c) => c.id === currentId));
}

export function turnLabel(w: Work, e: Encounter): string {
  const c = e.combatants[e.turnIndex];
  const name = !c ? '—' : c.kind === 'monster' ? publicName(c) : (w.s.character?.name ?? 'Karakter');
  return `${e.round}. raunt — sıra: ${name}`;
}

function spawn(w: Work, e: Encounter, def: Monster, hpMode: 'average' | 'rolled'): void {
  if (e.combatants.length >= MAX_COMBATANTS) fail(`Bir karşılaşmada en fazla ${MAX_COMBATANTS} katılımcı olabilir`);
  const hp = hpMode === 'rolled' ? Math.max(1, roll(w, def.hitDice).total) : def.hp;
  const dexMod = abilityMod(def.abilities.dex);
  e.combatants.push({
    id: w.ctx.newId(), kind: 'monster', monsterId: def.id,
    name: `${displayName(def.name)} ${nextNumber(e, def.id)}`,
    ac: def.ac, hp, maxHp: hp, tempHp: 0, dexMod,
    initiative: e.status === 'active' ? w.ctx.rng(20) + dexMod : null,
    // Tanıma zarı açıksa yaratık bilinmeyen girer.
    conditions: [], revealName: !w.s.identify, revealHp: false,
    legendaryLeft: def.legendaryCount > 0 ? def.legendaryCount : null,
    moved: 0, dashed: false,
  });
}

export function addMonster(w: Work, i: Raw): void {
  const def = w.ctx.monsters.get(String(i.monsterId)) ?? fail('Canavar bulunamadı');
  const count = int(i.count, 1, 10, 'Adet');
  const hpMode = oneOf(i.hpMode, ['average', 'rolled'] as const, 'Can puanı kipi');
  const e = (w.s.encounter ??= emptyDraft(w));
  for (let n = 0; n < count; n += 1) spawn(w, e, def, hpMode);
  if (e.status === 'active') {
    resort(e, w.s);
    say(w, 'manual', `Savaşa ${count} yeni yaratık katıldı`);
  }
}

export function removeCombatant(w: Work, i: Raw): void {
  const e = w.s.encounter ?? fail('Karşılaşma yok');
  const index = e.combatants.findIndex((c) => c.id === i.combatantId);
  if (index < 0) fail('Katılımcı bulunamadı');
  if (e.combatants[index]!.kind === 'character') fail('Karakter karşılaşmadan çıkarılamaz');
  dropTokensFor(w, [e.combatants[index]!.id]);
  e.combatants.splice(index, 1);
  if (index < e.turnIndex) e.turnIndex -= 1;
  if (e.turnIndex >= e.combatants.length) e.turnIndex = 0;
}

export function generate(w: Work, i: Raw): void {
  if (w.s.encounter && w.s.encounter.status !== 'draft') fail('Savaş sürerken yeni karşılaşma üretilemez');
  const input = {
    region: oneOf(i.region, REGIONS, 'Bölge'),
    level: int(i.level, 1, 20, 'Seviye'),
    difficulty: oneOf(i.difficulty, DIFFICULTIES, 'Zorluk'),
  };
  let ids: string[];
  try {
    ids = generateEncounter(input, [...w.ctx.monsters.values()], w.ctx.rng);
  } catch (e) {
    if (e instanceof GenerateError) fail(e.message);
    throw e;
  }
  if (w.s.encounter) dropTokensFor(w, w.s.encounter.combatants.map((c) => c.id));
  const e = emptyDraft(w);
  for (const id of ids) spawn(w, e, w.ctx.monsters.get(id)!, 'average');
  w.s.encounter = e;
  // Karşılaşma hangi bölgede kurulduysa savaş alanı da o arazide çizilir.
  w.s.board.terrain = input.region;
  w.s.board.seed = newSeed(w);
  if (DARK_PLACES.includes(input.region)) w.s.board.daylight = 'dark';
  rearrange(w);
}

export function start(w: Work): void {
  const e = w.s.encounter;
  if (!e || e.status !== 'draft' || e.combatants.length === 0) fail('Başlatılacak bir taslak yok');
  character(w);
  e.combatants.push({ id: w.ctx.newId(), kind: 'character', initiative: null, conditions: [], moved: 0, dashed: false });
  // Zar atılmaz: oyuncu kendi inisiyatif zarını atar, DM canavarlarınkini belirler, sıra sonra kurulur.
  for (const c of e.combatants) c.initiative = null;
  e.status = w.s.theater ? 'active' : 'initiative';
  e.round = w.s.theater ? 1 : 0;
  e.turnIndex = 0;
  if (w.s.theater) {
    // Hayali savaşta sıra ve harita yoktur: savaş hemen başlar, yalnızca DM yönetir.
    say(w, 'turn', 'Hayali savaş başladı; DM yönetiyor');
    return;
  }
  // Savaş, savaş alanında oynanır: herkes jetonuyla dizilir ve alan oyuncuya açılır.
  // Alanın arazisi seçilmemişse karakterin ana haritadaki yerinden alınır.
  if (!w.s.board.terrain && !w.s.board.mapId && w.s.world.region) {
    w.s.board.terrain = w.s.world.region;
    w.s.board.seed = newSeed(w);
  }
  placeCombatants(w);
  for (const t of w.s.board.tokens) if (t.kind === 'character') t.hidden = false;
  w.s.board.visible = true;
  say(w, 'turn', 'Savaş başladı! İnisiyatif zarları bekleniyor');
}

export function end(w: Work): void {
  const e = w.s.encounter ?? fail('Karşılaşma yok');
  dropTokensFor(w, e.combatants.map((c) => c.id));
  w.s.encounter = null;
  if (e.status !== 'draft') say(w, 'turn', 'Savaş bitti');
}
