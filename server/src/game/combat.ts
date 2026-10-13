import {
  ABILITIES, ABILITY_TR, CONDITIONS, CONDITION_TR, DAMAGE_TR, DAMAGE_TYPES, NO_DEFENSES, REGIONS,
  abilityMod, adjustDamage, applyDamage, displayName, heal, resolveAttack, resolveSave,
} from '@masa/shared';
import { activeEncounter, character, fail, monsterIn, publicName, roll, say, type Raw, type Work } from './context';
import { resort, turnLabel } from './encounter';
import { awardKill } from './xp';
import { int, mode, oneOf } from './validate';

export function nextTurn(w: Work): void {
  const e = activeEncounter(w);
  if (w.role !== 'dm' && e.combatants[e.turnIndex]?.kind !== 'character') fail('Sıra sende değil');
  e.turnIndex += 1;
  if (e.turnIndex >= e.combatants.length) {
    e.turnIndex = 0;
    e.round += 1;
  }
  const next = e.combatants[e.turnIndex];
  if (next) {
    next.moved = 0;
    next.dashed = false;
  }
  if (next?.kind === 'monster') {
    const count = w.ctx.monsters.get(next.monsterId)?.legendaryCount ?? 0;
    if (count > 0) next.legendaryLeft = count;
  }
  say(w, 'turn', turnLabel(w, e));
}

/** Koşu: bu tur için yürüme mesafesi bir hız kadar daha artar. */
export function dash(w: Work): void {
  const e = activeEncounter(w);
  const current = e.combatants[e.turnIndex];
  if (!current || (w.role !== 'dm' && current.kind !== 'character')) fail('Sıra sende değil');
  if (current.dashed) fail('Bu tur zaten koştun');
  current.dashed = true;
  const name = current.kind === 'monster' ? publicName(current) : character(w).name;
  say(w, 'manual', `${name} koşuyor`);
}

/** Karaktere hasar uygular ve günlük satırının sonuna eklenecek metni döndürür. */
function hurtHero(w: Work, amount: number, crit: boolean): string {
  const hero = character(w);
  const wasDown = hero.hp === 0;
  Object.assign(hero, applyDamage(hero, amount));
  if (wasDown) {
    hero.deathSaves.failures = Math.min(3, hero.deathSaves.failures + (crit ? 2 : 1));
    if (hero.deathSaves.failures < 3) return '';
    hero.dead = true;
    return `. ${hero.name} öldü`;
  }
  if (hero.hp > 0) return '';
  hero.deathSaves = { successes: 0, failures: 0 };
  return `. ${hero.name} yere düştü`;
}

export function monsterAttack(w: Work, i: Raw): void {
  const e = activeEncounter(w);
  const hero = character(w);
  const attacker = monsterIn(e, i.combatantId);
  if (attacker.hp <= 0) fail('Düşmüş bir yaratık saldıramaz');
  if (hero.dead) fail('Karakter ölü');
  const def = w.ctx.monsters.get(attacker.monsterId) ?? fail('Canavar kaydı bulunamadı');
  const action = def.actions[int(i.actionIndex, 0, 99, 'Eylem')] ?? fail('Eylem bulunamadı');
  const attack = action.attack ?? fail('Bu eylem otomatik çözülemez; zar atıcıyı kullan');
  const r = resolveAttack(attack.bonus, hero.ac, mode(i.mode), w.ctx.rng);
  const head = `${publicName(attacker)}, ${hero.name} hedefine ${displayName(action.name)} ile saldırdı: ${r.total}`;
  if (r.outcome === 'miss') return say(w, 'attack', `${head} — ıska`);
  const crit = r.outcome === 'crit';
  const parts = attack.damage.map((p) => ({ amount: Math.max(0, roll(w, p.dice, crit).total), type: p.type }));
  const tail = hurtHero(w, parts.reduce((n, p) => n + p.amount, 0), crit);
  const damage = parts.map((p) => `${p.amount} ${DAMAGE_TR[p.type]}`).join(' + ');
  say(w, 'attack', `${head} — ${crit ? 'kritik isabet' : 'isabet'}, ${damage} hasar${tail}`);
}

export function monsterSave(w: Work, i: Raw): void {
  const e = w.s.encounter ?? fail('Karşılaşma yok');
  const m = monsterIn(e, i.combatantId);
  const def = w.ctx.monsters.get(m.monsterId) ?? fail('Canavar kaydı bulunamadı');
  const ability = oneOf(i.ability, ABILITIES, 'Yetenek');
  const dc = int(i.dc, 1, 40, 'Zorluk derecesi');
  const r = resolveSave(def.saves[ability] ?? abilityMod(def.abilities[ability]), dc, mode(i.mode), w.ctx.rng);
  const result = r.success ? 'başarılı' : 'başarısız';
  say(w, 'save', `${m.name} ${ABILITY_TR[ability]} kurtarma zarı: ${r.total} (zorluk derecesi ${dc}) — ${result}`, 'dm');
  say(w, 'save', `${publicName(m)} ${ABILITY_TR[ability]} kurtarma zarı attı — ${result}`);
}

