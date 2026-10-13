import { expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RaceBook, SpellBook } from './Reference';

it('büyü hileleri kitabında yalnızca 0. seviye büyüler vardır ve arama çalışır', async () => {
  render(<SpellBook cantrips />);
  expect(screen.getByRole('heading', { name: 'Büyü hileleri kitabı' })).toBeInTheDocument();
  expect(screen.getByRole('article', { name: 'Ateş Oku' })).toBeInTheDocument();
  expect(screen.queryByRole('article', { name: 'Ateş Topu' })).not.toBeInTheDocument();
  await userEvent.type(screen.getByLabelText('Ara'), 'don');
  expect(screen.getByRole('article', { name: 'Don Işını' })).toBeInTheDocument();
  expect(screen.queryByRole('article', { name: 'Ateş Oku' })).not.toBeInTheDocument();
});

it('büyüler kitabı seviyeye göre süzülür ve bileşenleri açık yazar', async () => {
  render(<SpellBook cantrips={false} />);
  expect(screen.queryByRole('article', { name: 'Ateş Oku' })).not.toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText('Seviye'), '3');
  const card = screen.getByRole('article', { name: 'Ateş Topu' });
  expect(within(card).getByText('Sözel, Hareket, Malzeme')).toBeInTheDocument();
  expect(screen.queryByRole('article', { name: 'Büyülü Ok' })).not.toBeInTheDocument();
});

it('ırklar kitabı tüm ırkları ve alt ırkları listeler', () => {
  render(<RaceBook />);
  expect(screen.getByText('Cüce')).toBeInTheDocument();
  expect(screen.getByText('Dağ cücesi')).toBeInTheDocument();
  expect(screen.getByText('İnsan')).toBeInTheDocument();
});
