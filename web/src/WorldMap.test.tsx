import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { REGIONS, type DmView, type PlayerView, type World } from '@masa/shared';
import { Battlefield } from './Battlefield';
import { BoardSurface } from './Board';
import { EncounterPanel } from './EncounterPanel';
import { Terrain } from './Terrain';
import { DmWorld } from './WorldMap';

afterEach(() => vi.restoreAllMocks());

const hero = {
  name: 'Edo', level: 4, ac: 15, maxHp: 30, hp: 30, tempHp: 0, speed: 30,
  abilities: { str: 14, dex: 12, con: 14, int: 10, wis: 10, cha: 8 }, proficiency: 2, saveProficiencies: [],
  attacks: [], deathSaves: { successes: 0, failures: 0 }, dead: false,
} satisfies DmView['character'];
const dm = (world: Partial<World> = {}, encounter: DmView['encounter'] = null): DmView => ({
  role: 'dm', code: 'ABC123', log: [], character: hero, sheetId: null, encounter,
  board: { mapId: null, visible: false, tokens: [], widthFt: 100, aspect: 0.75, terrain: null, seed: 1, daylight: 'day' },
  world: { mapId: 'world-1', aspect: 0.75, visible: false, x: 0.5, y: 0.5, region: null, ...world },
});
/** Tuvalin okuyacağı rengi sabitler; jsdom resim çizemez. */
const paint = (r: number, g: number, b: number) => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    drawImage: vi.fn(),
    getImageData: () => ({ data: new Uint8ClampedArray([r, g, b, 255, r, g, b, 255]) }),
  } as unknown as CanvasRenderingContext2D);
};
const map = () => screen.getByRole('img', { name: 'Ana harita' }) as HTMLImageElement;
const clickMap = (clientX: number, clientY: number) => {
  Object.defineProperty(map(), 'naturalWidth', { value: 2000, configurable: true });
  Object.defineProperty(map(), 'naturalHeight', { value: 1500, configurable: true });
  const surface = map().parentElement!;
  surface.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 300 }) as DOMRect;
  fireEvent.click(surface, { clientX, clientY });
};

it('haritaya tıklayınca karakterin yeri ve o noktanın rengine göre arazi gönderilir', () => {
  paint(38, 78, 44);
  const send = vi.fn();
  render(<DmWorld view={dm()} send={send} />);
  clickMap(100, 150);
  expect(send).toHaveBeenCalledWith({ type: 'world.move', x: 0.25, y: 0.5, region: 'forest' });
  paint(214, 178, 96);
  clickMap(300, 30);
  expect(send).toHaveBeenLastCalledWith({ type: 'world.move', x: 0.75, y: 0.1, region: 'desert' });
});

it('renk okunamazsa yer yine de taşınır; arazi olduğu gibi kalır', () => {
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
  const send = vi.fn();
  render(<DmWorld view={dm({ region: 'swamp' })} send={send} />);
  clickMap(200, 150);
  expect(send).toHaveBeenCalledWith({ type: 'world.move', x: 0.5, y: 0.5 });
});

it('karakterin yerini adıyla gösterir; arazi elle düzeltilebilir', async () => {
  const send = vi.fn();
  render(<DmWorld view={dm({ x: 0.3, y: 0.6, region: 'forest' })} send={send} />);
  expect(screen.getByRole('img', { name: 'Edo burada' })).toHaveStyle({ left: '30%', top: '60%' });
  expect(screen.getByLabelText('Buradaki arazi')).toHaveValue('forest');
  await userEvent.selectOptions(screen.getByLabelText('Buradaki arazi'), 'mountain');
  expect(send).toHaveBeenCalledWith({ type: 'world.setRegion', region: 'mountain' });
});

it('"Burada karşılaşma kur" bulunulan arazi, karakterin seviyesi ve seçilen zorlukla üretir', async () => {
  const send = vi.fn();
  const onEncounter = vi.fn();
  render(<DmWorld view={dm({ region: 'desert' })} send={send} onEncounter={onEncounter} />);
  await userEvent.selectOptions(screen.getByLabelText('Zorluk'), 'hard');
  await userEvent.click(screen.getByRole('button', { name: 'Burada karşılaşma kur' }));
  expect(send).toHaveBeenCalledWith({ type: 'encounter.generate', region: 'desert', level: 4, difficulty: 'hard' });
  expect(onEncounter).toHaveBeenCalled();
});

