import { describe, expect, it } from 'vitest';
import { blankProfile, type MonsterCombatant, type TableState } from '@masa/shared';
import { IntentError } from './context';
import { emptyState, fightState, heroInput, run, startFight } from './fixtures';

const names = (s: TableState) =>
  s.encounter!.combatants.map((c) => (c.kind === 'monster' ? c.name : 'Aria'));
const monster = (s: TableState, name: string) =>
  s.encounter!.combatants.find((c) => c.kind === 'monster' && c.name === name) as MonsterCombatant;
const heroSlot = (s: TableState) => s.encounter!.combatants.find((c) => c.kind === 'character')!;
const withHero = () => run(emptyState, 'player', { type: 'character.set', character: heroInput }).state;
const add = (s: TableState, monsterId: string, count = 1, hpMode = 'average', ...faces: number[]) =>
  run(s, 'dm', { type: 'encounter.addMonster', monsterId, count, hpMode }, ...faces).state;

describe('taslak', () => {
  it('canavarları numaralı adlarla ve ortalama can puanı ile ekler', () => {
    const s = add(emptyState, 'goblin', 2);
    expect(s.encounter).toMatchObject({ status: 'draft', round: 0 });
    expect(names(s)).toEqual(['Goblin 1', 'Goblin 2']);
    expect(monster(s, 'Goblin 1')).toMatchObject({
      ac: 15, hp: 7, maxHp: 7, dexMod: 2, initiative: null, revealName: true, revealHp: false, legendaryLeft: null,
    });
  });
  it('atılmış can puanı için can zarını kullanır', () => {
    expect(monster(add(emptyState, 'goblin', 1, 'rolled', 1, 2), 'Goblin 1')).toMatchObject({ hp: 3, maxHp: 3 });
  });
  it('silinen numarayı yeniden kullanmaz', () => {
    let s = add(emptyState, 'goblin', 2);
    s = run(s, 'dm', { type: 'encounter.remove', combatantId: monster(s, 'Goblin 1').id }).state;
    expect(names(add(s, 'goblin'))).toEqual(['Goblin 2', 'Goblin 3']);
  });
  it.each([[0], [11], [1.5], ['2']])('geçersiz adedi reddeder: %j', (count) => {
    expect(() => run(emptyState, 'dm', { type: 'encounter.addMonster', monsterId: 'goblin', count, hpMode: 'average' }))
      .toThrow(IntentError);
  });
  it('bilinmeyen canavarı ve yirmiden fazla katılımcıyı reddeder', () => {
    expect(() => add(emptyState, 'tarrasque')).toThrow('Canavar bulunamadı');
    const full = add(add(emptyState, 'goblin', 10), 'goblin', 10);
    expect(() => add(full, 'goblin')).toThrow('en fazla 20');
  });
  it('rastgele üretim taslağı değiştirir', () => {
    const s = run(add(emptyState, 'skeleton'), 'dm',
      { type: 'encounter.generate', region: 'forest', level: 4, difficulty: 'medium' }, 1, 1, 1, 1).state;
    expect(names(s)).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3', 'Goblin 4']);
  });
  it('uygun canavar yoksa üretim anlaşılır hata verir', () => {
    expect(() => run(emptyState, 'dm', { type: 'encounter.generate', region: 'arctic', level: 4, difficulty: 'medium' }))
      .toThrow('Bu bölgede bu zorluğa uyan canavar yok');
  });
});

