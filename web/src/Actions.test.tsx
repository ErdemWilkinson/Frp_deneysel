import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Character } from '@masa/shared';
import { ActionDeck } from './Actions';

const hero = {
  name: 'Aria', attacks: [{ name: 'Uzun Kılıç', bonus: 5, damage: '1d8+3', type: 'slashing', range: 5 }],
} as unknown as Character;

it('saldırı ve hasar zarları eylemin adıyla atılır', async () => {
  const send = vi.fn();
  render(<ActionDeck character={hero} send={send} mode="normal" />);
  await userEvent.click(screen.getByRole('button', { name: /Uzun Kılıç saldırı: 1d20\+5/ }));
  expect(send).toHaveBeenLastCalledWith({ type: 'roll', expr: '1d20+5', mode: 'normal', label: 'Uzun Kılıç saldırı' });
  await userEvent.click(screen.getByRole('button', { name: /Uzun Kılıç hasar: 1d8\+3/ }));
  expect(send).toHaveBeenLastCalledWith({ type: 'roll', expr: '1d8+3', mode: 'normal', label: 'Uzun Kılıç hasar' });
});

it('büyü zarları aranır ve gizli atış DM için işaretlenir', async () => {
  const send = vi.fn();
  render(<ActionDeck character={null} send={send} mode="advantage" secret />);
  await userEvent.click(screen.getByText(/Büyü zarları/));
  await userEvent.type(screen.getByLabelText('Büyü ara'), 'ateş topu');
  await userEvent.click(screen.getByRole('button', { name: /Ateş Topu: 8d6/ }));
  expect(send).toHaveBeenCalledWith({ type: 'roll', expr: '8d6', mode: 'advantage', label: 'Ateş Topu', secret: true });
});

it('hayali savaşta saldırı d20 zarı yoktur, hasar zarı kalır', () => {
  render(<ActionDeck character={hero} send={vi.fn()} mode="normal" theater />);
  expect(screen.queryByRole('button', { name: /Uzun Kılıç saldırı/ })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Uzun Kılıç hasar/ })).toBeInTheDocument();
});

it('karakter verilmediyse (DM) oyuncunun saldırıları listelenmez', () => {
  render(<ActionDeck character={undefined} send={vi.fn()} mode="normal" secret />);
  expect(screen.queryByRole('list', { name: 'Saldırılar' })).not.toBeInTheDocument();
  expect(screen.queryByText(/saldırı yok/)).not.toBeInTheDocument();
});
