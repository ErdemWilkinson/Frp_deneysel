import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { DmView, Monster } from '@masa/shared';
import { DmCombat } from './DmCombat';

const goblinDef = {
  id: 'goblin', name: { tr: 'Goblin', en: 'Goblin' }, legendaryCount: 0,
  size: 'Small', type: 'humanoid', ac: 15, hp: 7, hitDice: '2d6', speed: '30 ft.', cr: 0.25, xp: 50,
  abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 }, saves: { dex: 4 }, skills: { Stealth: 6 },
  resistances: [], immunities: ['poison'], vulnerabilities: [], conditionImmunities: [], regions: [],
  senses: 'darkvision 60 ft.', languages: 'Common, Goblin',
  actions: [
    { name: { tr: 'Pala', en: 'Scimitar' }, text: { tr: null, en: 'Melee Weapon Attack.' },
      attack: { bonus: 4, damage: [{ dice: '1d6+2', type: 'slashing', range: 5 }] } },
    { name: { tr: 'Çevik Kaçış', en: 'Nimble Escape' }, text: { tr: 'Çekilebilir ya da saklanabilir.', en: 'Disengage or Hide.' } },
  ],
  traits: [], legendaryActions: [], defenseNotes: [],
} as unknown as Monster;
const monsters = new Map([['goblin', goblinDef]]);

const view: DmView = {
  role: 'dm', code: 'ABC123', log: [], board: { mapId: null, visible: false, tokens: [], widthFt: 100, aspect: 0.75, terrain: null, seed: 1, daylight: 'day' }, world: { mapId: null, aspect: 0.75, visible: false, x: 0.5, y: 0.5, region: null }, sheetId: null,
  character: {
    name: 'Aria', level: 3, ac: 16, maxHp: 24, hp: 20, tempHp: 0, speed: 30,
    abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 }, proficiency: 2, saveProficiencies: [],
    attacks: [], deathSaves: { successes: 0, failures: 0 }, dead: false,
  },
  encounter: {
    id: 'e1', status: 'active', round: 1, turnIndex: 1,
    combatants: [
      { id: 'c1', kind: 'character', initiative: 16, conditions: [], moved: 0, dashed: false },
      { id: 'm1', kind: 'monster', monsterId: 'goblin', name: 'Goblin 1', ac: 15, hp: 5, maxHp: 7, tempHp: 0, dexMod: 2,
        initiative: 12, conditions: ['prone'], revealName: true, revealHp: false, legendaryLeft: null, moved: 0, dashed: false },
    ],
  },
};
const row = (name: string) => screen.getByText(name).closest('li')!;

it('canavarın tam değerlerini gösterir ve sıradakini işaretler', () => {
  render(<DmCombat view={view} monsters={monsters} send={vi.fn()} />);
  expect(within(row('Goblin 1')).getByText(/5\/7 can puanı/)).toBeInTheDocument();
  expect(within(row('Goblin 1')).getByText('Zırh sınıfı 15')).toBeInTheDocument();
  expect(row('Goblin 1')).toHaveAttribute('aria-current', 'true');
  expect(within(row('Aria')).getByText(/20\/24 can puanı/)).toBeInTheDocument();
});

it('saldırı eylemi düğme, metin eylemi açıklama olarak görünür', async () => {
  const send = vi.fn();
  render(<DmCombat view={view} monsters={monsters} send={send} />);
  await userEvent.click(within(row('Goblin 1')).getByRole('button', { name: 'Pala (+4)' }));
  expect(send).toHaveBeenCalledWith({ type: 'combat.monsterAttack', combatantId: 'm1', actionIndex: 0, mode: 'normal' });
  expect(within(row('Goblin 1')).queryByRole('button', { name: /Çevik Kaçış/ })).toBeNull();
  expect(within(row('Goblin 1')).getByText('Çekilebilir ya da saklanabilir.')).toBeInTheDocument();
});