describe('başlatma ve bitirme', () => {
  it('karakter kartı ya da canavar yoksa başlamaz', () => {
    expect(() => run(add(emptyState, 'goblin'), 'dm', { type: 'encounter.start' }, 10, 10))
      .toThrow('Önce karakter kartı doldurulmalı');
    expect(() => run(withHero(), 'dm', { type: 'encounter.start' })).toThrow('Başlatılacak bir taslak yok');
  });
  it('inisiyatif atar, sıralar ve birinci rauntu başlatır', () => {
    const s = fightState();
    expect(s.encounter).toMatchObject({ status: 'active', round: 1, turnIndex: 0 });
    expect(names(s)).toEqual(['Aria', 'Goblin 1', 'İskelet 1']);
    expect(s.encounter!.combatants.map((c) => c.initiative)).toEqual([16, 12, 7]);
  });
  it('savaş sürerken yeni karşılaşma üretilemez', () => {
    expect(() => run(fightState(), 'dm', { type: 'encounter.generate', region: 'forest', level: 4, difficulty: 'easy' }))
      .toThrow('Savaş sürerken');
  });
  it('savaşa sonradan katılan yaratık sıraya girer ama sıradaki kişi değişmez', () => {
    const s = run(fightState(), 'dm', { type: 'encounter.addMonster', monsterId: 'goblin', count: 1, hpMode: 'average' }, 20).state;
    expect(names(s)).toEqual(['Goblin 2', 'Aria', 'Goblin 1', 'İskelet 1']);
    expect(s.encounter!.combatants[s.encounter!.turnIndex]!.kind).toBe('character');
  });
  it('bitirme karşılaşmayı kaldırır', () => {
    const { state, log } = run(fightState(), 'dm', { type: 'encounter.end' });
    expect(state.encounter).toBeNull();
    expect(log[0]!.text).toBe('Savaş bitti');
  });
});

describe('karakter saldırısı', () => {
  const attack = (s: TableState, target: string, attackIndex: number, ...faces: number[]) =>
    run(s, 'player', { type: 'character.attack', attackIndex, targetId: monster(s, target).id }, ...faces);

  it('isabet edince hasarı uygular ve düşen hedefi bildirir', () => {
    const { state, log } = attack(fightState(), 'Goblin 1', 0, 12, 4);
    expect(monster(state, 'Goblin 1').hp).toBe(0);
    expect(log[0]).toMatchObject({
      visibility: 'public',
      text: 'Aria, Goblin 1 hedefine Uzun Kılıç ile saldırdı: 17 — isabet, 7 kesici hasar. Goblin 1 düştü',
    });
  });
  it('ıskada hasar zarı atmaz', () => {
    const { state, log } = attack(fightState(), 'Goblin 1', 0, 5);
    expect(monster(state, 'Goblin 1').hp).toBe(7);
    expect(log[0]!.text).toBe('Aria, Goblin 1 hedefine Uzun Kılıç ile saldırdı: 10 — ıska');
  });
  it('zayıflığı uygular', () => {
    expect(monster(attack(fightState(), 'İskelet 1', 1, 12, 2).state, 'İskelet 1').hp).toBe(3);
  });
  it('kritik vuruşta hasar zarını iki kez atar', () => {
    const { state, log } = attack(fightState(), 'İskelet 1', 0, 20, 2, 3);
    expect(monster(state, 'İskelet 1').hp).toBe(5);
    expect(log[0]!.text).toContain('kritik isabet, 8 kesici hasar');
  });
  it('düşmüş hedefe ve olmayan saldırıya izin vermez', () => {
    const s = attack(fightState(), 'Goblin 1', 0, 12, 4).state;
    expect(() => attack(s, 'Goblin 1', 0, 12, 4)).toThrow('Hedef zaten düşmüş');
    expect(() => attack(fightState(), 'Goblin 1', 5, 12, 4)).toThrow('Saldırı bulunamadı');
  });
  it('adı gizlenmiş yaratığın adını herkese açık günlüğe yazmaz', () => {
    let s = fightState();
    s = run(s, 'dm', { type: 'combatant.patch', combatantId: monster(s, 'Goblin 1').id, patch: { revealName: false } }).state;
    const { log } = attack(s, 'Goblin 1', 0, 12, 4);
    expect(log.filter((l) => l.visibility === 'public').map((l) => l.text).join(' ')).not.toContain('Goblin');
    expect(log[0]!.text).toContain('Bilinmeyen yaratık');
  });
});