it('arazi belirsizken ya da savaş sürerken karşılaşma kurulamaz', () => {
  const { rerender } = render(<DmWorld view={dm()} send={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Burada karşılaşma kur' })).toBeDisabled();
  expect(screen.getByText(/Arazi belirsiz/)).toBeInTheDocument();
  const active = { id: 'e', status: 'active', round: 1, turnIndex: 0, combatants: [] } as DmView['encounter'];
  rerender(<DmWorld view={dm({ region: 'forest' }, active)} send={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Burada karşılaşma kur' })).toBeDisabled();
  expect(screen.getByText(/önce savaşı bitir/)).toBeInTheDocument();
});

it('harita yokken yüklemeyi anlatır; oyuncuya açma kutusu harita gelince çıkar', async () => {
  const send = vi.fn();
  const { rerender } = render(<DmWorld view={dm({ mapId: null })} send={send} />);
  expect(screen.getByText(/Dünyanın büyük haritasını yükle/)).toBeInTheDocument();
  expect(screen.queryByRole('checkbox', { name: 'Oyuncuya açık' })).toBeNull();
  rerender(<DmWorld view={dm()} send={send} />);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Oyuncuya açık' }));
  expect(send).toHaveBeenCalledWith({ type: 'world.show', visible: true });
});

it('karşılaşma paneli bölgeyi karakterin ana haritadaki yerinden alır; DM değiştirebilir', async () => {
  const send = vi.fn();
  render(<EncounterPanel view={dm({ region: 'arctic' })} send={send} />);
  expect(screen.getByLabelText('Bölge')).toHaveValue('arctic');
  expect(screen.getByText('Karakter ana haritada Kutup bölgesinde.')).toBeInTheDocument();
  await userEvent.click(screen.getByRole('button', { name: 'Rastgele üret' }));
  expect(send).toHaveBeenLastCalledWith({ type: 'encounter.generate', region: 'arctic', level: 4, difficulty: 'medium' });
  await userEvent.selectOptions(screen.getByLabelText('Bölge'), 'swamp');
  await userEvent.click(screen.getByRole('button', { name: 'Rastgele üret' }));
  expect(send).toHaveBeenLastCalledWith({ type: 'encounter.generate', region: 'swamp', level: 4, difficulty: 'medium' });
});

it('her arazi çizilir; aynı tohum aynı alanı, farklı tohum farklı alanı verir', () => {
  for (const terrain of REGIONS) {
    const { container, unmount } = render(<Terrain terrain={terrain} seed={7} aspect={0.75} />);
    const svg = container.querySelector('svg')!;
    expect(svg).toHaveAttribute('viewBox', '0 0 1000 750');
    expect(svg.querySelectorAll('*').length).toBeGreaterThan(40);
    expect(svg.innerHTML).not.toMatch(/NaN|undefined/);
    unmount();
  }
  const draw = (seed: number) => {
    const { container, unmount } = render(<Terrain terrain="forest" seed={seed} aspect={0.75} />);
    const html = container.innerHTML;
    unmount();
    return html;
  };
  expect(draw(7)).toBe(draw(7));
  expect(draw(7)).not.toBe(draw(8));
});

it('savaş alanı yüklenmiş harita yoksa araziyi çizer; harita varsa onu gösterir', () => {
  const props = { scale: { widthFt: 100, aspect: 0.75 }, pawns: [], onMove: vi.fn() };
  const { container, rerender } = render(<BoardSurface {...props} mapId={null} terrain="desert" seed={3} />);
  expect(container.querySelector('svg.terrain')).toHaveAttribute('data-terrain', 'desert');
  rerender(<BoardSurface {...props} mapId="battle-1" terrain="desert" seed={3} />);
  expect(container.querySelector('svg.terrain')).toBeNull();
  expect(screen.getByRole('img', { name: 'Savaş alanı' })).toBeInTheDocument();
  rerender(<BoardSurface {...props} mapId={null} terrain={null} />);
  expect(screen.getByText(/Boş alan/)).toBeInTheDocument();
});

it('oyuncu savaş yokken ana haritayı, savaş başlayınca savaş alanını görür', () => {
  const base: PlayerView = {
    role: 'player', code: 'ABC123', log: [], sheetId: null, character: hero, encounter: null, board: null,
    world: { mapId: 'world-1', aspect: 0.75, x: 0.4, y: 0.2 },
  };
  const { rerender } = render(<Battlefield view={base} send={vi.fn()} />);
  expect(screen.getByRole('img', { name: 'Ana harita' })).toHaveAttribute('src', '/api/files/world-1');
  expect(screen.getByRole('img', { name: 'Edo burada' })).toHaveStyle({ left: '40%', top: '20%' });

  const fighting: PlayerView = {
    ...base,
    encounter: { round: 1, phase: 'combat', theater: false, combatants: [{ id: 'c1', kind: 'character', name: 'Edo', initiative: 9, conditions: [], band: 'healthy', hp: 30, maxHp: 30, current: true, moveLeft: 30 }] },
    board: { mapId: null, widthFt: 100, aspect: 0.75, terrain: 'forest', seed: 5, daylight: 'day', tokens: [] },
  };
  rerender(<Battlefield view={fighting} send={vi.fn()} />);
  expect(screen.queryByRole('img', { name: 'Ana harita' })).toBeNull();
  expect(document.querySelector('svg.terrain')).toHaveAttribute('data-terrain', 'forest');

  rerender(<Battlefield view={{ ...base, world: null }} send={vi.fn()} />);
  expect(screen.getByText(/DM henüz bir harita açmadı/)).toBeInTheDocument();
});
