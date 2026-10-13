import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Character, PlayerView } from '@masa/shared';
import { Battlefield } from './Battlefield';
import { PlayerTable } from './PlayerTable';

const hero: Character = {
  name: 'Aria', level: 3, ac: 16, maxHp: 24, hp: 20, tempHp: 0, speed: 30,
  abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 }, proficiency: 2, saveProficiencies: [],
  attacks: [
    { name: 'Uzun Kılıç', bonus: 5, damage: '1d8+3', type: 'slashing', range: 5 },
    { name: 'Uzun Yay', bonus: 4, damage: '1d8+1', type: 'piercing', range: 150 },
  ],
  deathSaves: { successes: 0, failures: 0 }, dead: false,
};
/** 100 × 100 fit alan: Aria ortada, Goblin 1 dibinde (4 fit), Goblin 2 uzakta (40 fit), düşmüş bir iskelet. */
const view = (over: { myTurn?: boolean; moveLeft?: number; fight?: boolean; board?: boolean; character?: Character | null } = {}): PlayerView => {
  const { myTurn = true, moveLeft = 30, fight = true, board = true, character = hero } = over;
  return {
    role: 'player', code: 'ABC123', log: [], sheetId: null, world: null, character,
    encounter: fight ? {
      round: 2, phase: 'combat', theater: false,
      combatants: [
        { id: 'c1', kind: 'character', name: 'Aria', initiative: 16, conditions: [], band: 'healthy', hp: 20, maxHp: 24, current: myTurn, moveLeft },
        { id: 'm1', kind: 'monster', name: 'Goblin 1', initiative: 12, conditions: [], band: 'hurt', hp: null, maxHp: null, current: !myTurn, moveLeft: null },
      ],
    } : null,
    board: board ? {
      mapId: null, widthFt: 100, aspect: 1, terrain: null, seed: 1, daylight: 'day',
      tokens: [
        { id: 't1', label: 'Aria', kind: 'character', x: 0.5, y: 0.5, band: 'healthy', mine: true, targetId: null },
        { id: 't2', label: 'Goblin 1', kind: 'monster', x: 0.54, y: 0.5, band: 'hurt', mine: false, targetId: 'm1' },
        { id: 't3', label: 'Goblin 2', kind: 'monster', x: 0.9, y: 0.5, band: 'healthy', mine: false, targetId: 'm2' },
        { id: 't4', label: 'İskelet 1', kind: 'monster', x: 0.52, y: 0.52, band: 'down', mine: false, targetId: 'm3' },
        { id: 't5', label: 'Sandık', kind: 'marker', x: 0.2, y: 0.2, band: null, mine: false, targetId: null },
      ],
    } : null,
  };
};
const pawn = (name: RegExp) => screen.getByRole('button', { name });
const surface = () => document.querySelector('.board') as HTMLElement;
/** Alanı 400 × 400 piksel ölçtürür: 4 piksel = 1 ft. */
const sizeBoard = () => { surface().getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 400 }) as DOMRect; };
const drag = (name: RegExp, to: [number, number]) => {
  fireEvent.pointerDown(pawn(name), { clientX: 200, clientY: 200 });
  fireEvent.pointerMove(pawn(name), { clientX: to[0], clientY: to[1] });
};

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

it('sıra oyuncudayken kalan yürüme menzilini halka ve sayı olarak gösterir', () => {
  render(<Battlefield view={view({ moveLeft: 15 })} send={vi.fn()} />);
  expect(screen.getByRole('status')).toHaveTextContent('Sıra sende');
  expect(screen.getByText('Yürüme: 15 fit kaldı')).toBeInTheDocument();
  expect(screen.getByTestId('walk-ring')).toHaveStyle({ left: '50%', top: '50%', width: '30%' });
});

it('menzil içine sürüklenen jeton yürür; sürüklerken yol ft olarak okunur', () => {
  const send = vi.fn();
  render(<Battlefield view={view()} send={send} />);
  sizeBoard();
  drag(/Aria/, [280, 200]);
  expect(screen.getByText('20 fit')).toBeInTheDocument();
  fireEvent.pointerUp(pawn(/Aria/));
  expect(send).toHaveBeenCalledWith({ type: 'board.moveToken', tokenId: 't1', x: 0.7, y: 0.5 });
});

