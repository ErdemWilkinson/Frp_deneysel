import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { Character } from '@masa/shared';
import { Inventory, QuickBag } from './Inventory';

const hero: Character = {
  name: 'Aria', level: 3, ac: 16, maxHp: 24, hp: 24, tempHp: 0, speed: 30,
  abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 }, proficiency: 2, saveProficiencies: [], attacks: [],
  inventory: [
    { id: 'i1', name: 'Meşale', qty: 2, note: 'Katranlı', light: 20, lit: false },
    { id: 'i2', name: 'Kürek', qty: 1, note: '', light: 0, lit: false },
  ],
  deathSaves: { successes: 0, failures: 0 }, dead: false,
};

it('çantadaki eşyaları, notu ve ışığı gösterir; ışıksız eşyada yakma anahtarı yoktur', () => {
  render(<Inventory character={hero} send={vi.fn()} />);
  const list = within(screen.getByRole('list'));
  expect(list.getByText('Meşale')).toBeInTheDocument();
  expect(list.getByText('Katranlı')).toBeInTheDocument();
  expect(list.getByText('20 fit ışık')).toBeInTheDocument();
  expect(screen.getByRole('checkbox', { name: 'Meşale yanıyor' })).not.toBeChecked();
  expect(screen.queryByRole('checkbox', { name: 'Kürek yanıyor' })).not.toBeInTheDocument();
});

it('formdan doğrudan eşya ekler ve formu temizler', async () => {
  const send = vi.fn();
  render(<Inventory character={hero} send={send} />);
  await userEvent.type(screen.getByLabelText('Eşya adı'), 'Gümüş anahtar');
  await userEvent.clear(screen.getByLabelText('Adet'));
  await userEvent.type(screen.getByLabelText('Adet'), '3');
  await userEvent.selectOptions(screen.getByLabelText('Işık yarıçapı'), '10');
  await userEvent.click(screen.getByRole('button', { name: 'Çantaya ekle' }));
  expect(send).toHaveBeenCalledWith({ type: 'inventory.add', name: 'Gümüş anahtar', qty: 3, note: undefined, light: 10 });
  expect(screen.getByLabelText('Eşya adı')).toHaveValue('');
});

it('hızlı ekleme düğmesi ışık yarıçapını da gönderir', async () => {
  const send = vi.fn();
  render(<Inventory character={hero} send={send} />);
  await userEvent.click(screen.getByRole('button', { name: 'Fener' }));
  expect(send).toHaveBeenCalledWith({ type: 'inventory.add', name: 'Fener', light: 30 });
});

it('adedi değiştirir, eşyayı yakar ve çıkarır', async () => {
  const send = vi.fn();
  render(<Inventory character={hero} send={send} />);
  await userEvent.click(screen.getByRole('button', { name: 'Meşale adedini artır' }));
  await userEvent.click(screen.getByRole('button', { name: 'Meşale adedini azalt' }));
  await userEvent.click(screen.getByRole('checkbox', { name: 'Meşale yanıyor' }));
  await userEvent.click(screen.getByRole('button', { name: 'Kürek çıkar' }));
  expect(send.mock.calls.map((c) => c[0])).toEqual([
    { type: 'inventory.update', itemId: 'i1', qty: 3 },
    { type: 'inventory.update', itemId: 'i1', qty: 1 },
    { type: 'inventory.update', itemId: 'i1', lit: true },
    { type: 'inventory.remove', itemId: 'i2' },
  ]);
});

it('boş çantada bunu söyler', () => {
  render(<Inventory character={{ ...hero, inventory: [] }} send={vi.fn()} />);
  expect(screen.getByText('Çanta boş.')).toBeInTheDocument();
});

it('hızlı çanta eşyaları listeler, azaltır ve ışıklıyı yakar', async () => {
  const send = vi.fn();
  const bag = [{ id: 'i1', name: 'Meşale', qty: 2, note: '', light: 20, lit: false }, { id: 'i2', name: 'İp', qty: 1, note: '', light: 0, lit: false }];
  render(<QuickBag character={{ ...hero, inventory: bag }} send={send} />);
  await userEvent.click(screen.getByRole('button', { name: 'Meşale yak' }));
  expect(send).toHaveBeenLastCalledWith({ type: 'inventory.update', itemId: 'i1', lit: true });
  await userEvent.click(screen.getByRole('button', { name: 'Meşale hızlı azalt' }));
  expect(send).toHaveBeenLastCalledWith({ type: 'inventory.update', itemId: 'i1', qty: 1 });
  expect(screen.queryByRole('button', { name: 'İp yak' })).not.toBeInTheDocument();
});
