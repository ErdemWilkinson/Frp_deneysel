import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { DmView } from '@masa/shared';
import { DmTable } from './DmTable';

const dm: DmView = {
  role: 'dm', code: 'ABC123', log: [], character: null, encounter: null, sheetId: null,
  board: { mapId: null, visible: false, tokens: [], widthFt: 100, aspect: 0.75, terrain: null, seed: 1, daylight: 'day' }, world: { mapId: null, aspect: 0.75, visible: false, x: 0.5, y: 0.5, region: null },
};

let fetchMock: ReturnType<typeof vi.fn>;
beforeEach(() => {
  window.localStorage.clear();
  fetchMock = vi.fn(async () => new Response('[]', { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

it('DM ekranı üç bölmedir; savaş alanı ile karşılaşma aynı sekmede, oyuncunun kartı ayrı sekmede durur', async () => {
  render(<DmTable view={dm} send={vi.fn()} />);
  expect(screen.getAllByRole('separator')).toHaveLength(2);
  expect(screen.getByRole('region', { name: 'Savaş alanı' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Karşılaşma' })).toBeInTheDocument();
  expect(screen.queryByRole('region', { name: 'Karakter kartı' })).toBeNull();
  await userEvent.click(screen.getByRole('tab', { name: 'Oyuncunun karakteri' }));
  expect(screen.getByRole('region', { name: 'Karakter kartı' })).toBeInTheDocument();
  expect(screen.getByLabelText('Sayfa yükle')).toBeInTheDocument();
});

it('yaratık kaydedilince kitaba döner ve sunucunun sonraki yayınında kitabı yeniden okur', async () => {
  const send = vi.fn();
  const { rerender } = render(<DmTable view={dm} send={send} />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  await userEvent.click(screen.getByRole('tab', { name: 'Yaratık yarat' }));
  const editor = within(screen.getByRole('region', { name: 'Yaratık yarat' }));
  await userEvent.type(editor.getByLabelText('Ad'), 'Gece Kurdu');
  await userEvent.type(editor.getByLabelText('Eylem adı'), 'Isırık');
  await userEvent.click(editor.getByRole('button', { name: 'Yaratığı kitaba ekle' }));
  expect(send).toHaveBeenCalledWith(expect.objectContaining({ type: 'monster.save' }));
  expect(screen.getByRole('tab', { name: 'Canavar kitabı' })).toHaveAttribute('aria-selected', 'true');
  expect(fetchMock).toHaveBeenCalledTimes(1);

  rerender(<DmTable view={{ ...dm }} send={send} />);
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  rerender(<DmTable view={{ ...dm }} send={send} />);
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

it('insan kitabı ayrı sekmedir; canavar kitabında insanlar, insan kitabında canavarlar görünmez', async () => {
  const base = {
    size: 'Medium', type: 'humanoid', ac: 12, hp: 11, hitDice: '2d8+2', speed: '30 ft.',
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, saves: {}, skills: {},
    resistances: [], immunities: [], vulnerabilities: [], defenseNotes: [], conditionImmunities: [],
    senses: '', languages: '', cr: 0.5, xp: 100, traits: [], actions: [], legendaryActions: [], legendaryCount: 0, regions: ['urban'],
  };
  const list = [
    { ...base, id: 'goblin', name: { tr: 'Goblin', en: 'Goblin' } },
    { ...base, id: 'raider', name: { tr: 'Yağmacı', en: 'Raider' }, human: true },
  ];
  fetchMock.mockImplementation(async () => new Response(JSON.stringify(list), { status: 200 }));
  render(<DmTable view={dm} send={vi.fn()} />);
  await screen.findByText('Goblin');
  expect(screen.queryByText('Yağmacı')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('tab', { name: 'İnsan kitabı' }));
  expect(await screen.findByText('Yağmacı')).toBeInTheDocument();
  expect(screen.queryByText('Goblin')).not.toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'İnsan kitabı' })).toBeInTheDocument();
});
