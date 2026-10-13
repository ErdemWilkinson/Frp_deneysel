import { feetBetween, type Scale } from './movement';
import type { Character, Daylight } from './types';

/** Bir ışık kaynağının seçilebilir yarıçapları (ft). */
export const LIGHT_RADII = [0, 5, 10, 20, 30, 60] as const;

/** Günün saatine göre ortamın karanlığı (0 aydınlık, 1 simsiyah) ve üstüne binen renk. */
export const AMBIENT: Record<Daylight, { darkness: number; tint: string }> = {
  day: { darkness: 0, tint: '#000000' },
  morning: { darkness: 0.14, tint: '#ffb877' },
  evening: { darkness: 0.4, tint: '#5b2a4a' },
  night: { darkness: 0.74, tint: '#050c26' },
  dark: { darkness: 0.95, tint: '#000000' },
};

/** Gece ve karanlıkta, ışık dışında kalan jetonlar oyuncudan gizlenir. */
export const hidesUnlit = (daylight: Daylight): boolean => daylight === 'night' || daylight === 'dark';

/** Çantaya tek dokunuşla eklenen yaygın eşyalar; ışık verenler yakılınca çevreyi aydınlatır. */
export const QUICK_ITEMS: readonly { name: string; light: number }[] = [
  { name: 'Meşale', light: 20 },
  { name: 'Fener', light: 30 },
  { name: 'Kandil', light: 15 },
  { name: 'Mum', light: 5 },
  { name: 'Şifa iksiri', light: 0 },
  { name: 'İp (15 metre)', light: 0 },
  { name: 'Yiyecek', light: 0 },
  { name: 'Altın', light: 0 },
];

/** Karakterin yanan eşyalarından en geniş ışık yarıçapı (ft). */
export function carriedLight(hero: Pick<Character, 'inventory'> | null | undefined): number {
  return Math.max(0, ...(hero?.inventory ?? []).filter((i) => i.lit && i.light > 0).map((i) => i.light));
}

/** Jetonun yaydığı ışığın yarıçapı (ft): kendi ışığı ile taşıdığı yanan eşyanın büyüğü. */
export function tokenLight(token: { kind: string; light?: number }, hero: Pick<Character, 'inventory'> | null | undefined): number {
  return Math.max(token.light ?? 0, token.kind === 'character' ? carriedLight(hero) : 0);
}

export interface LightSource { x: number; y: number; r: number }

/** Noktanın bir ışık kaynağının aydınlık ya da loş alanında olup olmadığı. Işık, yarıçapı kadar daha loş yayılır. */
export function isLit(point: { x: number; y: number }, sources: readonly LightSource[], scale: Scale): boolean {
  return sources.some((s) => s.r > 0 && feetBetween(point, s, scale) <= s.r * 2);
}