it('DM canavarın kitaptaki bütün değerlerini satırında görür', () => {
  render(<DmCombat view={view} monsters={monsters} send={vi.fn()} />);
  const block = within(within(row('Goblin 1')).getByRole('region', { name: 'Goblin' }));
  expect(block.getByText(/Can puanı 7 \(2d6\) · Hız 30 ft./)).toBeInTheDocument();
  expect(block.getByText('Kurtarma zarları: Çeviklik +4')).toBeInTheDocument();
  expect(block.getByText('Beceriler: Stealth +6')).toBeInTheDocument();
  expect(block.getByText('Bağışıklık: zehir')).toBeInTheDocument();
  expect(block.getByText('Duyular: darkvision 60 ft.')).toBeInTheDocument();
  expect(block.getByText(/\+4, 1d6\+2 kesici/)).toBeInTheDocument();
});

it('hasar, iyileştirme ve görünürlük niyetlerini gönderir', async () => {
  const send = vi.fn();
  render(<DmCombat view={view} monsters={monsters} send={send} />);
  const goblin = within(row('Goblin 1'));
  await userEvent.type(goblin.getByLabelText('Miktar'), '4');
  await userEvent.selectOptions(goblin.getByLabelText('Hasar türü'), 'fire');
  await userEvent.click(goblin.getByRole('button', { name: 'Hasar ver' }));
  await userEvent.click(goblin.getByRole('button', { name: 'İyileştir' }));
  await userEvent.click(goblin.getByRole('checkbox', { name: 'Can puanı oyuncuya açık' }));
  await userEvent.click(goblin.getByRole('checkbox', { name: 'zehirlenmiş' }));
  expect(send.mock.calls.map((c) => c[0])).toEqual([
    { type: 'combat.applyDamage', combatantId: 'm1', amount: 4, damageType: 'fire' },
    { type: 'combat.heal', combatantId: 'm1', amount: 4 },
    { type: 'combatant.patch', combatantId: 'm1', patch: { revealHp: true } },
    { type: 'combatant.patch', combatantId: 'm1', patch: { conditions: ['prone', 'poisoned'] } },
  ]);
});

it('sıra ilerletme ve onaylı bitirme', async () => {
  const send = vi.fn();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  render(<DmCombat view={view} monsters={monsters} send={send} />);
  await userEvent.click(screen.getByRole('button', { name: 'Sıradaki' }));
  await userEvent.click(screen.getByRole('button', { name: 'Savaşı bitir' }));
  await userEvent.click(screen.getByRole('button', { name: 'Savaşı bitir' }));
  expect(send.mock.calls.map((c) => c[0])).toEqual([{ type: 'combat.nextTurn' }, { type: 'encounter.end' }]);
  confirm.mockRestore();
});

it('inisiyatif aşamasında DM zarları atar; hepsi atılmadan sırayı kuramaz', async () => {
  const send = vi.fn();
  const waiting: DmView = {
    ...view,
    encounter: { ...view.encounter!, status: 'initiative', round: 0, turnIndex: 0,
      combatants: view.encounter!.combatants.map((c) => ({ ...c, initiative: c.kind === 'monster' ? null : null })) },
  };
  const { rerender } = render(<DmCombat view={waiting} monsters={monsters} send={send} />);
  expect(screen.getByText('oyuncunun zarı bekleniyor')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Sırayı kur ve başlat' })).toBeDisabled();
  await userEvent.click(screen.getByRole('button', { name: 'Yaratıkların zarını at' }));
  expect(send).toHaveBeenCalledWith({ type: 'combat.rollInitiative', mode: 'normal' });

  const rolled: DmView = {
    ...waiting,
    encounter: { ...waiting.encounter!, combatants: waiting.encounter!.combatants.map((c, i) => ({ ...c, initiative: 10 + i })) },
  };
  rerender(<DmCombat view={rolled} monsters={monsters} send={send} />);
  await userEvent.click(screen.getByRole('button', { name: 'Sırayı kur ve başlat' }));
  expect(send).toHaveBeenLastCalledWith({ type: 'combat.begin' });
});