describe('canavar saldırısı', () => {
  const strike = (s: TableState, ...faces: number[]) =>
    run(s, 'dm', { type: 'combat.monsterAttack', combatantId: monster(s, 'Goblin 1').id, actionIndex: 0 }, ...faces);
  const setHero = (s: TableState, patch: object) =>
    run(s, 'dm', { type: 'combatant.patch', combatantId: heroSlot(s).id, patch }).state;

  it('isabet edince karaktere hasar verir', () => {
    const { state, log } = strike(fightState(), 14, 3);
    expect(state.character!.hp).toBe(19);
    expect(log[0]!.text).toBe('Goblin 1, Aria hedefine Pala ile saldırdı: 18 — isabet, 5 kesici hasar');
  });
  it('önce geçici can puanı harcanır', () => {
    expect(strike(setHero(fightState(), { tempHp: 3 }), 14, 3).state.character).toMatchObject({ hp: 22, tempHp: 0 });
  });
  it('Can puanı sıfıra inince karakter yere düşer; sıfırın altına inmez', () => {
    const { state, log } = strike(setHero(fightState(), { hp: 4 }), 14, 3);
    expect(state.character).toMatchObject({ hp: 0, dead: false, deathSaves: { successes: 0, failures: 0 } });
    expect(log[0]!.text).toContain('Aria yere düştü');
  });
  it('düşmüş karaktere isabet bir, kritik isabet iki ölüm zarı başarısızlığı sayar', () => {
    let s = strike(setHero(fightState(), { hp: 4 }), 14, 3).state;
    s = strike(s, 14, 3).state;
    expect(s.character!.deathSaves.failures).toBe(1);
    const { state, log } = strike(s, 20, 1, 1);
    expect(state.character).toMatchObject({ dead: true, deathSaves: { failures: 3 } });
    expect(log[0]!.text).toContain('Aria öldü');
  });
  it('otomatik çözülemeyen eylemi reddeder', () => {
    const s = fightState();
    expect(() => run(s, 'dm', { type: 'combat.monsterAttack', combatantId: monster(s, 'Goblin 1').id, actionIndex: 1 }))
      .toThrow('otomatik çözülemez');
  });
  it('kurtarma zarının sayısını yalnızca DM görür', () => {
    const s = fightState();
    const { log } = run(s, 'dm',
      { type: 'combat.monsterSave', combatantId: monster(s, 'Goblin 1').id, ability: 'dex', dc: 13 }, 10);
    expect(log.map((l) => [l.visibility, l.text])).toEqual([
      ['dm', 'Goblin 1 Çeviklik kurtarma zarı: 12 (zorluk derecesi 13) — başarısız'],
      ['public', 'Goblin 1 Çeviklik kurtarma zarı attı — başarısız'],
    ]);
  });
});

describe('sıra', () => {
  const next = (s: TableState, role: 'dm' | 'player' = 'dm') => run(s, role, { type: 'combat.nextTurn' });

  it('oyuncu yalnızca kendi sırasını bitirebilir', () => {
    const { state, log } = next(fightState(), 'player');
    expect(state.encounter!.turnIndex).toBe(1);
    expect(log[0]!.text).toBe('1. raunt — sıra: Goblin 1');
    expect(() => next(state, 'player')).toThrow('Sıra sende değil');
  });
  it('sıra başa dönünce raunt artar', () => {
    const s = next(next(next(fightState()).state).state).state;
    expect(s.encounter).toMatchObject({ turnIndex: 0, round: 2 });
  });
  it('sıradakinden önceki katılımcı çıkarılınca sıra aynı kişide kalır', () => {
    let s = next(next(fightState()).state).state;
    s = run(s, 'dm', { type: 'encounter.remove', combatantId: monster(s, 'Goblin 1').id }).state;
    expect(names(s)[s.encounter!.turnIndex]).toBe('İskelet 1');
  });
  it('karakter karşılaşmadan çıkarılamaz', () => {
    const s = fightState();
    expect(() => run(s, 'dm', { type: 'encounter.remove', combatantId: heroSlot(s).id }))
      .toThrow('Karakter karşılaşmadan çıkarılamaz');
  });
  it('efsanevi eylem hakları yaratığın sırası gelince yenilenir', () => {
    let s = startFight(add(withHero(), 'wyrm'), 3, 15);
    const id = monster(s, 'Wyrm 1').id;
    expect(monster(s, 'Wyrm 1').legendaryLeft).toBe(3);
    s = run(s, 'dm', { type: 'combatant.patch', combatantId: id, patch: { legendaryLeft: 0 } }).state;
    expect(monster(next(s).state, 'Wyrm 1').legendaryLeft).toBe(3);
  });
});