it('menzil dışına bırakılan jeton yerine döner ve hamle gönderilmez', () => {
  const send = vi.fn();
  render(<Battlefield view={view()} send={send} />);
  sizeBoard();
  drag(/Aria/, [360, 200]);
  expect(screen.getByText('40 fit — çok uzak')).toBeInTheDocument();
  fireEvent.pointerUp(pawn(/Aria/));
  expect(send).not.toHaveBeenCalled();
  expect(pawn(/Aria/)).toHaveStyle({ left: '50%', top: '50%' });
});

it('zemine tıklayınca oraya yürür; menzil dışıysa nedenini söyler', () => {
  const send = vi.fn();
  render(<Battlefield view={view()} send={send} />);
  sizeBoard();
  fireEvent.click(surface(), { clientX: 200, clientY: 100 });
  expect(send).toHaveBeenCalledWith({ type: 'board.moveToken', tokenId: 't1', x: 0.5, y: 0.25 });
  fireEvent.click(surface(), { clientX: 20, clientY: 20 });
  expect(screen.getByRole('alert')).toHaveTextContent('Orası yürüme menzilinin dışında.');
  expect(send).toHaveBeenCalledTimes(1);
});

it('sıra başkasındayken jeton oynamaz, halka çıkmaz, sırayı bitiremez', () => {
  const send = vi.fn();
  render(<Battlefield view={view({ myTurn: false })} send={send} />);
  sizeBoard();
  expect(screen.getByRole('status')).toHaveTextContent('Sıra: Goblin 1');
  expect(screen.queryByTestId('walk-ring')).toBeNull();
  drag(/Aria/, [240, 200]);
  fireEvent.pointerUp(pawn(/Aria/));
  fireEvent.click(surface(), { clientX: 240, clientY: 200 });
  expect(send).not.toHaveBeenCalled();
  expect(screen.getByRole('button', { name: 'Sırayı bitir' })).toBeDisabled();
  expect(screen.getByRole('button', { name: /Koş/ })).toBeDisabled();
});

it('saldırı seçilince menzildeki düşman işaretlenir; tıklanınca saldırı gider', async () => {
  const send = vi.fn();
  render(<Battlefield view={view()} send={send} />);
  await userEvent.click(screen.getByRole('button', { name: /Uzun Kılıç/ }));
  expect(screen.getAllByRole('status').at(-1)).toHaveTextContent('Uzun Kılıç seçili (5 fit). Menzildeki düşmana tıkla.');
  expect(pawn(/Goblin 1 jetonu \(yaralı, menzilde\)/)).toHaveClass('aim-in');
  expect(pawn(/Goblin 2 jetonu \(sağlam, menzil dışında\)/)).toHaveClass('aim-out');
  expect(pawn(/İskelet 1/)).not.toHaveClass('aim-in');
  expect(pawn(/Sandık/)).not.toHaveClass('aim-out');
  expect(screen.queryByTestId('walk-ring')).toBeNull();

  fireEvent.pointerDown(pawn(/Goblin 2/));
  expect(screen.getByRole('alert')).toHaveTextContent('Goblin 2 menzil dışında. Önce yaklaş.');
  expect(send).not.toHaveBeenCalled();
  fireEvent.pointerDown(pawn(/Goblin 1/));
  expect(send).toHaveBeenCalledWith({ type: 'character.attack', attackIndex: 0, targetId: 'm1', mode: 'normal' });
  expect(pawn(/Goblin 1/)).not.toHaveClass('aim-in');
});

it('menzilli saldırıyla uzaktaki düşman hedef alınır; zar kipi saldırıya eklenir', async () => {
  const send = vi.fn();
  render(<Battlefield view={view()} send={send} />);
  await userEvent.selectOptions(screen.getByLabelText('Zar kipi'), 'advantage');
  await userEvent.click(screen.getByRole('button', { name: /Uzun Yay/ }));
  fireEvent.pointerDown(pawn(/Goblin 2/));
  expect(send).toHaveBeenCalledWith({ type: 'character.attack', attackIndex: 1, targetId: 'm2', mode: 'advantage' });
});

