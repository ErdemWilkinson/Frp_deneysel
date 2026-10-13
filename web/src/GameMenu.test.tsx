import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { DmView, PlayerView } from '@masa/shared';
import { GameMenu } from './GameMenu';
import { PlayerTable } from './PlayerTable';

let saves: object[];
let fetchMock: ReturnType<typeof vi.fn>;
const posts = () => fetchMock.mock.calls.filter((c) => (c[1] as RequestInit | undefined)?.method === 'POST').map((c) => [c[0], (c[1] as RequestInit).body]);

beforeEach(() => {
  saves = [{ id: 's1', name: 'Orman yolu', at: Date.UTC(2026, 9, 12, 12), hero: 'Aria' }];
  fetchMock = vi.fn(async (url: string, init?: RequestInit) =>
    new Response(JSON.stringify(init?.method === 'POST' ? { ok: true } : saves), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

const open = async () => {
  render(<GameMenu />);
  await userEvent.click(screen.getByRole('button', { name: 'Oyun' }));
  return within(screen.getByRole('group', { name: 'Oyun menüsü' }));
};

it('yeni oyun, neyin silineceğini söyleyen bir onaydan sonra açılır', async () => {
  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  const menu = await open();
  await userEvent.click(menu.getByRole('button', { name: 'Yeni oyun aç' }));
  expect(confirm.mock.calls[0]![0]).toMatch(/karakter, savaş, savaş alanı ve günlük temizlenir/);
  expect(posts()).toEqual([]);
  await userEvent.click(menu.getByRole('button', { name: 'Yeni oyun aç' }));
  expect(posts()).toEqual([['/api/game/new', '{}']]);
  expect(await menu.findByRole('status')).toHaveTextContent('Yeni oyun açıldı');
});

it('oyunu adıyla kaydeder ve kayıtları listeler', async () => {
  const menu = await open();
  expect(await menu.findByText('Orman yolu')).toBeInTheDocument();
  await userEvent.type(menu.getByLabelText('Kayıt adı'), '2. oturum');
  await userEvent.click(menu.getByRole('button', { name: 'Oyunu kaydet' }));
  expect(posts()).toEqual([['/api/game/saves', '{"name":"2. oturum"}']]);
  expect(await menu.findByRole('status')).toHaveTextContent('"2. oturum" kaydedildi.');
  expect(menu.getByLabelText('Kayıt adı')).toHaveValue('');
});

it('kayıtlı oyunu onayla yükler ve onayla siler', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const menu = await open();
  await userEvent.click(await menu.findByRole('button', { name: 'Orman yolu kaydını yükle' }));
  await userEvent.click(menu.getByRole('button', { name: 'Orman yolu kaydını sil' }));
  expect(posts()).toEqual([['/api/game/saves/s1/load', '{}'], ['/api/game/saves/s1/delete', '{}']]);
});

it('sunucu reddederse nedenini gösterir', async () => {
  vi.spyOn(window, 'confirm').mockReturnValue(true);
  const menu = await open();
  fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ error: 'Bu işlem yalnızca DM içindir' }), { status: 403 }));
  await userEvent.click(menu.getByRole('button', { name: 'Yeni oyun aç' }));
  expect(await menu.findByRole('alert')).toHaveTextContent('Bu işlem yalnızca DM içindir');
});

it('masaya yeni oturan oyuncu, masada karakter olsa bile önce seçim ekranını görür', async () => {
  const hero = {
    name: 'Aria', level: 3, ac: 16, maxHp: 24, hp: 20, tempHp: 0, speed: 30,
    abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 }, proficiency: 2, saveProficiencies: [],
    attacks: [], deathSaves: { successes: 0, failures: 0 }, dead: false,
  };
  const view: PlayerView = { role: 'player', code: 'ABC123', log: [], sheetId: null, character: hero, encounter: null, board: null, world: null };
  const { rerender } = render(<PlayerTable view={view} send={vi.fn()} startOpen />);
  expect(screen.getByRole('heading', { name: 'Masaya hoş geldin' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Yeni karakter yap/ })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /Eski karakteri yükle/ })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /Aria ile devam et/ }));
  expect(screen.getByRole('region', { name: 'Savaş alanı' })).toBeInTheDocument();

  // DM yeni oyun açınca karakter kalkar; oyuncu kendiliğinden seçim ekranına döner.
  rerender(<PlayerTable view={{ ...view, character: null }} send={vi.fn()} startOpen />);
  expect(screen.getByRole('heading', { name: 'Masaya hoş geldin' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /ile devam et/ })).toBeNull();
});

it('yaratıkları zarla tanıtma anahtarı oyun menüsündedir ve savaş kurulmadan açılır', async () => {
  const send = vi.fn();
  const base = {
    role: 'dm', code: 'ABC123', log: [], character: null, sheetId: null, encounter: null, theater: false, identify: false,
    board: { mapId: null, visible: false, tokens: [], widthFt: 100, aspect: 0.75, terrain: null, seed: 1, daylight: 'day' },
    world: { mapId: null, aspect: 0.75, visible: false, x: 0.5, y: 0.5, region: null },
  } as unknown as DmView;
  const { rerender } = render(<GameMenu view={base} send={send} />);
  await userEvent.click(screen.getByRole('button', { name: 'Oyun' }));
  const identify = screen.getByRole('checkbox', { name: 'Yaratıkları zarla tanıt' });
  const theater = screen.getByRole('checkbox', { name: 'Hayali savaş (DM yönetir)' });
  expect(theater).not.toBeChecked();
  await userEvent.click(theater);
  expect(identify).not.toBeChecked();
  await userEvent.click(identify);
  expect(send.mock.calls.map((c) => c[0])).toEqual([
    { type: 'table.setTheater', theater: true },
    { type: 'table.setIdentify', identify: true },
  ]);

  rerender(<GameMenu view={{ ...base, theater: true, identify: true }} send={send} />);
  expect(screen.getByRole('checkbox', { name: 'Yaratıkları zarla tanıt' })).toBeChecked();
});
