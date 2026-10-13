import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { LogEntry } from '@masa/shared';
import { DiceLog } from './DiceLog';

const entry = (n: number, over: Partial<LogEntry> = {}): LogEntry => ({
  id: `l${n}`, at: new Date(2026, 9, 13, 14, 5 + n).getTime(), actor: 'player', visibility: 'public', kind: 'roll', text: `Aria d20 attı → ${n}`, ...over,
});

it('günlük sabit boyutlu bir sohbet kutusudur; satırlar kimin ve ne zaman attığını söyler', () => {
  const log = [entry(1), entry(2, { actor: 'dm', visibility: 'dm' })];
  render(<DiceLog log={log} send={vi.fn()} canSecret />);
  const list = screen.getByRole('list', { name: 'Günlük' });
  expect(list.children).toHaveLength(2);
  expect(list.children[0]).toHaveTextContent('Oyuncu');
  expect(list.children[0]).toHaveTextContent('14:06');
  expect(list.children[1]).toHaveTextContent('DM');
  expect(list.children[1]).toHaveTextContent('yalnızca DM');
});

it('okuyucu yukarıdaysa yeni satır onu aşağı çekmez; "yeni" düğmesi çıkar ve alta indirir', async () => {
  const log = [entry(1), entry(2)];
  const { rerender } = render(<DiceLog log={log} send={vi.fn()} canSecret={false} />);
  const list = screen.getByRole('list', { name: 'Günlük' });
  Object.defineProperty(list, 'scrollHeight', { configurable: true, value: 500 });
  Object.defineProperty(list, 'clientHeight', { configurable: true, value: 100 });
  list.scrollTop = 0;
  list.dispatchEvent(new Event('scroll'));

  rerender(<DiceLog log={[...log, entry(3)]} send={vi.fn()} canSecret={false} />);
  expect(list.scrollTop).toBe(0);
  const more = await screen.findByRole('button', { name: '1 yeni ↓' });
  await userEvent.click(more);
  expect(list.scrollTop).toBe(500);
  expect(screen.queryByRole('button', { name: /yeni/ })).not.toBeInTheDocument();
});
