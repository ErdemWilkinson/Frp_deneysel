import {
  ABILITIES, ABILITY_TR, DAMAGE_TR, DAMAGE_TYPES, NO_DEFENSES, abilityMod, adjustDamage, applyDamage,
  DEFAULT_REACH, DEFAULT_SPEED, REACH_SLACK, feetBetween,
  PROFILE_TEXT_LIMITS, SKILLS, SKILL_KEYS, SKILL_RANK_TR, blankProfile, skillBonus,
  parseDice, resolveAttack, resolveSave, rollDeathSave, type Ability, type Character, type CharacterProfile,
  type SkillRank,
} from '@masa/shared';
import { activeEncounter, character, fail, monsterIn, publicName, roll, say, type Raw, type Work } from './context';
import { parseInventory } from './inventory';
import { awardKill } from './xp';
import { int, mode, oneOf, text } from './validate';

export function freeRoll(w: Work, i: Raw): void {
  const kind = mode(i.mode);
  const secret = i.secret === true;
  if (secret && w.role !== 'dm') fail('Gizli zarı yalnızca DM atabilir');
  const first = roll(w, i.expr);
  let kept = first;
  let note = '';
  if (kind !== 'normal') {
    const second = roll(w, i.expr);
    const higher = second.total > first.total ? second : first;
    const lower = second.total < first.total ? second : first;
    kept = kind === 'advantage' ? higher : lower;
    note = ` (${kind === 'advantage' ? 'avantaj' : 'dezavantaj'}: ${first.total}, ${second.total})`;
  }
  const who = w.role === 'dm' ? 'DM' : (w.s.character?.name ?? 'Oyuncu');
  const expr = String(i.expr).replace(/\s+/g, '');
  // Eylem zarlarında (saldırı, büyü) günlükte eylemin adı görünür.
  const label = typeof i.label === 'string' ? i.label.replace(/[\r\n]+/g, ' ').trim().slice(0, 40) : '';
  const line = `${who} ${label ? `${label} zarı attı` : 'zar attı'}: ${expr} → ${kept.total}${note} [${kept.dice.map((d) => d.value).join(', ')}]`;
  if (secret) {
    say(w, 'roll', line, 'dm');
    say(w, 'roll', 'DM gizlice zar attı');
  } else {
    say(w, 'roll', line);
  }
}

const RANKS = Object.keys(SKILL_RANK_TR) as SkillRank[];
const TEXT_LABEL: Record<keyof typeof PROFILE_TEXT_LIMITS, string> = {
  className: 'Sınıf', background: 'Geçmiş', playerName: 'Oyuncu adı', race: 'Irk', alignment: 'Yönelim', hitDice: 'Can zarı',
  personality: 'Kişilik özellikleri', ideals: 'İdealler', bonds: 'Bağlar', flaws: 'Kusurlar',
  equipment: 'Ekipman', features: 'Özellikler ve nitelikler', languages: 'Diğer yetkinlikler ve diller',
};

/** Sayfanın kimlik ve öykü bölümü; hepsi isteğe bağlıdır, olmayanlar boş kalır. */
function parseProfile(input: unknown): CharacterProfile {
  const p = (input && typeof input === 'object' ? input : {}) as Record<string, any>;
  const out = blankProfile();
  for (const key of Object.keys(PROFILE_TEXT_LIMITS) as (keyof typeof PROFILE_TEXT_LIMITS)[]) {
    const v = p[key];
    if (v === undefined || v === null || v === '') continue;
    if (typeof v !== 'string' || v.length > PROFILE_TEXT_LIMITS[key]) {
      fail(`${TEXT_LABEL[key]} en fazla ${PROFILE_TEXT_LIMITS[key]} karakter olabilir`);
    }
    out[key] = v.trim();
  }
  out.experience = int(p.experience ?? 0, 0, 10_000_000, 'Deneyim puanı');
  out.inspiration = int(p.inspiration ?? 0, 0, 20, 'İlham puanı');
  const skills = p.skills && typeof p.skills === 'object' ? (p.skills as Record<string, unknown>) : {};
  for (const [key, rank] of Object.entries(skills)) {
    if (!SKILL_KEYS.includes(key as never)) fail(`Beceri geçersiz: ${key}`);
    if (rank !== null && rank !== undefined) out.skills[key as keyof CharacterProfile['skills']] = oneOf(rank, RANKS, 'Beceri yetkinliği');
  }
  return out;
}

