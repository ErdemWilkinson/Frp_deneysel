import { describe, expect, it } from 'vitest';
import { translateAttack } from './translate';

describe('translateAttack', () => {
  it('yakın dövüş saldırı satırını sayıları koruyarak çevirir', () => {
    expect(translateAttack('Melee Weapon Attack: +4 to hit, reach 5 ft., one target. Hit: 5 (1d6 + 2) slashing damage.'))
      .toBe('Yakın Dövüş Silah Saldırısı: isabet için +4, erişim 5 ft., tek hedef. İsabet: 5 (1d6 + 2) kesici hasar.');
  });
  it('menzilli saldırıyı ve ikinci hasar türünü çevirir', () => {
    expect(translateAttack('Ranged Weapon Attack: +6 to hit, range 80/320 ft., one creature. Hit: 7 (1d8 + 3) piercing damage plus 3 (1d6) fire damage.'))
      .toBe('Menzilli Silah Saldırısı: isabet için +6, menzil 80/320 ft., tek yaratık. İsabet: 7 (1d8 + 3) delici hasar artı 3 (1d6) ateş hasar.');
  });
  it('fırlatılabilir silahı ve zarsız sabit hasarı çevirir', () => {
    expect(translateAttack('Melee or Ranged Weapon Attack: +2 to hit, reach 5 ft. or range 20/60 ft., one target. Hit: 1 piercing damage.'))
      .toBe('Yakın Dövüş ya da Menzilli Silah Saldırısı: isabet için +2, erişim 5 ft. ya da menzil 20/60 ft., tek hedef. İsabet: 1 delici hasar.');
  });
  it('ek kural içeren satırı kendi başına çevirmez', () => {
    expect(translateAttack('Melee Weapon Attack: +5 to hit, reach 5 ft., one target. Hit: 10 (2d6 + 3) slashing damage. If the target is a creature, it is grappled.'))
      .toBeNull();
    expect(translateAttack('The dragon exhales fire.')).toBeNull();
  });
});
