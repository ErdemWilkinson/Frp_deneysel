import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import type { Role } from '@masa/shared';

export const COOKIE = 'masa_session';

// 0/O, 1/I gibi karışan karakterler yok.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const newCode = (): string =>
  Array.from({ length: 6 }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

/** Uzunluk farkını da sızdırmayan karşılaştırma: iki tarafın özetini karşılaştırır. */
export function safeEqual(a: string, b: string): boolean {
  const digest = (s: string) => createHmac('sha256', 'masa-compare').update(s).digest();
  return timingSafeEqual(digest(a), digest(b));
}

export function sign(role: Role, code: string, secret: string): string {
  return `${role}.${createHmac('sha256', secret).update(`${role}:${code}`).digest('base64url')}`;
}

export function verify(token: string | undefined, code: string, secret: string): Role | null {
  if (!token) return null;
  for (const role of ['dm', 'player'] as const) {
    if (safeEqual(token, sign(role, code, secret))) return role;
  }
  return null;
}

export function readCookie(header: string | undefined, name: string): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const [key, ...rest] = part.trim().split('=');
    if (key === name) return decodeURIComponent(rest.join('='));
  }
  return undefined;
}

/** Tarayıcıdan gelen isteğin kendi sitemizden geldiğini doğrular. Origin başlığı yoksa (tarayıcı dışı istemci) geçer. */
export function sameOrigin(origin: string | undefined, host: string | undefined): boolean {
  if (!origin) return true;
  try { return new URL(origin).host === host; } catch { return false; }
}

const SIGNATURES: [mime: string, test: (b: Uint8Array) => boolean][] = [
  ['image/png', (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47],
  ['image/jpeg', (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff],
  ['image/webp', (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50],
  ['application/pdf', (b) => b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46],
];
/** Dosya türünü istemcinin beyanından değil, ilk baytlarından belirler. Tanınmayan tür için null. */
export function sniffMime(bytes: Uint8Array): string | null {
  return SIGNATURES.find(([, test]) => test(bytes))?.[0] ?? null;
}

export function createLimiter(max: number, windowMs: number, now: () => number = Date.now) {
  const hits = new Map<string, number[]>();
  return (key: string): boolean => {
    const t = now();
    const recent = (hits.get(key) ?? []).filter((at) => t - at < windowMs);
    recent.push(t);
    hits.set(key, recent);
    return recent.length <= max;
  };
}