describe('elle düzeltme', () => {
  const patch = (s: TableState, name: string, p: object) =>
    run(s, 'dm', { type: 'combatant.patch', combatantId: monster(s, name).id, patch: p });

  it.each([[-1], [8], [2.5], ['3']])('aralık dışı can puanı değerini reddeder: %j', (hp) => {
    expect(() => patch(fightState(), 'Goblin 1', { hp })).toThrow(IntentError);
  });
  it('canavar can puanı düzeltmesini yalnızca DM günlüğüne yazar', () => {
    const { state, log } = patch(fightState(), 'Goblin 1', { hp: 3 });
    expect(monster(state, 'Goblin 1').hp).toBe(3);
    expect(log).toHaveLength(1);
    expect(log[0]!.visibility).toBe('dm');
  });
  it('durum etkilerini doğrular ve herkese açık yazar', () => {
    const { state, log } = patch(fightState(), 'Goblin 1', { conditions: ['prone', 'prone'] });
    expect(monster(state, 'Goblin 1').conditions).toEqual(['prone']);
    expect(log[0]).toMatchObject({ visibility: 'public', text: 'Goblin 1: yere düşmüş' });
    expect(() => patch(fightState(), 'Goblin 1', { conditions: ['flying'] })).toThrow(IntentError);
  });
  it('inisiyatif değişince sıra yeniden dizilir', () => {
    expect(names(patch(fightState(), 'İskelet 1', { initiative: 30 }).state))
      .toEqual(['İskelet 1', 'Aria', 'Goblin 1']);
  });
  it('görünürlük bayraklarını değiştirir', () => {
    expect(monster(patch(fightState(), 'Goblin 1', { revealHp: true, revealName: false }).state, 'Goblin 1'))
      .toMatchObject({ revealHp: true, revealName: false });
  });
  it('elle hasar bağışıklığı ve direnci uygular', () => {
    const s = fightState();
    const hit = run(s, 'dm',
      { type: 'combat.applyDamage', combatantId: monster(s, 'İskelet 1').id, amount: 10, damageType: 'poison' });
    expect(monster(hit.state, 'İskelet 1').hp).toBe(13);
    expect(hit.log[0]!.text).toBe('İskelet 1 0 zehir hasar aldı');
  });
  it('iyileştirme en fazla can puanı değerini aşmaz ve düşmüş karakterin ölüm zarlarını temizler', () => {
    let s = patch(fightState(), 'Goblin 1', { hp: 3 }).state;
    s = run(s, 'dm', { type: 'combat.heal', combatantId: monster(s, 'Goblin 1').id, amount: 99 }).state;
    expect(monster(s, 'Goblin 1').hp).toBe(7);

    s = run(s, 'dm', { type: 'combatant.patch', combatantId: heroSlot(s).id, patch: { hp: 0 } }).state;
    s = run(s, 'player', { type: 'character.deathSave' }, 5).state;
    s = run(s, 'dm', { type: 'combat.heal', combatantId: heroSlot(s).id, amount: 5 }).state;
    expect(s.character).toMatchObject({ hp: 5, deathSaves: { successes: 0, failures: 0 } });
  });
  it('bölge etiketlerini doğrular ve sonuçta döndürür', () => {
    const out = run(emptyState, 'dm', { type: 'monster.setRegions', monsterId: 'goblin', regions: ['forest', 'urban', 'forest'] });
    expect(out.regions).toEqual({ monsterId: 'goblin', regions: ['forest', 'urban'] });
    expect(() => run(emptyState, 'dm', { type: 'monster.setRegions', monsterId: 'goblin', regions: ['moon'] }))
      .toThrow(IntentError);
  });
});

