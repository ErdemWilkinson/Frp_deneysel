import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import type { DmView } from '@masa/shared';
import { DmBoard } from './Board';
import { SheetViewer } from './SheetViewer';

afterEach(() => vi.unstubAllGlobals());

const hero = {
  name: 'Aria', level: 3, ac: 16, maxHp: 24, hp: 24, tempHp: 0, speed: 30,
  abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 }, proficiency: 2, saveProficiencies: [],
  attacks: [], deathSaves: { successes: 0, failures: 0 }, dead: false,
} satisfies DmView['character'];

const dmView = (over: Partial<DmView['board']> = {}): DmView => ({
  role: 'dm', code: 'ABC123', log: [], character: hero, sheetId: null, world: { mapId: null, aspect: 0.75, visible: false, x: 0.5, y: 0.5, region: null },
  encounter: {
    id: 'e1', status: 'active', round: 1, turnIndex: 0,
    combatants: [{ id: 'm1', kind: 'monster', monsterId: 'goblin', name: 'Goblin 1', ac: 15, hp: 2, maxHp: 7, tempHp: 0, dexMod: 2,
      initiative: 12, conditions: [], revealName: true, revealHp: false, legendaryLeft: null, moved: 10, dashed: false }],
  },
  board: {
    mapId: null, visible: false, widthFt: 100, aspect: 0.75, terrain: null, seed: 1, daylight: 'day',
    tokens: [
      { id: 't1', label: 'Aria', kind: 'character', combatantId: null, x: 0.5, y: 0.88, hidden: false },
      { id: 't2', label: 'Goblin 1', kind: 'monster', combatantId: 'm1', x: 0.1, y: 0.1, hidden: true },
    ],
    ...over,
  },
});
/** Haritayı 400×200 piksellik bir kutuymuş gibi ölçtürür. */
const sizeBoard = () => {
  const surface = document.querySelector('.board') as HTMLElement;
  surface.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 200 }) as DOMRect;
};
const pawn = (name: RegExp) => screen.getByRole('button', { name });
const pickFile = (label: string, file: File) => userEvent.upload(screen.getByLabelText(label), file);
const png = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'orman.png', { type: 'image/png' });

it('DM gizli jetonu ve canavarın can kademesini görür; görünürlüğü ve dizilişi yönetir', async () => {
  const send = vi.fn();
  render(<DmBoard view={dmView()} send={send} />);
  expect(pawn(/Goblin 1 jetonu \(oyuncudan gizli, ağır yaralı\)/)).toHaveClass('hidden');
  expect(screen.getByText('Oyuncu şu an alanı görmüyor.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('checkbox', { name: 'Oyuncuya açık' }));
  await userEvent.click(screen.getByRole('button', { name: 'Savaşçıları diz' }));
  await userEvent.type(screen.getByLabelText('İşaret adı'), 'Tuzak');
  await userEvent.click(screen.getByRole('button', { name: 'İşaret koy' }));
  expect(send.mock.calls.map((c) => c[0])).toEqual([
    { type: 'board.show', visible: true },
    { type: 'board.placeCombatants' },
    { type: 'board.addMarker', label: 'Tuzak' },
  ]);
});

it('DM seçtiği jetonu açar, yeniden adlandırır ve kaldırır', async () => {
  const send = vi.fn();
  render(<DmBoard view={dmView()} send={send} />);
  fireEvent.pointerDown(pawn(/Goblin 1/), { clientX: 0, clientY: 0 });
  fireEvent.pointerUp(pawn(/Goblin 1/));
  expect(screen.getByRole('group', { name: 'Seçili jeton: Goblin 1' })).toBeInTheDocument();
  await userEvent.click(screen.getByRole('checkbox', { name: 'Oyuncudan gizle' }));
  await userEvent.clear(screen.getByLabelText('Etiket'));
  await userEvent.type(screen.getByLabelText('Etiket'), 'Şef');
  await userEvent.click(screen.getByRole('button', { name: 'Etiketi değiştir' }));
  await userEvent.click(screen.getByRole('button', { name: 'Jetonu kaldır' }));
  expect(send.mock.calls.map((c) => c[0])).toEqual([
    { type: 'board.patchToken', tokenId: 't2', hidden: false },
    { type: 'board.patchToken', tokenId: 't2', label: 'Şef' },
    { type: 'board.removeToken', tokenId: 't2' },
  ]);
  expect(screen.queryByRole('group', { name: /Seçili jeton/ })).toBeNull();
});

it('DM harita yükleyince dosyayı gönderir ve haritayı ona çevirir', async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ id: 'map-9', name: 'orman.png' }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  const send = vi.fn();
  render(<DmBoard view={dmView()} send={send} />);
  await pickFile('Kendi savaş haritamı yükle', png);
  await waitFor(() => expect(send).toHaveBeenCalledWith({ type: 'board.setMap', mapId: 'map-9' }));
  const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
  expect(url).toBe('/api/files/map');
  expect(init.body).toBe(png);
  expect((init.headers as Record<string, string>)['X-File-Name']).toBe('orman.png');
});

