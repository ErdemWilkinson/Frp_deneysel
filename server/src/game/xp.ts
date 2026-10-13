import { blankProfile, levelForXp, type MonsterCombatant } from '@masa/shared';
import { publicName, say, type Work } from './context';

/**
 * Bir yaratık düşünce karakter onun tecrübe puanını kazanır; aynı yaratık için bir kez.
 * Seviye eşiği aşılırsa günlüğe yazılır, seviyeyi oyuncu kartından kendisi artırır.
 */
export function awardKill(w: Work, m: MonsterCombatant): void {
  if (m.xpAwarded) return;
  m.xpAwarded = true;
  const hero = w.s.character;
  const xp = w.ctx.monsters.get(m.monsterId)?.xp ?? 0;
  if (!hero || xp <= 0) return;
  const profile = hero.profile ?? blankProfile();
  const before = profile.experience;
  hero.profile = { ...profile, experience: before + xp };
  say(w, 'manual', `${hero.name}, ${publicName(m)} yaratığından ${xp} tecrübe puanı kazandı (toplam ${before + xp})`);
  const reachable = levelForXp(before + xp);
  if (reachable > hero.level && levelForXp(before) <= reachable) {
    say(w, 'manual', `${hero.name} ${reachable}. seviyeye ulaşabilir; karakter kartından seviyeyi artırabilirsin`);
  }
}
