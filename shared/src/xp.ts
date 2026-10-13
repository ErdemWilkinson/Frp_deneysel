// Tecrübe puanı: seviye eşikleri (SRD 5.1).
/** Dizinin n. elemanı, n + 1. seviyeye ulaşmak için gereken toplam tecrübe puanıdır. */
export const XP_THRESHOLDS = [
  0, 300, 900, 2700, 6500, 14000, 23000, 34000, 48000, 64000,
  85000, 100000, 120000, 140000, 165000, 195000, 225000, 265000, 305000, 355000,
] as const;

/** Bu tecrübe puanıyla ulaşılabilecek en yüksek seviye (1–20). */
export function levelForXp(xp: number): number {
  let level = 1;
  for (let i = 0; i < XP_THRESHOLDS.length; i += 1) if (xp >= XP_THRESHOLDS[i]!) level = i + 1;
  return level;
}

/** Bir sonraki seviyenin eşiği; 20. seviyede null. */
export const nextLevelXp = (level: number): number | null => XP_THRESHOLDS[Math.min(20, Math.max(1, level))] ?? null;
