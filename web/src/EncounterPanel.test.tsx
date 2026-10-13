import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { DmView, MonsterCombatant } from '@masa/shared';
import { EncounterPanel } from './EncounterPanel';

const goblin: MonsterCombatant = {
  id: 'm1', kind: 'monster', monsterId: 'goblin', name: 'Goblin 1', ac: 15, hp: 7, maxHp: 7, tempHp: 0, dexMod: 2,
  initiative: null, conditions: [], revealName: true, revealHp: false, legendaryLeft: null, moved: 0, dashed: false,
};
const hero = {
  name: 'Aria', level: 4, ac: 16, maxHp: 24, hp: 24, tempHp: 0, speed: 30,
  abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 }, proficiency: 2, saveProficiencies: [],
  attacks: [], deathSaves: { successes: 0, failures: 0 }, dead: false,
} satisfies DmView['character'];
const view = (over: Partial<DmView> = {}): DmView => ({
  role: 'dm', code: 'ABC123', log: [], board: { mapId: null, visible: false, tokens: [], widthFt: 100, aspect: 0.75, terrain: null, seed: 1, daylight: 'day' }, world: { mapId: null, aspect: 0.75, visible: false, x: 0.5, y: 0.5, region: null }, sheetId: null, character: hero,
  encounter: { id: 'e1', status: 'draft', round: 0, turnIndex: 0, combatants: [goblin] }, ...over,
});

it('rastgele üretim niyetini bölge, karakter seviyesi ve zorlukla gönderir', async () => {
  const send = vi.fn();
  render(<EncounterPanel view={view()} send={send} />);
  await userEvent.selectOptions(screen.getByLabelText('Bölge'), 'swamp');
  await userEvent.selectOptions(screen.getByLabelText('Zorluk'), 'hard');
  await userEvent.click(screen.getByRole('button', { name: 'Rastgele üret' }));
  expect(send).toHaveBeenCalledWith({ type: 'encounter.generate', region: 'swamp', level: 4, difficulty: 'hard' });
});

it('taslaktaki canavarı çıkarır ve savaşı başlatır', async () => {
  const send = vi.fn();
  render(<EncounterPanel view={view()} send={send} />);
  await userEvent.click(screen.getByRole('button', { name: 'Goblin 1 çıkar' }));
  await userEvent.click(screen.getByRole('button', { name: 'Savaşı başlat' }));
  expect(send.mock.calls.map((c) => c[0])).toEqual([
    { type: 'encounter.remove', combatantId: 'm1' },
    { type: 'encounter.start' },
  ]);
});

it('karakter kartı ya da canavar yokken başlatma düğmesi kapalıdır ve nedenini söyler', () => {
  const { rerender } = render(<EncounterPanel view={view({ character: null })} send={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Savaşı başlat' })).toBeDisabled();
  expect(screen.getByText('Oyuncu karakter kartını doldurmadan savaş başlatılamaz.')).toBeInTheDocument();
  rerender(<EncounterPanel view={view({ encounter: null })} send={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Savaşı başlat' })).toBeDisabled();
  expect(screen.getByText('Karşılaşma boş. Kitaptan canavar ekle ya da rastgele üret.')).toBeInTheDocument();
});

it('savaşçıları haritaya dizer', async () => {
  const send = vi.fn();
  render(<EncounterPanel view={view()} send={send} />);
  await userEvent.click(screen.getByRole('button', { name: 'Savaşçıları diz' }));
  expect(send).toHaveBeenCalledWith({ type: 'board.placeCombatants' });
});
