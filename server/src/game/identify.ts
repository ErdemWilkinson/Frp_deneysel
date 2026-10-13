import { SKILLS, skillBonus, resolveSave, type MonsterCombatant, type SkillKey } from '@masa/shared';
import { character, fail, say, type Raw, type Work } from './context';
import { placeCombatants } from './board';

/** Yaratığın türüne göre hangi bilgi becerisiyle tanınacağı. */
const SKILL_BY_TYPE: Record<string, SkillKey> = {
  beast: 'nature', plant: 'nature', monstrosity: 'nature', ooze: 'nature',
  aberration: 'arcana', construct: 'arcana', elemental: 'arcana', fey: 'arcana', dragon: 'arcana',
  undead: 'religion', fiend: 'religion', celestial: 'religion',
  giant: 'history', humanoid: 'history',
};

/** Varsayılan tanıma zorluğu: yaratığın zorluk derecesine göre 10 ile 20 arası. */
export const defaultIdentifyDc = (cr: number): number => Math.min(20, Math.max(10, 10 + Math.floor(cr / 2)));

export function setIdentify(w: Work, i: Raw): void {
  if (typeof i.identify !== 'boolean') fail('Tanıma kipi geçersiz');
  w.s.identify = i.identify;
  // Açıkken yeni gelen yaratıklar bilinmeyen olarak girer; savaştakilere dokunulmaz, onları DM tek tek açar ya da gizler.
  say(w, 'manual', i.identify ? 'Yaratıklar bilinmeyen olarak girecek; oyuncu zarla tanıyacak' : 'Yaratıklar adıyla görünecek');
}

/**
 * Oyuncu, bilinmeyen bir yaratığı bilgi zarıyla tanımaya çalışır. Yeterliyse o türün tüm yaratıkları tanınır.
 * Her tür için tek deneme vardır; DM isterse yeni deneme hakkı verir.
 */
export function identify(w: Work, i: Raw): void {
  if (!w.s.identify) fail('Yaratıkları tanıma zarı kapalı');
  const hero = character(w);
  const e = w.s.encounter;
  if (!e || e.status === 'draft') fail('Henüz savaş başlamadı');
  const target = e.combatants.find((c): c is MonsterCombatant => c.kind === 'monster' && c.id === i.targetId) ?? fail('Hedef bulunamadı');
  if (target.revealName) fail('Bu yaratık zaten tanınıyor');
  if (target.identifyTried) fail('Bu yaratığı tanımayı zaten denedin');
  const def = w.ctx.monsters.get(target.monsterId);
  const key = SKILL_BY_TYPE[def?.type ?? ''] ?? 'nature';
  const dc = target.identifyDc ?? defaultIdentifyDc(def?.cr ?? 1);
  const r = resolveSave(skillBonus(hero, key), dc, 'normal', w.ctx.rng);
  const skill = SKILLS.find((s) => s.key === key)!.tr;
  const kin = e.combatants.filter((c): c is MonsterCombatant => c.kind === 'monster' && c.monsterId === target.monsterId);
  for (const c of kin) c.identifyTried = true;
  if (r.success) {
    for (const c of kin) c.revealName = true;
    say(w, 'roll', `${hero.name} ${skill} zarı attı: ${r.total} — yaratığı tanıdı: ${target.name.replace(/ \d+$/, '')}`);
  } else {
    say(w, 'roll', `${hero.name} ${skill} zarı attı: ${r.total} — yaratığı tanıyamadı`);
  }
}

/**
 * Hayali savaş: harita ve sıra yoktur, savaşı yalnızca DM yönetir. Savaş kurulmadan da açılır;
 * sürerken açılırsa savaş sıra beklemeden başlar, kapanırsa herkes haritaya dizilir ve inisiyatif yeniden atılır.
 */
export function setTheater(w: Work, i: Raw): void {
  if (typeof i.theater !== 'boolean') fail('Savaş kipi geçersiz');
  w.s.theater = i.theater;
  const e = w.s.encounter;
  if (e && e.status !== 'draft') {
    if (i.theater) {
      e.status = 'active';
      e.round = Math.max(1, e.round);
      e.turnIndex = 0;
    } else {
      e.status = 'initiative';
      e.round = 0;
      e.turnIndex = 0;
      for (const c of e.combatants) c.initiative = null;
      placeCombatants(w);
      for (const t of w.s.board.tokens) if (t.kind === 'character') t.hidden = false;
      w.s.board.visible = true;
    }
  }
  say(w, 'turn', i.theater ? 'Savaş hayali olarak sürüyor; DM yönetiyor' : 'Savaş yeniden haritada sürüyor');
}
