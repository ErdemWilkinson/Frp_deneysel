import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { PlayerView } from '@masa/shared';
import { CombatTrack } from './CombatTrack';

const view: PlayerView = {
  role: 'player', code: 'ABC123', log: [], board: null, world: null, sheetId: null,
  character: {
    name: 'Aria', level: 3, ac: 16, maxHp: 24, hp: 24, tempHp: 0, speed: 30,
    abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 }, proficiency: 2, saveProficiencies: [],
    attacks: [{ name: 'Uzun Kılıç', bonus: 5, damage: '1d8+3', type: 'slashing', range: 5 }],
    deathSaves: { successes: 0, failures: 0 }, dead: false,
  },
  encounter: {
    round: 2, phase: 'combat', theater: false,
    combatants: [
      { id: 'c1', kind: 'character', name: 'Aria', initiative: 16, conditions: [], band: 'healthy', hp: 24, maxHp: 24, current: true, moveLeft: 30 },
      { id: 'm1', kind: 'monster', name: 'Bilinmeyen yaratık', initiative: 12, conditions: ['prone'], band: 'bloodied', hp: null, maxHp: null, current: false, moveLeft: null },
      { id: 'm2', kind: 'monster', name: 'İskelet 1', initiative: 7, conditions: [], band: 'down', hp: 0, maxHp: 13, current: false, moveLeft: null },
    ],
  },
};

it('gizli can puanı yerine kademeyi, açık can puanı için sayıyı gösterir', () => {
  render(<CombatTrack view={view} send={vi.fn()} />);
  const hidden = screen.getByText('Bilinmeyen yaratık').closest('li')!;
  expect(within(hidden).getByText('ağır yaralı')).toBeInTheDocument();
  expect(within(hidden).getByText('yere düşmüş')).toBeInTheDocument();
  expect(within(screen.getByText('İskelet 1').closest('li')!).getByText('0/13 can puanı')).toBeInTheDocument();
});

it('ayaktaki canavara saldırı düğmesi seçilen zar kipiyle niyet gönderir', async () => {
  const send = vi.fn();
  render(<CombatTrack view={view} send={send} />);
  await userEvent.selectOptions(screen.getByLabelText('Zar kipi'), 'advantage');
  await userEvent.click(within(screen.getByText('Bilinmeyen yaratık').closest('li')!).getByRole('button', { name: 'Uzun Kılıç' }));
  expect(send).toHaveBeenCalledWith({ type: 'character.attack', attackIndex: 0, targetId: 'm1', mode: 'advantage' });
});

it('düşmüş canavara saldırı düğmesi göstermez', () => {
  render(<CombatTrack view={view} send={vi.fn()} />);
  expect(within(screen.getByText('İskelet 1').closest('li')!).queryByRole('button')).toBeNull();
});

it('sıra bitirme düğmesi yalnızca oyuncunun sırasında görünür', () => {
  const { rerender } = render(<CombatTrack view={view} send={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Sıramı bitir' })).toBeInTheDocument();
  const theirs = structuredClone(view);
  theirs.encounter!.combatants[0]!.current = false;
  theirs.encounter!.combatants[1]!.current = true;
  rerender(<CombatTrack view={theirs} send={vi.fn()} />);
  expect(screen.queryByRole('button', { name: 'Sıramı bitir' })).toBeNull();
});

it('savaş yokken bunu söyler', () => {
  render(<CombatTrack view={{ ...view, encounter: null }} send={vi.fn()} />);
  expect(screen.getByText('Şu an savaş yok.')).toBeInTheDocument();
});