function parseCharacter(input: unknown, prev: Character | null, newId: () => string): Character {
  if (!input || typeof input !== 'object') fail('Karakter kartı geçersiz');
  const c = input as Record<string, any>;
  const maxHp = int(c.maxHp, 1, 999, 'En fazla can puanı');
  const hp = int(c.hp, 0, maxHp, 'Can puanı');
  const abilities = {} as Record<Ability, number>;
  for (const a of ABILITIES) abilities[a] = int(c.abilities?.[a], 1, 30, ABILITY_TR[a]);
  if (!Array.isArray(c.saveProficiencies)) fail('Kurtarma zarı yetkinlikleri geçersiz');
  if (!Array.isArray(c.attacks) || c.attacks.length > 12) fail('En fazla 12 saldırı girilebilir');
  const attacks = c.attacks.map((a: any) => {
    const damage = text(a?.damage, 30, 'Hasar zarı').replace(/\s+/g, '');
    try { parseDice(damage); } catch { fail('Hasar zarı geçersiz'); }
    return {
      name: text(a?.name, 40, 'Saldırı adı'),
      bonus: int(a?.bonus, -10, 30, 'İsabet bonusu'),
      damage,
      type: oneOf(a?.type, DAMAGE_TYPES, 'Hasar türü'),
      range: int(a?.range ?? DEFAULT_REACH, 5, 600, 'Menzil'),
    };
  });
  const revived = hp > 0;
  const name = text(c.name, 60, 'Ad');
  // Kart formu çantayı göndermez: aynı karakter düzenleniyorsa çantası korunur. Kayıtlı karakter çantasıyla gelir.
  const inventory = Array.isArray(c.inventory)
    ? parseInventory(c.inventory, newId)
    : prev && prev.name === name ? (prev.inventory ?? []) : [];
  return {
    name,
    level: int(c.level, 1, 20, 'Seviye'),
    ac: int(c.ac, 1, 40, 'Zırh sınıfı'),
    maxHp,
    hp,
    tempHp: int(c.tempHp, 0, 999, 'Geçici can puanı'),
    speed: int(c.speed ?? DEFAULT_SPEED, 0, 120, 'Hız'),
    abilities,
    proficiency: int(c.proficiency, 2, 6, 'Yetkinlik bonusu'),
    saveProficiencies: [...new Set(c.saveProficiencies.map((a: unknown) => oneOf(a, ABILITIES, 'Kurtarma zarı')))],
    attacks,
    profile: parseProfile(c.profile),
    inventory,
    deathSaves: revived || !prev ? { successes: 0, failures: 0 } : prev.deathSaves,
    dead: revived || !prev ? false : prev.dead,
  };
}

export function setCharacter(w: Work, i: Raw): void {
  w.s.character = parseCharacter(i.character, w.s.character, w.ctx.newId);
  if (w.role === 'dm') say(w, 'manual', 'DM karakter kartını düzenledi');
}

