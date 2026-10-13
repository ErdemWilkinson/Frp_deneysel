import type { CSSProperties } from 'react';

export type DieTone = 'normal' | 'crit' | 'hit' | 'miss';

type Vec = [number, number, number];
const PHI = (1 + Math.sqrt(5)) / 2;
const sub = (a: Vec, b: Vec): Vec => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec, b: Vec): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec): Vec => { const l = Math.hypot(...a); return [a[0] / l, a[1] / l, a[2] / l]; };
const css = (m: number[]): string => `matrix3d(${m.map((x) => +x.toFixed(5)).join(',')})`;

export interface DieFace {
  number: number;
  /** Yüzün kendi eksenleri: sağ, aşağı ve dışa bakan normal. */
  u: Vec; v: Vec; n: Vec;
  /** Yüzü gövdedeki yerine oturtan dönüş. */
  place: string;
  /** Gövdeyi, bu yüz dik ve izleyiciye dönük duracak biçimde çeviren dönüş. */
  show: string;
}

/** Yirmi yüzlünün köşelerinden yüzlerini kurar; karşılıklı yüzlerin toplamı gerçek zardaki gibi 21'dir. */
function build(): DieFace[] {
  const verts: Vec[] = [];
  for (const a of [-1, 1]) for (const b of [-PHI, PHI]) verts.push([0, a, b], [a, b, 0], [b, 0, a]);
  const near = (a: Vec, b: Vec): boolean => Math.abs(Math.hypot(...sub(a, b)) - 2) < 1e-6;
  const faces: Omit<DieFace, 'number'>[] = [];
  for (let i = 0; i < 12; i += 1) for (let j = i + 1; j < 12; j += 1) for (let k = j + 1; k < 12; k += 1) {
    const [a, b, c] = [verts[i]!, verts[j]!, verts[k]!];
    if (!near(a, b) || !near(b, c) || !near(a, c)) continue;
    const centre: Vec = [(a[0] + b[0] + c[0]) / 3, (a[1] + b[1] + c[1]) / 3, (a[2] + b[2] + c[2]) / 3];
    const n = unit(centre);
    const v = unit(sub(centre, a));
    const u = cross(v, n);
    faces.push({
      u, v, n,
      place: css([...u, 0, ...v, 0, ...n, 0, 0, 0, 0, 1]),
      show: css([u[0], v[0], n[0], 0, u[1], v[1], n[1], 0, u[2], v[2], n[2], 0, 0, 0, 0, 1]),
    });
  }
  const numbers = new Array<number>(faces.length).fill(0);
  let next = 1;
  faces.forEach((f, i) => {
    if (numbers[i]) return;
    numbers[i] = next;
    numbers[faces.findIndex((g) => dot(f.n, g.n) < -0.999)] = 21 - next;
    next += 1;
  });
  return faces.map((f, i) => ({ ...f, number: numbers[i]! }));
}

export const FACES: DieFace[] = build();
/** Yüz merkezinin gövde merkezine uzaklığı, kenar uzunluğuna oranla. */
const INRADIUS = (PHI * PHI) / (2 * Math.sqrt(3));
const LIGHT = unit([-0.35, -0.6, 0.72]);

/** 1–20 arası sonuçta o sayının yüzü üste gelir; daha büyük toplamlar 20'nin yüzüne yazılır. */
export const faceFor = (value: number): number =>
  FACES.findIndex((f) => f.number === (Number.isInteger(value) && value >= 1 && value <= 20 ? value : 20));

/** Üç boyutlu d20. Değer değişince savrulur, sonucun yazdığı yüz izleyiciye dönük durur. */
export function Die({ value, tone = 'normal', size = 112 }: { value: number; tone?: DieTone; size?: number }) {
  const up = faceFor(value);
  const top = FACES[up]!;
  const edge = size * 0.5;
  // Işık sabit, zar döner: her yüzün parlaklığı son duruşundaki yönüne göre hesaplanır.
  const lit = (f: DieFace): number => {
    const turned: Vec = [dot(top.u, f.n), dot(top.v, f.n), dot(top.n, f.n)];
    return 0.62 + 0.42 * Math.max(0, dot(turned, LIGHT));
  };

  return (
    <div className={`die tone-${tone}`} aria-hidden="true" data-value={value}
      style={{ width: size, height: size, '--edge': `${edge}px` } as CSSProperties}>
      <div className="die-spin" key={value}>
        <div className="die-body" style={{ transform: top.show }}>
          {FACES.map((f, i) => (
            <span key={f.number} className={i === up ? 'die-face up' : 'die-face'}
              style={{ transform: `${f.place} translateZ(${(edge * INRADIUS).toFixed(2)}px)`, '--lit': `${Math.round(Math.min(1, lit(f)) * 100)}%` } as CSSProperties}>
              <b>{i === up ? value : f.number}</b>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