it('yükleme reddedilirse sunucunun nedenini gösterir ve haritayı değiştirmez', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Harita PNG, JPEG ya da WebP olmalı' }), { status: 415 })));
  const send = vi.fn();
  render(<DmBoard view={dmView()} send={send} />);
  await pickFile('Kendi savaş haritamı yükle', png);
  expect(await screen.findByRole('alert')).toHaveTextContent('Harita PNG, JPEG ya da WebP olmalı');
  expect(send).not.toHaveBeenCalled();
});

it('sekiz megabayttan büyük dosyayı sunucuya göndermeden reddeder', async () => {
  const fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  render(<DmBoard view={dmView()} send={vi.fn()} />);
  const big = new File([new Uint8Array(8 * 1024 * 1024 + 1)], 'dev.png', { type: 'image/png' });
  await pickFile('Kendi savaş haritamı yükle', big);
  expect(await screen.findByRole('alert')).toHaveTextContent('Dosya çok büyük (en fazla 8 MB)');
  expect(fetchMock).not.toHaveBeenCalled();
});

it('karakter sayfası: yükler, resim açılmazsa belge olarak gösterir, kaldırır', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ id: 'sheet-2', name: 'aria.pdf' }), { status: 200 })));
  const send = vi.fn();
  const { rerender } = render(<SheetViewer sheetId={null} send={send} />);
  expect(screen.getByText(/PDF ya da resim olarak karakter sayfanı yükle/)).toBeInTheDocument();
  await pickFile('Sayfa yükle', new File(['%PDF-1.7'], 'aria.pdf', { type: 'application/pdf' }));
  await waitFor(() => expect(send).toHaveBeenCalledWith({ type: 'sheet.set', fileId: 'sheet-2' }));

  rerender(<SheetViewer sheetId="sheet-2" send={send} />);
  const image = screen.getByRole('img', { name: 'Yüklenen karakter sayfası' });
  expect(image).toHaveAttribute('src', '/api/files/sheet-2');
  fireEvent.error(image);
  expect(screen.getByTitle('Yüklenen karakter sayfası')).toHaveAttribute('src', '/api/files/sheet-2');
  expect(screen.queryByRole('img')).toBeNull();

  await userEvent.click(screen.getByRole('button', { name: 'Sayfayı kaldır' }));
  expect(send).toHaveBeenLastCalledWith({ type: 'sheet.set', fileId: null });
});

it('DM sırası gelen canavarın kalan yürüme menzilini halka olarak görür ama dışına da bırakabilir', () => {
  const send = vi.fn();
  render(<DmBoard view={dmView()} send={send} />);
  // Hızı bilinmeyen canavar 30 fit sayılır; 10 fit yürümüş, 20 fit kalmış: alanın eninin %40'ı çapında halka.
  expect(screen.getByTestId('walk-ring')).toHaveStyle({ left: '10%', top: '10%', width: '40%' });
  sizeBoard();
  fireEvent.pointerDown(pawn(/Goblin 1/), { clientX: 40, clientY: 20 });
  fireEvent.pointerMove(pawn(/Goblin 1/), { clientX: 360, clientY: 20 });
  expect(screen.getByText('80 fit')).toBeInTheDocument();
  fireEvent.pointerUp(pawn(/Goblin 1/));
  expect(send).toHaveBeenCalledWith({ type: 'board.moveToken', tokenId: 't2', x: 0.9, y: 0.1 });
});

it('DM alanın enini ayarlar; harita yüklenince gerçek oranı bildirir', async () => {
  const send = vi.fn();
  render(<DmBoard view={dmView({ mapId: 'map-1' })} send={send} />);
  await userEvent.clear(screen.getByLabelText('Alanın eni (fit)'));
  await userEvent.type(screen.getByLabelText('Alanın eni (fit)'), '300');
  await userEvent.tab();
  const image = screen.getByRole('img', { name: 'Savaş alanı' }) as HTMLImageElement;
  Object.defineProperty(image, 'naturalWidth', { value: 1200 });
  Object.defineProperty(image, 'naturalHeight', { value: 600 });
  fireEvent.load(image);
  expect(send.mock.calls.map((c) => c[0])).toEqual([
    { type: 'board.setScale', widthFt: 300 },
    { type: 'board.setScale', aspect: 0.5 },
  ]);
});
