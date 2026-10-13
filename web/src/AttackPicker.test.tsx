import { expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AttackPicker } from './AttackPicker';

const abilities = { str: 10, dex: 12, con: 12, int: 16, wis: 10, cha: 10 };
const base = { race: 'İnsan', level: 1, abilities, proficiency: 2, full: false };

it('sınıf seçilmediyse seçici uyarır', () => {
  render(<AttackPicker {...base} className="" attacks={[]} onAdd={vi.fn()} />);
  expect(screen.getByText(/önce sınıfını seç/)).toBeInTheDocument();
});

it('sihirbaz büyü hilesi sınırına ulaşınca yeni hile seçilemez', async () => {
  const onAdd = vi.fn();
  const { rerender } = render(<AttackPicker {...base} className="Sihirbaz" attacks={[]} onAdd={onAdd} />);
  expect(screen.getByRole('status')).toHaveTextContent('Büyü hilesi: 0 / 3');
  await userEvent.selectOptions(screen.getByLabelText('Büyü seç'), 'fire-bolt');
  await userEvent.click(screen.getByRole('button', { name: 'Büyüyü ekle' }));
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Ateş Oku', bonus: 5, damage: '1d10' }));

  const full = ['Ateş Oku', 'Don Işını', 'Elektrik Pençesi'].map((name) => ({ name, bonus: 5, damage: '1d8', type: 'fire' as const, range: 60 }));
  rerender(<AttackPicker {...base} className="Sihirbaz" attacks={full} onAdd={onAdd} />);
  expect(screen.getByRole('status')).toHaveTextContent('Büyü hilesi: 3 / 3');
  expect(screen.queryByRole('option', { name: /Asit Sıçraması/ })).not.toBeInTheDocument();
});

it('savaşçı büyü seçemez, silah seçer', async () => {
  const onAdd = vi.fn();
  render(<AttackPicker {...base} className="Savaşçı" attacks={[]} onAdd={onAdd} />);
  expect(screen.getByText(/büyü yapamaz/)).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText('Silah seç'), 'Uzun Kılıç');
  await userEvent.click(screen.getByRole('button', { name: 'Silahı ekle' }));
  expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ name: 'Uzun Kılıç', bonus: 2, damage: '1d8' }));
});
