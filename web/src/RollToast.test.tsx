import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { LogEntry } from '@masa/shared';
import { RollToast, readRoll } from './RollToast';

const entry = (id: string, kind: LogEntry['kind'], text: string): LogEntry =>
  ({ id, at: 1, actor: 'dm', visibility: 'public', kind, text });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('zar sonucunu ve havasını günlük satırından okur', () => {
  expect(readRoll(entry('a', 'roll', 'DM zar attı: 2d6+3 → 12 [4, 5]'))).toEqual({ value: 12, tone: 'normal' });
  expect(readRoll(entry('b', 'attack', 'Aria, Goblin 1 hedefine Uzun Kılıç ile saldırdı: 17 — isabet, 7 kesici hasar')))
    .toEqual({ value: 17, tone: 'hit' });
  expect(readRoll(entry('c', 'attack', 'Aria, Goblin 1 hedefine Uzun Kılıç ile saldırdı: 25 — kritik isabet, 9 kesici hasar')))
    .toEqual({ value: 25, tone: 'crit' });
  expect(readRoll(entry('d', 'attack', 'Goblin 1, Aria hedefine Pala ile saldırdı: 8 — ıska'))).toEqual({ value: 8, tone: 'miss' });
  expect(readRoll(entry('e', 'save', 'Aria Çeviklik kurtarma zarı attı: 12'))).toBeNull();
  expect(readRoll(entry('f', 'turn', '1. raunt — sıra: Goblin 1'))).toBeNull();
});

it('açılışta eski kayıtları göstermez, sonradan gelen atışı gösterir ve kaldırır', () => {
  const first = [entry('a', 'roll', 'DM zar attı: 1d20 → 4 [4]')];
  const { rerender } = render(<RollToast log={first} />);
  expect(screen.queryByRole('status')).toBeNull();

  const next = [...first, entry('b', 'attack', 'Aria, Goblin 1 hedefine Kılıç ile saldırdı: 19 — isabet, 5 kesici hasar')];
  rerender(<RollToast log={next} />);
  expect(screen.getByRole('status')).toHaveTextContent('Aria, Goblin 1 hedefine Kılıç ile saldırdı: 19');

  act(() => { vi.advanceTimersByTime(3500); });
  expect(screen.queryByRole('status')).toBeNull();
});

it('zarı olmayan yeni kayıtta bildirim göstermez', () => {
  const { rerender } = render(<RollToast log={[]} />);
  rerender(<RollToast log={[entry('t', 'turn', '2. raunt — sıra: Aria')]} />);
  expect(screen.queryByRole('status')).toBeNull();
});