it('koşu ve sıra bitirme niyetlerini gönderir', async () => {
  const send = vi.fn();
  render(<Battlefield view={view()} send={send} />);
  await userEvent.click(screen.getByRole('button', { name: /Koş/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Sırayı bitir' }));
  expect(send.mock.calls.map((c) => c[0])).toEqual([{ type: 'combat.dash' }, { type: 'combat.nextTurn' }]);
});

it('savaş yokken ve alan kapalıyken yalnızca durumu söyler', () => {
  const { rerender } = render(<Battlefield view={view({ fight: false, board: false })} send={vi.fn()} />);
  expect(screen.getByText(/DM henüz bir harita açmadı/)).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Sırayı bitir' })).toBeNull();
  rerender(<Battlefield view={view({ board: false })} send={vi.fn()} />);
  expect(screen.getByText('DM henüz bir harita açmadı.')).toBeInTheDocument();
});

it('yere düşen karakter saldıramaz; ölüm kurtarma zarı atar', async () => {
  const send = vi.fn();
  render(<Battlefield view={view({ character: { ...hero, hp: 0 }, moveLeft: 0 })} send={send} />);
  expect(screen.queryByRole('button', { name: /Uzun Kılıç/ })).toBeNull();
  await userEvent.click(screen.getByRole('button', { name: 'Ölüm kurtarma zarı at' }));
  expect(send).toHaveBeenCalledWith({ type: 'character.deathSave' });
});

it('karaktersiz oyuncu yalnızca iki seçenek görür', () => {
  render(<PlayerTable view={view({ character: null, fight: false, board: false })} send={vi.fn()} />);
  expect(screen.getAllByRole('button').map((b) => within(b).getByText(/./, { selector: 'strong' }).textContent))
    .toEqual(['Yeni karakter yap', 'Eski karakteri yükle']);
  expect(screen.queryByRole('region', { name: 'Zar ve günlük' })).toBeNull();
});

it('yeni karakter: kart kaydedilince gönderilir', async () => {
  const send = vi.fn();
  render(<PlayerTable view={view({ character: null, fight: false, board: false })} send={send} />);
  await userEvent.click(screen.getByRole('button', { name: /Yeni karakter yap/ }));
  await userEvent.type(screen.getByLabelText('Karakter adı'), 'Borin');
  await userEvent.click(screen.getByRole('button', { name: 'Karakteri kaydet ve masaya otur' }));
  expect(send.mock.calls[0]![0]).toMatchObject({ type: 'character.set', character: { name: 'Borin', speed: 30 } });
  await userEvent.click(screen.getByRole('button', { name: 'Geri' }));
  expect(screen.getByRole('button', { name: /Eski karakteri yükle/ })).toBeInTheDocument();
});

it('eski karakter: kayıtlı kartları listeler ve seçileni masaya koyar', async () => {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify([hero]), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  const send = vi.fn();
  render(<PlayerTable view={view({ character: null, fight: false, board: false })} send={send} />);
  await userEvent.click(screen.getByRole('button', { name: /Eski karakteri yükle/ }));
  expect(fetchMock).toHaveBeenCalledWith('/api/characters', expect.anything());
  const list = await screen.findByRole('list', { name: 'Kayıtlı karakterler' });
  await userEvent.click(await within(list).findByRole('button', { name: /Aria.*3\. seviye · 20\/24 can puanı · zırh sınıfı 16/ }));
  expect(send).toHaveBeenCalledWith({ type: 'character.set', character: hero });
});

it('kayıtlı karakter yoksa bunu söyler ve dosyadan yüklemeye izin verir', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response('[]', { status: 200 })));
  const send = vi.fn();
  render(<PlayerTable view={view({ character: null, fight: false, board: false })} send={send} />);
  await userEvent.click(screen.getByRole('button', { name: /Eski karakteri yükle/ }));
  expect(await screen.findByText(/Bu masada kayıtlı karakter yok/)).toBeInTheDocument();
  const file = new File([JSON.stringify({ character: { name: 'Borin', level: 5 } })], 'borin.json', { type: 'application/json' });
  await userEvent.upload(screen.getByLabelText('Dosyadan yükle (.json)'), file);
  await waitFor(() => expect(send).toHaveBeenCalled());
  expect(send.mock.calls[0]![0].character).toMatchObject({ name: 'Borin', level: 5, speed: 30 });
});

