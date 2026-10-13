import { describe, expect, it } from 'vitest';
import { createLimiter, newCode, readCookie, safeEqual, sign, verify } from './auth';

describe('auth', () => {
  it('imzalı oturumu doğrular; kod ya da sır değişince geçersiz sayar', () => {
    const token = sign('dm', 'ABC123', 'sır');
    expect(verify(token, 'ABC123', 'sır')).toBe('dm');
    expect(verify(sign('player', 'ABC123', 'sır'), 'ABC123', 'sır')).toBe('player');
    expect(verify(token, 'ZZZ999', 'sır')).toBeNull();
    expect(verify(token, 'ABC123', 'başka')).toBeNull();
    expect(verify('dm.sahte', 'ABC123', 'sır')).toBeNull();
    expect(verify(undefined, 'ABC123', 'sır')).toBeNull();
  });
  it('oyuncu imzası DM rolüne çevrilemez', () => {
    const forged = sign('player', 'ABC123', 'sır').replace('player.', 'dm.');
    expect(verify(forged, 'ABC123', 'sır')).toBeNull();
  });
  it('çerezi başlıktan okur', () => {
    expect(readCookie('a=1; masa_session=dm.x%3Dy; b=2', 'masa_session')).toBe('dm.x=y');
    expect(readCookie(undefined, 'masa_session')).toBeUndefined();
  });
  it('safeEqual farklı uzunlukta da çalışır', () => {
    expect(safeEqual('masa', 'masa')).toBe(true);
    expect(safeEqual('masa', 'masaa')).toBe(false);
  });
  it('masa kodu altı karakterdir ve karışan harfleri içermez', () => {
    expect(newCode()).toMatch(/^[A-HJ-NP-Z2-9]{6}$/);
  });
  it('sınırlayıcı pencere içinde fazla denemeyi reddeder, pencere geçince açar', () => {
    let now = 0;
    const allow = createLimiter(2, 1000, () => now);
    expect([allow('ip'), allow('ip'), allow('ip')]).toEqual([true, true, false]);
    expect(allow('başka')).toBe(true);
    now = 1001;
    expect(allow('ip')).toBe(true);
  });
});
