import { render } from '@testing-library/react';
import { expect, it } from 'vitest';
import { Die, FACES, faceFor } from './Die';

const dot = (a: number[], b: number[]) => a[0]! * b[0]! + a[1]! * b[1]! + a[2]! * b[2]!;

it('yirmi yüzü 1–20 ile numaralar; karşılıklı yüzlerin toplamı 21 eder', () => {
  expect(FACES.map((f) => f.number).sort((a, b) => a - b)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  for (const f of FACES) {
    const opposite = FACES.find((g) => dot(f.n, g.n) < -0.999)!;
    expect(f.number + opposite.number).toBe(21);
  }
});

it('her yüzün eksenleri birbirine dik ve birim uzunlukta', () => {
  for (const f of FACES) {
    for (const axis of [f.u, f.v, f.n]) expect(dot(axis, axis)).toBeCloseTo(1, 6);
    expect(dot(f.u, f.v)).toBeCloseTo(0, 6);
    expect(dot(f.u, f.n)).toBeCloseTo(0, 6);
    expect(dot(f.v, f.n)).toBeCloseTo(0, 6);
  }
});

it('sonucun yazdığı yüzü izleyiciye çevirir', () => {
  const { container } = render(<Die value={7} />);
  const up = container.querySelector('.die-face.up')!;
  expect(up).toHaveTextContent('7');
  expect(container.querySelectorAll('.die-face')).toHaveLength(20);
  expect((container.querySelector('.die-body') as HTMLElement).style.transform).toBe(FACES[faceFor(7)]!.show);
});

it('yirmiden büyük toplamı üstteki yüze yazar', () => {
  const { container } = render(<Die value={25} tone="crit" />);
  expect(container.querySelector('.die-face.up')).toHaveTextContent('25');
  expect(container.querySelector('.die')).toHaveClass('tone-crit');
  expect(faceFor(25)).toBe(faceFor(20));
  expect(faceFor(0)).toBe(faceFor(20));
});