export function characterAttack(w: Work, i: Raw): void {
  const e = activeEncounter(w);
  if (w.s.theater) fail('Hayali savaşı DM yönetiyor');
  const c = character(w);
  if (c.hp <= 0) fail('Karakter ayakta değil');
  const attack = c.attacks[int(i.attackIndex, 0, 11, 'Saldırı')] ?? fail('Saldırı bulunamadı');
  const target = monsterIn(e, i.targetId);
  if (target.hp <= 0) fail('Hedef zaten düşmüş');
  // İkisi de savaş alanındaysa menzil ölçülür; alanda değillerse DM'in sözü geçer.
  const from = w.s.board.tokens.find((t) => t.kind === 'character');
  const to = w.s.board.tokens.find((t) => t.combatantId === target.id);
  if (from && to) {
    const away = feetBetween(from, to, w.s.board);
    if (away > attack.range + REACH_SLACK) fail(`Hedef menzil dışında: ${Math.round(away)} fit uzakta, ${attack.name} menzili ${attack.range} fit`);
  }
  // Oyuncu d20'sini kendisi attıysa o değer kullanılır; yalnızca hasar zarı sunucuda atılır.
  const own = i.d20 === undefined ? null : int(i.d20, 1, 20, 'd20 zarı');
  const r = own === null
    ? resolveAttack(attack.bonus, target.ac, mode(i.mode), w.ctx.rng)
    : { rolls: [own], kept: own, total: own + attack.bonus,
        outcome: own === 20 ? 'crit' as const : own === 1 ? 'miss' as const : own + attack.bonus >= target.ac ? 'hit' as const : 'miss' as const };
  const head = `${c.name}, ${publicName(target)} hedefine ${attack.name} ile saldırdı: ${r.total}`;
  if (r.outcome === 'miss') return say(w, 'attack', `${head} — ıska`);
  const crit = r.outcome === 'crit';
  const rolled = roll(w, attack.damage, crit).total;
  const dealt = adjustDamage(rolled, attack.type, w.ctx.monsters.get(target.monsterId) ?? NO_DEFENSES);
  const wasUp = target.hp > 0;
  Object.assign(target, applyDamage(target, dealt));
  const fallen = target.hp === 0 ? `. ${publicName(target)} düştü` : '';
  say(w, 'attack', `${head} — ${crit ? 'kritik isabet' : 'isabet'}, ${dealt} ${DAMAGE_TR[attack.type]} hasar${fallen}`);
  if (wasUp && target.hp === 0) awardKill(w, target);
}

export function characterSave(w: Work, i: Raw): void {
  const c = character(w);
  const ability = oneOf(i.ability, ABILITIES, 'Yetenek');
  const dc = i.dc === undefined ? null : int(i.dc, 1, 40, 'Zorluk derecesi');
  const bonus = abilityMod(c.abilities[ability]) + (c.saveProficiencies.includes(ability) ? c.proficiency : 0);
  const r = resolveSave(bonus, dc, mode(i.mode), w.ctx.rng);
  const result = r.success === null ? '' : r.success ? ' — başarılı' : ' — başarısız';
  say(w, 'save', `${c.name} ${ABILITY_TR[ability]} kurtarma zarı attı: ${r.total}${result}`);
}

export function characterCheck(w: Work, i: Raw): void {
  const c = character(w);
  const key = oneOf(i.skill, SKILL_KEYS, 'Beceri');
  const dc = i.dc === undefined ? null : int(i.dc, 1, 40, 'Zorluk derecesi');
  const r = resolveSave(skillBonus(c, key), dc, mode(i.mode), w.ctx.rng);
  const result = r.success === null ? '' : r.success ? ' — başarılı' : ' — başarısız';
  const name = SKILLS.find((s) => s.key === key)!.tr;
  say(w, 'roll', `${c.name} ${name} zarı attı: ${r.total}${result}`);
}

export function deathSave(w: Work): void {
  const c = character(w);
  if (c.dead) fail('Karakter ölü');
  if (c.hp > 0) fail('Karakter ayakta; ölüm zarı gerekmez');
  if (c.deathSaves.successes >= 3) fail('Karakter dengede; ölüm zarı gerekmez');
  const r = rollDeathSave(c.deathSaves, w.ctx.rng);
  c.deathSaves = r.saves;
  if (r.outcome === 'revive') c.hp = 1;
  if (r.outcome === 'dead') c.dead = true;
  const result = {
    success: 'başarılı', failure: 'başarısız', revive: `${c.name} 1 can puanı ile ayağa kalktı`,
    stable: `${c.name} dengelendi`, dead: `${c.name} öldü`,
  }[r.outcome];
  say(w, 'save', `${c.name} ölüm kurtarma zarı attı: ${r.roll} — ${result}`);
}