it('karakteri olan oyuncu doğrudan savaş alanını ve zarı görür; karakter değiştirmeye dönebilir', async () => {
  render(<PlayerTable view={view()} send={vi.fn()} />);
  expect(screen.getByRole('region', { name: 'Savaş alanı' })).toBeInTheDocument();
  expect(screen.getByRole('region', { name: 'Zar ve günlük' })).toBeInTheDocument();
  // Biri savaş alanı ile zar arasında, biri karakter özeti ile harita arasında.
  expect(screen.getAllByRole('separator')).toHaveLength(2);
  await userEvent.click(screen.getByRole('tab', { name: 'Karakterim' }));
  await userEvent.click(screen.getByRole('button', { name: 'Başka karakter seç' }));
  await userEvent.click(screen.getByRole('button', { name: /Aria ile devam et/ }));
  expect(screen.getByRole('tab', { name: 'Harita' })).toBeInTheDocument();
});

it('haritanın solunda kısa karakter özeti durur; Karakterim sekmesi açılınca kalkar', async () => {
  render(<PlayerTable view={view()} send={vi.fn()} />);
  const glance = screen.getByRole('complementary', { name: 'Karakter özeti' });
  expect(within(glance).getByText('Aria')).toBeInTheDocument();
  expect(within(glance).getByText('Zırh sınıfı')).toBeInTheDocument();
  expect(within(glance).getByText('Dayanıklılık')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('tab', { name: 'Karakterim' }));
  expect(screen.queryByRole('complementary', { name: 'Karakter özeti' })).not.toBeInTheDocument();
});

it('inisiyatif aşamasında oyuncu çeviklik zarını atar; sonra DM’i bekler', async () => {
  const send = vi.fn();
  const asking = view();
  asking.encounter = { ...asking.encounter!, phase: 'initiative', round: 0,
    combatants: asking.encounter!.combatants.map((c) => ({ ...c, initiative: null, current: false })) };
  const { rerender } = render(<Battlefield view={asking} send={send} />);
  await userEvent.click(screen.getByRole('button', { name: /İnisiyatif zarı at \(Çeviklik \+1\)/ }));
  expect(send).toHaveBeenCalledWith({ type: 'combat.rollInitiative', mode: 'normal' });
  expect(screen.queryByRole('button', { name: 'Sırayı bitir' })).not.toBeInTheDocument();

  const rolled = { ...asking, encounter: { ...asking.encounter!, combatants: asking.encounter!.combatants.map((c) => (c.kind === 'character' ? { ...c, initiative: 16 } : c)) } };
  rerender(<Battlefield view={rolled} send={send} />);
  expect(screen.getByRole('status')).toHaveTextContent('Zarın: 16');
  expect(screen.queryByRole('button', { name: /İnisiyatif zarı at/ })).not.toBeInTheDocument();
});

it('savaş başlayınca ekranın çevresinde kırmızı alarm çakar; sayfa savaşın ortasında açılırsa çakmaz', () => {
  const { container, rerender } = render(<Battlefield view={view({ fight: false })} send={vi.fn()} />);
  expect(container.querySelector('.fx')).toBeNull();
  rerender(<Battlefield view={view()} send={vi.fn()} />);
  expect(container.querySelector('.fx-alarm')).toHaveTextContent('SAVAŞ!');

  const mid = render(<Battlefield view={view()} send={vi.fn()} />);
  expect(mid.container.querySelector('.fx')).toBeNull();
});

it('saldırı seçilince jetonun çevresinde menzil halkası çizilir', async () => {
  render(<Battlefield view={view()} send={vi.fn()} />);
  expect(screen.queryByTestId('reach-ring')).not.toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: /Uzun Yay/ }));
  expect(screen.getByTestId('reach-ring')).toHaveStyle({ left: '50%', top: '50%', width: '300%' });
});

it('gece alan kararır, saat rozeti görünür ve yanan eşya özette belirir', () => {
  const night = view();
  night.board!.daylight = 'night';
  night.board!.tokens[0]!.light = 20;
  render(<Battlefield view={{ ...night, character: { ...hero, inventory: [{ id: 'i1', name: 'Meşale', qty: 1, note: '', light: 20, lit: true }] } }} send={vi.fn()} />);
  expect(document.querySelector('.daylight')).toHaveAttribute('data-daylight', 'night');
  expect(screen.getByText('Gece')).toBeInTheDocument();
  expect(screen.getByText('Işık: 20 fit')).toBeInTheDocument();
});