export function manualDamage(w: Work, i: Raw): void {
  const e = w.s.encounter ?? fail('Karşılaşma yok');
  const c = e.combatants.find((x) => x.id === i.combatantId) ?? fail('Katılımcı bulunamadı');
  const amount = int(i.amount, 0, 9999, 'Hasar');
  const type = oneOf(i.damageType, DAMAGE_TYPES, 'Hasar türü');
  if (c.kind === 'monster') {
    const dealt = adjustDamage(amount, type, w.ctx.monsters.get(c.monsterId) ?? NO_DEFENSES);
    const wasUp = c.hp > 0;
    Object.assign(c, applyDamage(c, dealt));
    say(w, 'damage', `${publicName(c)} ${dealt} ${DAMAGE_TR[type]} hasar aldı${c.hp === 0 ? ' ve düştü' : ''}`);
    if (wasUp && c.hp === 0) awardKill(w, c);
    return;
  }
  const hero = character(w);
  if (hero.dead) fail('Karakter ölü');
  const tail = hurtHero(w, amount, false);
  say(w, 'damage', `${hero.name} ${amount} ${DAMAGE_TR[type]} hasar aldı${tail}`);
}

export function manualHeal(w: Work, i: Raw): void {
  const e = w.s.encounter ?? fail('Karşılaşma yok');
  const c = e.combatants.find((x) => x.id === i.combatantId) ?? fail('Katılımcı bulunamadı');
  const amount = int(i.amount, 0, 9999, 'İyileşme');
  if (c.kind === 'monster') {
    c.hp = heal(c, amount);
    say(w, 'manual', `${publicName(c)} iyileşti`);
    return;
  }
  const hero = character(w);
  if (hero.dead) fail('Karakter ölü');
  hero.hp = heal(hero, amount);
  if (hero.hp > 0) hero.deathSaves = { successes: 0, failures: 0 };
  say(w, 'manual', `${hero.name} ${amount} can puanı iyileşti`);
}

export function patchCombatant(w: Work, i: Raw): void {
  const e = w.s.encounter ?? fail('Karşılaşma yok');
  const c = e.combatants.find((x) => x.id === i.combatantId) ?? fail('Katılımcı bulunamadı');
  const p = (i.patch && typeof i.patch === 'object' ? i.patch : fail('Düzeltme geçersiz')) as Raw;
  const vitals = c.kind === 'monster' ? c : character(w);
  // Canavarın sayıları oyuncudan gizlidir; karakterinkiler değildir.
  const numbers = c.kind === 'monster' ? 'dm' : 'public';

  if (p.hp !== undefined) {
    const wasUp = vitals.hp > 0;
    vitals.hp = int(p.hp, 0, vitals.maxHp, 'Can puanı');
    if (c.kind === 'monster' && wasUp && vitals.hp === 0) awardKill(w, c);
    if (c.kind === 'character' && vitals.hp > 0) {
      const hero = character(w);
      hero.deathSaves = { successes: 0, failures: 0 };
      hero.dead = false;
    }
    say(w, 'manual', `DM ${vitals.name} için can puanı değerini ${vitals.hp} yaptı`, numbers);
  }
  if (p.tempHp !== undefined) {
    vitals.tempHp = int(p.tempHp, 0, 999, 'Geçici can puanı');
    say(w, 'manual', `DM ${vitals.name} için geçici can puanı değerini ${vitals.tempHp} yaptı`, numbers);
  }
  if (p.initiative !== undefined) {
    c.initiative = int(p.initiative, -10, 60, 'İnisiyatif');
    if (e.status === 'active') resort(e, w.s);
    say(w, 'manual', `DM ${vitals.name} için inisiyatifi ${c.initiative} yaptı`, 'dm');
  }
  if (p.conditions !== undefined) {
    if (!Array.isArray(p.conditions)) fail('Durum listesi geçersiz');
    c.conditions = [...new Set(p.conditions.map((x) => oneOf(x, CONDITIONS, 'Durum')))];
    const shown = c.kind === 'monster' ? publicName(c) : vitals.name;
    say(w, 'condition', `${shown}: ${c.conditions.map((x) => CONDITION_TR[x]).join(', ') || 'durum etkisi yok'}`);
  }
  if (c.kind === 'monster') {
    if (typeof p.revealName === 'boolean') c.revealName = p.revealName;
    if (typeof p.revealHp === 'boolean') c.revealHp = p.revealHp;
    if (p.identifyDc !== undefined) c.identifyDc = int(p.identifyDc, 1, 30, 'Tanıma zorluğu');
    if (typeof p.identifyTried === 'boolean') c.identifyTried = p.identifyTried;
    if (p.legendaryLeft !== undefined) c.legendaryLeft = int(p.legendaryLeft, 0, 5, 'Efsanevi eylem hakkı');
  }
}

export function setRegions(w: Work, i: Raw): void {
  const monsterId = String(i.monsterId);
  if (!w.ctx.monsters.has(monsterId)) fail('Canavar bulunamadı');
  if (!Array.isArray(i.regions)) fail('Bölge listesi geçersiz');
  w.regions = { monsterId, regions: [...new Set(i.regions.map((r) => oneOf(r, REGIONS, 'Bölge')))] };
}
