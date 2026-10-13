import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { Gate } from './Gate';

const respond = (status: number, body: object) =>
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify(body), { status })));
afterEach(() => vi.unstubAllGlobals());

it('oyuncu masa koduyla girer', async () => {
  respond(200, { role: 'player', code: 'ABC123' });
  const onEnter = vi.fn();
  render(<Gate onEnter={onEnter} />);
  await userEvent.type(screen.getByLabelText('Masa kodu'), 'abc123');
  await userEvent.click(screen.getByRole('button', { name: 'Masaya otur' }));
  expect(onEnter).toHaveBeenCalledWith({ role: 'player', code: 'ABC123' });
  expect(vi.mocked(fetch).mock.calls[0]![0]).toBe('/api/login/player');
});

it('DM yanlış parolada sunucunun mesajını görür', async () => {
  respond(401, { error: 'Parola yanlış' });
  const onEnter = vi.fn();
  render(<Gate onEnter={onEnter} />);
  await userEvent.type(screen.getByLabelText('Parola'), 'x');
  await userEvent.click(screen.getByRole('button', { name: 'DM olarak gir' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('Parola yanlış');
  expect(onEnter).not.toHaveBeenCalled();
});

it('SRD atfını gösterir', () => {
  render(<Gate onEnter={vi.fn()} />);
  expect(screen.getByText(/System Reference Document 5\.1/)).toBeInTheDocument();
});