it('gündüz ışık katmanı çizilmez', () => {
  render(<Battlefield view={view()} send={vi.fn()} />);
  expect(document.querySelector('.daylight')).toBeNull();
});

it('karakter özeti ayırıcıyla daraltılıp genişletilir; tercih hatırlanır', () => {
  const { unmount } = render(<Battlefield view={view()} send={vi.fn()} />);
  const handle = () => screen.getByRole('separator', { name: 'Karakter özeti ile harita arasındaki ayırıcı' });
  expect(screen.getByText('Dayanıklılık')).toBeInTheDocument();
  for (let i = 0; i < 3; i += 1) fireEvent.keyDown(handle(), { key: 'ArrowLeft' });
  expect(handle()).toHaveAttribute('aria-valuenow', '10');
  expect(screen.queryByText('Dayanıklılık')).not.toBeInTheDocument();
  expect(screen.getByText('20/24')).toBeInTheDocument();
  unmount();
  render(<Battlefield view={view()} send={vi.fn()} />);
  expect(screen.queryByText('Dayanıklılık')).not.toBeInTheDocument();
  fireEvent.keyDown(handle(), { key: 'Enter' });
  expect(handle()).toHaveAttribute('aria-valuenow', '13');
  expect(screen.getByText('Dayanıklılık')).toBeInTheDocument();
});

it('ayırıcı sürüklenince özet genişler', () => {
  render(<Battlefield view={view()} send={vi.fn()} />);
  const handle = screen.getByRole('separator', { name: 'Karakter özeti ile harita arasındaki ayırıcı' });
  fireEvent.pointerDown(handle, { clientX: 200 });
  fireEvent(window, new MouseEvent('pointermove', { clientX: 264 }));
  expect(handle).toHaveAttribute('aria-valuenow', '17');
  fireEvent(window, new MouseEvent('pointerup'));
});

it('bilinmeyen yaratıklar için tanıma düğmesi çıkar; zar atılınca düğme kalkar', async () => {
  const send = vi.fn();
  const base = view();
  const monsters = [
    { id: 'm1', kind: 'monster' as const, name: 'Bilinmeyen yaratık', initiative: 12, conditions: [], band: 'healthy' as const, hp: null, maxHp: null, current: false, moveLeft: null, identifiable: true },
    { id: 'm2', kind: 'monster' as const, name: 'Bilinmeyen yaratık', initiative: 8, conditions: [], band: 'healthy' as const, hp: null, maxHp: null, current: false, moveLeft: null, identifiable: false },
  ];
  const { rerender } = render(<Battlefield view={{ ...base, encounter: { ...base.encounter!, combatants: [base.encounter!.combatants[0]!, ...monsters] } }} send={send} />);
  const group = screen.getByRole('group', { name: 'Yaratıkları tanı' });
  expect(within(group).getAllByRole('button')).toHaveLength(1);
  await userEvent.click(within(group).getByRole('button', { name: 'Yaratık 1 tanımayı dene' }));
  expect(send).toHaveBeenCalledWith({ type: 'character.identify', targetId: 'm1' });
  rerender(<Battlefield view={{ ...base, encounter: { ...base.encounter!, combatants: [base.encounter!.combatants[0]!, { ...monsters[0]!, identifiable: false }] } }} send={send} />);
  expect(screen.queryByRole('group', { name: 'Yaratıkları tanı' })).not.toBeInTheDocument();
});

it('hayali savaşta oyuncunun savaş kısmı kapalıdır: harita, sıra ve eylem yok', () => {
  const base = view();
  render(<Battlefield view={{ ...base, board: null, encounter: { ...base.encounter!, theater: true } }} send={vi.fn()} />);
  expect(screen.getByText('DM savaşı yönetiyor. Zar atman gerekirse DM söyler.')).toBeInTheDocument();
  expect(document.querySelector('.board')).toBeNull();
  expect(screen.queryByRole('group', { name: 'Eylemler' })?.querySelector('.moves')).toBeNull();
  expect(screen.queryByText('Sıra sende')).not.toBeInTheDocument();
});