describe('eylem zarı etiketi', () => {
  it('serbest zar eylemin adıyla günlüğe yazılır', () => {
    const out = run(emptyState, 'dm', { type: 'roll', expr: '1d10', label: 'Ateş Oku hasar' }, 7);
    expect(out.log[0]!.text).toContain('Ateş Oku hasar zarı attı: 1d10 → 7');
  });
});

describe('tecrübe puanı', () => {
  const fight = () => startFight(add(withHero(), 'goblin'), 5, 15);
  const goblin = (s: TableState) => s.encounter!.combatants.find((c) => c.kind === 'monster')!;

  it('karakter yaratığı düşürünce yaratığın tecrübe puanını kazanır', () => {
    let s = fight();
    const before = s.character!.profile?.experience ?? 0;
    const out = run(s, 'dm', { type: 'combat.applyDamage', combatantId: goblin(s).id, amount: 999, damageType: 'slashing' });
    expect(out.state.character!.profile!.experience).toBe(before + 50);
    expect(out.log.some((l) => l.text.includes('50 tecrübe puanı kazandı'))).toBe(true);
  });

  it('aynı yaratık iki kez puan vermez', () => {
    const s = fight();
    const id = goblin(s).id;
    let t = run(s, 'dm', { type: 'combat.applyDamage', combatantId: id, amount: 999, damageType: 'slashing' }).state;
    t = run(t, 'dm', { type: 'combat.heal', combatantId: id, amount: 5 }).state;
    t = run(t, 'dm', { type: 'combatant.patch', combatantId: id, patch: { hp: 0 } }).state;
    expect(t.character!.profile!.experience).toBe(50);
  });

  it('eşik aşılınca günlük seviye atlanabileceğini söyler', () => {
    let s = fight();
    s = { ...s, character: { ...s.character!, level: 1, profile: { ...blankProfile(), experience: 280 } } };
    const out = run(s, 'dm', { type: 'combatant.patch', combatantId: goblin(s).id, patch: { hp: 0 } });
    expect(out.log.some((l) => l.text.includes('2. seviyeye ulaşabilir'))).toBe(true);
  });
});

describe('oyuncunun kendi d20 zarı', () => {
  it('verilen d20 ile vurulur, yalnızca hasar zarı sunucuda atılır', () => {
    const fought = startFight(add(withHero(), 'goblin'), 5, 15);
    // Menzil sınanmasın diye herkes aynı noktaya konur.
    const s = { ...fought, board: { ...fought.board, tokens: fought.board.tokens.map((t) => ({ ...t, x: 0.5, y: 0.5 })) } };
    const g = s.encounter!.combatants.find((c) => c.kind === 'monster')!;
    const out = run(s, 'player', { type: 'character.attack', attackIndex: 0, targetId: g.id, d20: 20 }, 4, 4);
    expect(out.log[0]!.text).toContain('kritik isabet');
    const miss = run(s, 'player', { type: 'character.attack', attackIndex: 0, targetId: g.id, d20: 1 });
    expect(miss.log[0]!.text).toContain('ıska');
    expect(() => run(s, 'player', { type: 'character.attack', attackIndex: 0, targetId: g.id, d20: 25 })).toThrow();
  });
});
