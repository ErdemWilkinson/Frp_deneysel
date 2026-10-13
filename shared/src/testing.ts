import type { Rng } from './dice';

/** Sırayla verilen yüzleri döndüren zar kaynağı. Yüz zara sığmazsa ya da liste biterse hata verir. */
export function scripted(...faces: number[]): Rng {
  let i = 0;
  return (sides) => {
    const face = faces[i++];
    if (face === undefined) throw new Error('scripted: zar listesi bitti');
    if (face < 1 || face > sides) throw new Error(`scripted: ${face}, d${sides} için geçersiz`);
    return face;
  };
}
