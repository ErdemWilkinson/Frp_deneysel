import { describe, expect, it } from 'vitest';
import { IntentError } from './context';
import { emptyState, heroInput, run } from './fixtures';

const withHero = () => run(emptyState, 'player', { type: 'character.set', character: heroInput }).state;
const downed = () => run(emptyState, 'player', { type: 'character.set', character: { ...heroInput, hp: 0 } }).state;

describe('reduce: güvenlik', () => {
  it.each([null, 5, 'roll', {}, { type: 5 }, { type: 'no.such.intent' }])('bozuk niyeti reddeder: %j', (bad) => {
    expect(() => run(emptyState, 'dm', bad)).toThrow(IntentError);
  });

  it.each([
    'encounter.addMonster', 'encounter.remove', 'encounter.generate', 'encounter.start', 'encounter.end',
    'combat.monsterAttack', 'combat.monsterSave', 'combat.applyDamage', 'combat.heal',
    'combatant.patch', 'monster.setRegions',
  ])('oyuncu DM hamlesi gönderemez: %s', (type) => {
    expect(() => run(emptyState, 'player', { type })).toThrow('Bu işlem yalnızca DM içindir');
  });

  it('girdi durumunu değiştirmez', () => {
    const before = structuredClone(emptyState);
    run(emptyState, 'player', { type: 'character.set', character: heroInput });
    expect(emptyState).toEqual(before);
  });
});

describe('roll', () => {
  it('herkese açık bir günlük kaydı üretir', () => {
    const { log, state } = run(emptyState, 'dm', { type: 'roll', expr: '2d6+3' }, 4, 5);
    expect(log).toHaveLength(1);
    expect(log[0]).toMatchObject({ kind: 'roll', visibility: 'public', actor: 'dm', text: 'DM zar attı: 2d6+3 → 12 [4, 5]' });
    expect(state).toEqual(emptyState);
  });

  it('avantajda iki atışın yükseğini tutar', () => {
    const { log } = run(emptyState, 'dm', { type: 'roll', expr: '1d20', mode: 'advantage' }, 4, 17);
    expect(log[0]!.text).toBe('DM zar attı: 1d20 → 17 (avantaj: 4, 17) [17]');
  });

  it('gizli zarın sonucunu yalnızca DM kaydına yazar', () => {
    const { log } = run(emptyState, 'dm', { type: 'roll', expr: '1d20', secret: true }, 13);
    expect(log.map((l) => l.visibility)).toEqual(['dm', 'public']);
    expect(log[0]!.text).toContain('13');
    expect(log[1]!.text).toBe('DM gizlice zar attı');
  });

  it('oyuncu gizli zar atamaz', () => {
    expect(() => run(emptyState, 'player', { type: 'roll', expr: '1d20', secret: true }, 13))
      .toThrow('Gizli zarı yalnızca DM atabilir');
  });

  it.each(['', '2d', '0d6', '9999d9999', '1d6; drop table', {}, 42, null])('bozuk ifadeyi reddeder: %j', (expr) => {
    expect(() => run(emptyState, 'dm', { type: 'roll', expr })).toThrow(IntentError);
  });
});

describe('character.set', () => {
  it('kartı kaydeder ve ölüm zarı sayaçlarını sıfırdan başlatır', () => {
    expect(withHero().character).toMatchObject({
      name: 'Aria', hp: 24, maxHp: 24, deathSaves: { successes: 0, failures: 0 }, dead: false,
    });
  });

  it.each([
    ['ad boş', { name: '  ' }],
    ['Can puanı azamiden büyük', { hp: 25 }],
    ['Can puanı negatif', { hp: -1 }],
    ['Zırh sınıfı sayı değil', { ac: '16' }],
    ['yetenek aralık dışı', { abilities: { ...heroInput.abilities, str: 31 } }],
    ['hasar zarı bozuk', { attacks: [{ name: 'Kılıç', bonus: 5, damage: '1dx', type: 'slashing' }] }],
    ['hasar türü bilinmiyor', { attacks: [{ name: 'Kılıç', bonus: 5, damage: '1d8', type: 'laser' }] }],
    ['saldırı listesi dizi değil', { attacks: 'yok' }],
    ['on üç saldırı', { attacks: Array.from({ length: 13 }, () => heroInput.attacks[0]) }],
  ])('geçersiz kartı reddeder: %s', (_label, patch) => {
    expect(() => run(emptyState, 'player', { type: 'character.set', character: { ...heroInput, ...patch } }))
      .toThrow(IntentError);
  });

  it('DM düzenlerse günlüğe düşer, oyuncu düzenlerse düşmez', () => {
    expect(run(emptyState, 'player', { type: 'character.set', character: heroInput }).log).toHaveLength(0);
    expect(run(emptyState, 'dm', { type: 'character.set', character: heroInput }).log[0]!.text)
      .toBe('DM karakter kartını düzenledi');
  });

  it('Can puanı yeniden sıfırın üstüne çıkınca ölüm zarlarını temizler', () => {
    let s = run(downed(), 'player', { type: 'character.deathSave' }, 5).state;
    expect(s.character!.deathSaves.failures).toBe(1);
    s = run(s, 'dm', { type: 'character.set', character: { ...heroInput, hp: 6 } }).state;
    expect(s.character!.deathSaves).toEqual({ successes: 0, failures: 0 });
  });
});

