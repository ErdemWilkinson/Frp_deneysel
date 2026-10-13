import type { Region } from './types';

/**
 * Ana haritadaki bir noktanın rengine bakıp arazi türünü tahmin eder (renkler 0–255).
 * Çizilmiş haritalarda renk dili ortaktır: yeşil orman, sarı çöl, mavi su, beyaz kar, gri dağ.
 * Tahmindir; DM her zaman elle değiştirebilir.
 */
export function guessRegion(r: number, g: number, b: number): Region {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  const value = max;
  const saturation = max === 0 ? 0 : (max - min) / max;
  let hue = 0;
  if (max !== min) {
    const d = (max - min) * 255;
    if (max * 255 === r) hue = ((g - b) / d + 6) % 6;
    else if (max * 255 === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
  }

  if (saturation < 0.16) return value > 0.78 ? 'arctic' : 'mountain';
  if (hue >= 165 && hue < 265) return value > 0.82 && saturation < 0.3 ? 'arctic' : 'sea';
  if (hue >= 65 && hue < 165) {
    if (value < 0.34 && saturation < 0.45) return 'swamp';
    return value < 0.52 ? 'forest' : 'grassland';
  }
  if (hue >= 40 && hue < 65) {
    if (value < 0.45) return 'swamp';
    return saturation > 0.38 && value > 0.62 ? 'desert' : 'grassland';
  }
  // Kırmızı, turuncu, kahverengi: parlaksa çöl ya da kanyon, koyuysa kayalık.
  if (hue < 40 || hue >= 330) return value > 0.55 && saturation > 0.35 ? 'desert' : 'mountain';
  return 'planar';
}

/** Tohumdan hep aynı sayı dizisini üreten küçük üreteç; savaş alanı iki ekranda da aynı çizilsin diye. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
