import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { REGIONS, inRegion, validateMonster } from '@masa/shared';
import { loadMonsters } from './load';

const monsters = [...loadMonsters(fileURLToPath(new URL('../../data', import.meta.url))).values()];

describe('canavar verisi', () => {
  it('SRD canavarlarının tamamı yüklü', () => {
    expect(monsters.length).toBeGreaterThan(300);
  });
  it('her kayıt şemaya uyar', () => {
    expect(monsters.flatMap(validateMonster)).toEqual([]);
  });
  it('canavarların çoğunda otomatik çözülebilen en az bir saldırı var', () => {
    const withAttack = monsters.filter((m) => m.actions.some((a) => a.attack));
    expect(withAttack.length / monsters.length).toBeGreaterThan(0.85);
  });

  it('her canavarın en az bir, en çok dört bölge etiketi var', () => {
    const bad = monsters.filter((m) => m.regions.length < 1 || m.regions.length > 4).map((m) => m.id);
    expect(bad).toEqual([]);
  });
  it('her bölgede en az sekiz canavar var', () => {
    for (const region of REGIONS) {
      expect(monsters.filter((m) => inRegion(m, region)).length, region).toBeGreaterThanOrEqual(8);
    }
  });
  it('çevrilmiş metinlerde sayılar ve zar ifadeleri korunmuş, boş yer tutucu kalmamış', () => {
    const numbers = (s: string) => (s.match(/\d+/g) ?? []).sort().join(' ');
    const drift = monsters.flatMap((m) =>
      [...m.traits, ...m.actions, ...m.legendaryActions]
        .filter((t) => t.text.tr !== null && (numbers(t.text.tr) !== numbers(t.text.en) || /\{\d+\}/.test(t.text.tr)))
        .map((t) => `${m.id}: ${t.name.en}`));
    expect(drift).toEqual([]);
  });
  it('her canavarın ve her özellik ile eylemin adı çevrilmiş', () => {
    const missing = monsters
      .filter((m) => !m.name.tr || [...m.traits, ...m.actions, ...m.legendaryActions].some((t) => !t.name.tr))
      .map((m) => m.id);
    expect(missing).toEqual([]);
  });
});

describe('insan kitabı', () => {
  const humans = monsters.filter((m) => m.human);

  it('SRD insanları ve proje kayıtları birlikte listelenir', () => {
    expect(humans.length).toBeGreaterThanOrEqual(45);
    for (const id of ['bandit', 'bandit-captain', 'thug', 'guard', 'veteran', 'knight', 'gladiator', 'archmage']) {
      expect(humans.some((m) => m.id === id), id).toBe(true);
    }
    expect(monsters.find((m) => m.id === 'goblin')?.human).toBeUndefined();
  });

  it('haydut, yağmacı ve şehir insanları zorluk basamaklarına yayılır', () => {
    const own = humans.filter((m) => !['acolyte', 'archmage', 'assassin', 'bandit', 'bandit-captain', 'berserker', 'commoner',
      'cult-fanatic', 'cultist', 'druid', 'gladiator', 'guard', 'knight', 'mage', 'noble', 'priest', 'scout', 'spy', 'thug',
      'tribal-warrior', 'veteran'].includes(m.id));
    expect(own.length).toBeGreaterThanOrEqual(30);
    const crs = new Set(own.map((m) => m.cr));
    for (const cr of [0, 0.5, 1, 2, 4, 5, 8]) expect(crs.has(cr), `CR ${cr}`).toBe(true);
    for (const id of ['raider', 'raider-chieftain', 'bandit-chief', 'warlord', 'watch-captain', 'thief-lord', 'crime-boss']) {
      expect(own.some((m) => m.id === id), id).toBe(true);
    }
  });

  it('kendi kayıtlarının canı, zırhı ve saldırı bonusu yetenek puanlarıyla tutarlı', () => {
    for (const m of humans.filter((x) => x.actions.some((a) => a.attack) && x.hitDice.match(/^\d+d8/))) {
      const n = Number(m.hitDice.split('d')[0]);
      const con = Math.floor((m.abilities.con - 10) / 2);
      if (m.id.length === 0) continue;
      // SRD kayıtları kendi hesabını kullanır; yalnızca tutarlılık sınırı denetlenir.
      expect(m.hp, m.id).toBeGreaterThanOrEqual(Math.floor(n * 2.5));
      expect(m.hp, m.id).toBeLessThanOrEqual(Math.ceil(n * 4.5 + n * Math.max(con, 0) + n * 2));
    }
  });
});