describe('character.save', () => {
  it('yetkin olunan kurtarma zarına yetkinlik bonusunu ekler', () => {
    const { log } = run(withHero(), 'player', { type: 'character.save', ability: 'con', dc: 15 }, 11);
    expect(log[0]!.text).toBe('Aria Dayanıklılık kurtarma zarı attı: 15 — başarılı');
  });
  it('yetkin olunmayan zarda yalnızca değiştiriciyi kullanır; zorluk derecesi yoksa sonuç yazmaz', () => {
    const { log } = run(withHero(), 'player', { type: 'character.save', ability: 'dex' }, 11);
    expect(log[0]!.text).toBe('Aria Çeviklik kurtarma zarı attı: 12');
  });
});

describe('character.deathSave', () => {
  it('ayaktaki karakter için reddedilir', () => {
    expect(() => run(withHero(), 'player', { type: 'character.deathSave' }, 10)).toThrow('Karakter ayakta');
  });
  it('doğal 20 karakteri 1 can puanı ile kaldırır', () => {
    const { state, log } = run(downed(), 'player', { type: 'character.deathSave' }, 20);
    expect(state.character).toMatchObject({ hp: 1, dead: false });
    expect(log[0]!.text).toContain('1 can puanı ile ayağa kalktı');
  });
  it('üç başarısızlık öldürür; sonrasında zar atılamaz', () => {
    let s = downed();
    for (const face of [2, 3, 4]) s = run(s, 'player', { type: 'character.deathSave' }, face).state;
    expect(s.character).toMatchObject({ dead: true, hp: 0 });
    expect(() => run(s, 'player', { type: 'character.deathSave' }, 10)).toThrow('Karakter ölü');
  });
  it('üç başarıdan sonra karakter dengededir; yeniden zar atılamaz', () => {
    let s = downed();
    for (const face of [10, 11, 12]) s = run(s, 'player', { type: 'character.deathSave' }, face).state;
    expect(() => run(s, 'player', { type: 'character.deathSave' }, 10)).toThrow('Karakter dengede');
  });
});

describe('karakter sayfası: kimlik, beceriler ve öykü', () => {
  const profile = {
    className: 'Barbar', background: 'Haydut', playerName: 'Erdem', race: 'Cüce', alignment: 'Kaotik iyi',
    experience: 300, inspiration: 1, hitDice: '3d12', skills: { athletics: 'proficient', perception: 'expertise' },
    personality: 'Ayakkabı giymekten nefret eder', ideals: 'Emek', bonds: 'Tarif', flaws: 'Büyücü nefreti',
    equipment: 'Arap kılıcı\n2 el baltası', features: 'Öfke', languages: 'Cüce dili',
  };
  const saved = (p: unknown) => run(emptyState, 'player', { type: 'character.set', character: { ...heroInput, profile: p } }).state;

  it('sayfadaki kimlik ve öykü alanlarını saklar', () => {
    expect(saved(profile).character!.profile).toEqual(profile);
  });
  it('profil olmayan eski kart boş bir profille kaydedilir', () => {
    expect(withHero().character!.profile).toMatchObject({ className: '', experience: 0, skills: {} });
  });
  it('bilinmeyen beceriyi, geçersiz yetkinliği ve aşırı uzun metni reddeder', () => {
    expect(() => saved({ skills: { flying: 'proficient' } })).toThrow(IntentError);
    expect(() => saved({ skills: { athletics: 'master' } })).toThrow(IntentError);
    expect(() => saved({ equipment: 'x'.repeat(2001) })).toThrow('Ekipman');
  });
  it('beceri zarı yetenek değiştiricisine ve yetkinliğe göre atılır; uzmanlıkta bonus iki katıdır', () => {
    const s = saved(profile);
    // Kuvvet 16 → +3, yetkinlik +2 → +5; d20 = 10 → 15
    expect(run(s, 'player', { type: 'character.check', skill: 'athletics' }, 10).log[0]!.text).toBe('Aria Atletizm zarı attı: 15');
    // Bilgelik 10 → +0, uzmanlık +4
    expect(run(s, 'player', { type: 'character.check', skill: 'perception', dc: 14 }, 10).log[0]!.text)
      .toBe('Aria Algı zarı attı: 14 — başarılı');
    expect(() => run(s, 'player', { type: 'character.check', skill: 'flying' }, 10)).toThrow(IntentError);
  });
});
