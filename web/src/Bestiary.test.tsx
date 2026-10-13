import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { Monster } from '@masa/shared';
import { Bestiary } from './Bestiary';

const base = {
  size: 'Small', type: 'humanoid', ac: 15, hp: 7, hitDice: '2d6', speed: '30 ft.',
  abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 }, saves: {}, skills: {},
  resistances: [], immunities: [], vulnerabilities: [], defenseNotes: [], conditionImmunities: [],
  senses: '', languages: '', cr: 0.25, xp: 50, traits: [], legendaryActions: [], legendaryCount: 0,
} satisfies Partial<Monster>;
const goblin: Monster = {
  ...base, id: 'goblin', name: { tr: 'Goblin', en: 'Goblin' }, regions: ['forest'],
  actions: [{ name: { tr: 'Pala', en: 'Scimitar' }, text: { tr: 'Yakın dövüş saldırısı.', en: 'Melee.' },
    attack: { bonus: 4, damage: [{ dice: '1d6+2', type: 'slashing' }] } }],
};
const shark: Monster = {
  ...base, id: 'shark', name: { tr: null, en: 'Reef Shark' }, type: 'beast', cr: 0.5, regions: ['underwater'], actions: [],
};
const list = () => screen.getByRole('list', { name: 'Canavarlar' });

it('bölgeye ve ada göre süzer', async () => {
  render(<Bestiary monsters={[goblin, shark]} send={vi.fn()} onRegions={vi.fn()} />);
  expect(within(list()).getAllByRole('listitem')).toHaveLength(2);
  await userEvent.selectOptions(screen.getByLabelText('Bölge'), 'underwater');
  expect(within(list()).getAllByRole('listitem').map((li) => li.textContent)).toEqual([expect.stringContaining('Reef Shark')]);
  await userEvent.selectOptions(screen.getByLabelText('Bölge'), '');
  await userEvent.type(screen.getByLabelText('Ara'), 'gob');
  expect(within(list()).getAllByRole('listitem')).toHaveLength(1);
});

it('seçilen canavarın stat block değerlerini ve eylemlerini gösterir', async () => {
  render(<Bestiary monsters={[goblin, shark]} send={vi.fn()} onRegions={vi.fn()} />);
  await userEvent.click(within(list()).getByRole('button', { name: /Goblin/ }));
  const block = screen.getByRole('region', { name: 'Goblin' });
  expect(within(block).getByText(/Zırh sınıfı 15/)).toBeInTheDocument();
  expect(within(block).getByText(/Pala/)).toBeInTheDocument();
  expect(within(block).getByText(/\+4, 1d6\+2 kesici/)).toBeInTheDocument();
});

it('karşılaşmaya ekleme niyetini adet ve can puanı kipiyle gönderir', async () => {
  const send = vi.fn();
  render(<Bestiary monsters={[goblin]} send={send} onRegions={vi.fn()} />);
  await userEvent.click(within(list()).getByRole('button', { name: /Goblin/ }));
  await userEvent.clear(screen.getByLabelText('Adet'));
  await userEvent.type(screen.getByLabelText('Adet'), '3');
  await userEvent.click(screen.getByRole('button', { name: 'Karşılaşmaya ekle' }));
  expect(send).toHaveBeenCalledWith({ type: 'encounter.addMonster', monsterId: 'goblin', count: 3, hpMode: 'average' });
});

it('bölge etiketi değişince niyeti gönderir ve üst bileşene bildirir', async () => {
  const send = vi.fn();
  const onRegions = vi.fn();
  render(<Bestiary monsters={[goblin]} send={send} onRegions={onRegions} />);
  await userEvent.click(within(list()).getByRole('button', { name: /Goblin/ }));
  await userEvent.click(screen.getByRole('checkbox', { name: 'Şehir' }));
  expect(send).toHaveBeenCalledWith({ type: 'monster.setRegions', monsterId: 'goblin', regions: ['forest', 'urban'] });
  expect(onRegions).toHaveBeenCalledWith('goblin', ['forest', 'urban']);
});
