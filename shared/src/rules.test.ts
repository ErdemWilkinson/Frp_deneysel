import { describe, expect, it } from 'vitest';
import {
  abilityMod, adjustDamage, applyDamage, heal, hpBand, resolveAttack, resolveSave,
  rollDeathSave, sortInitiative,
} from './rules';
import { scripted } from './testing';

const none = { resistances: [], immunities: [], vulnerabilities: [] };

describe('abilityMod', () => {
  it('SRD tablosuna uyar', () => {
    expect([1, 8, 10, 11, 15, 20, 30].map(abilityMod)).toEqual([-5, -1, 0, 0, 2, 5, 10]);
  });
});

describe('resolveAttack', () => {
  it('toplam zırh sınıfı değerine eşit ya da büyükse isabet eder', () => {
    expect(resolveAttack(5, 15, 'normal', scripted(10)).outcome).toBe('hit');
    expect(resolveAttack(5, 16, 'normal', scripted(10)).outcome).toBe('miss');
  });
  it('doğal 20 her zaman kritik, doğal 1 her zaman ıskadır', () => {
    expect(resolveAttack(0, 30, 'normal', scripted(20)).outcome).toBe('crit');
    expect(resolveAttack(20, 5, 'normal', scripted(1)).outcome).toBe('miss');
  });
  it('avantajda iki zarın yükseğini kullanır', () => {
    expect(resolveAttack(0, 15, 'advantage', scripted(3, 16))).toMatchObject({ kept: 16, outcome: 'hit' });
  });
});

describe('adjustDamage', () => {
  it('direnç yarıya indirir (aşağı yuvarlar), bağışıklık sıfırlar, zayıflık ikiye katlar', () => {
    expect(adjustDamage(7, 'fire', { ...none, resistances: ['fire'] })).toBe(3);
    expect(adjustDamage(7, 'fire', { ...none, immunities: ['fire'] })).toBe(0);
    expect(adjustDamage(7, 'fire', { ...none, vulnerabilities: ['fire'] })).toBe(14);
    expect(adjustDamage(7, 'cold', { ...none, resistances: ['fire'] })).toBe(7);
  });
  it('negatif hasarı sıfıra çeker', () => {
    expect(adjustDamage(-4, 'fire', none)).toBe(0);
  });
});

describe('applyDamage', () => {
  it('önce geçici can puanı harcanır', () => {
    expect(applyDamage({ hp: 10, tempHp: 4 }, 6)).toEqual({ hp: 8, tempHp: 0 });
    expect(applyDamage({ hp: 10, tempHp: 4 }, 3)).toEqual({ hp: 10, tempHp: 1 });
  });
  it('Can puanı sıfırın altına inmez', () => {
    expect(applyDamage({ hp: 5, tempHp: 0 }, 99)).toEqual({ hp: 0, tempHp: 0 });
  });
});

describe('heal', () => {
  it('en fazla can puanı değerini aşmaz, negatif miktarı yok sayar', () => {
    expect(heal({ hp: 8, maxHp: 10 }, 99)).toBe(10);
    expect(heal({ hp: 8, maxHp: 10 }, -5)).toBe(8);
  });
});

describe('resolveSave', () => {
  it('toplam zorluk derecesi değerine eşit ya da büyükse başarılıdır', () => {
    expect(resolveSave(2, 13, 'normal', scripted(11)).success).toBe(true);
    expect(resolveSave(2, 13, 'normal', scripted(10)).success).toBe(false);
  });
  it('Zorluk derecesi verilmezse yalnızca toplamı döndürür', () => {
    expect(resolveSave(2, null, 'normal', scripted(10))).toMatchObject({ total: 12, success: null });
  });
});

describe('rollDeathSave', () => {
  const start = { successes: 0, failures: 0 };
  it('10 ve üstü başarı, altı başarısızlık', () => {
    expect(rollDeathSave(start, scripted(10))).toMatchObject({ outcome: 'success', saves: { successes: 1, failures: 0 } });
    expect(rollDeathSave(start, scripted(9))).toMatchObject({ outcome: 'failure', saves: { successes: 0, failures: 1 } });
  });
  it('doğal 1 iki başarısızlık sayar', () => {
    expect(rollDeathSave(start, scripted(1)).saves.failures).toBe(2);
  });
  it('doğal 20 karakteri ayağa kaldırır ve sayaçları sıfırlar', () => {
    expect(rollDeathSave({ successes: 1, failures: 2 }, scripted(20))).toMatchObject({
      outcome: 'revive', saves: { successes: 0, failures: 0 },
    });
  });
  it('üçüncü başarı dengeler, üçüncü başarısızlık öldürür', () => {
    expect(rollDeathSave({ successes: 2, failures: 0 }, scripted(15)).outcome).toBe('stable');
    expect(rollDeathSave({ successes: 0, failures: 2 }, scripted(5)).outcome).toBe('dead');
    expect(rollDeathSave({ successes: 0, failures: 2 }, scripted(1)).saves.failures).toBe(3);
  });
});

describe('sortInitiative', () => {
  it('yüksek inisiyatif önce; eşitlikte yüksek Çeviklik; yine eşitse giriş sırası', () => {
    const list = [
      { id: 'a', initiative: 12, dexMod: 1 },
      { id: 'b', initiative: 18, dexMod: 0 },
      { id: 'c', initiative: 12, dexMod: 3 },
      { id: 'd', initiative: 12, dexMod: 1 },
    ];
    expect(sortInitiative(list).map((x) => x.id)).toEqual(['b', 'c', 'a', 'd']);
  });
});

describe('hpBand', () => {
  it('dört kademe döndürür', () => {
    expect(hpBand(20, 20)).toBe('healthy');
    expect(hpBand(19, 20)).toBe('hurt');
    expect(hpBand(10, 20)).toBe('bloodied');
    expect(hpBand(0, 20)).toBe('down');
  });
});
