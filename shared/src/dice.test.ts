import { describe, expect, it } from 'vitest';
import { DiceError, parseDice, rollD20, rollExpr } from './dice';
import { scripted } from './testing';

describe('parseDice', () => {
  it('zar ve değiştiriciyi ayrıştırır', () => {
    expect(parseDice('2d6+3')).toEqual({ terms: [{ count: 2, sides: 6 }], modifier: 3 });
    expect(parseDice(' D20 - 1 ')).toEqual({ terms: [{ count: 1, sides: 20 }], modifier: -1 });
    expect(parseDice('1d8+1d6+2')).toEqual({
      terms: [{ count: 1, sides: 8 }, { count: 1, sides: 6 }],
      modifier: 2,
    });
    expect(parseDice('1')).toEqual({ terms: [], modifier: 1 });
  });

  it.each(['', '2d', 'd', '0d6', '1d1', '9999d9999', '101d6', '1d6;drop', '2d6-1d4', 'abc', '1d6++2'])(
    'bozuk ifadeyi reddeder: %s',
    (bad) => {
      expect(() => parseDice(bad)).toThrow(DiceError);
    },
  );

  it('metin olmayan girdiyi reddeder', () => {
    expect(() => parseDice({} as unknown as string)).toThrow(DiceError);
  });
});

describe('rollExpr', () => {
  it('zarları toplar ve değiştiriciyi ekler', () => {
    expect(rollExpr('2d6+3', scripted(4, 5))).toEqual({
      dice: [{ sides: 6, value: 4 }, { sides: 6, value: 5 }],
      modifier: 3,
      total: 12,
    });
  });

  it('kritik vuruşta zar sayısını ikiye katlar, değiştiriciyi katlamaz', () => {
    expect(rollExpr('1d8+2', scripted(3, 7), { critical: true }).total).toBe(12);
  });
});

describe('rollD20', () => {
  it('avantajda yükseği, dezavantajda düşüğü tutar', () => {
    expect(rollD20(scripted(11), 'normal')).toEqual({ rolls: [11], kept: 11 });
    expect(rollD20(scripted(4, 17), 'advantage')).toEqual({ rolls: [4, 17], kept: 17 });
    expect(rollD20(scripted(4, 17), 'disadvantage')).toEqual({ rolls: [4, 17], kept: 4 });
  });
});
