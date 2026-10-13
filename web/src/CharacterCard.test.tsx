import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, expect, it, vi } from 'vitest';
import { blankProfile, type Character } from '@masa/shared';
import { CharacterCard } from './CharacterCard';

const hero: Character = {
  name: 'Aria', level: 3, ac: 16, maxHp: 24, hp: 24, tempHp: 0, speed: 30,
  abilities: { str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 8 }, proficiency: 2,
  saveProficiencies: ['str', 'con'], attacks: [{ name: 'Uzun Kılıç', bonus: 5, damage: '1d8+3', type: 'slashing', range: 5 }],
  deathSaves: { successes: 0, failures: 0 }, dead: false,
};

it('boş kartı doldurup kaydedince sayıları sayı olarak gönderir', async () => {
  const send = vi.fn();
  render(<CharacterCard character={null} send={send} />);
  await userEvent.type(screen.getByLabelText('Karakter adı'), 'Borin');
  await userEvent.clear(screen.getByLabelText('Zırh sınıfı'));
  await userEvent.type(screen.getByLabelText('Zırh sınıfı'), '18');
  await userEvent.click(screen.getByRole('button', { name: 'Kartı kaydet' }));
  const sent = send.mock.calls[0]![0];
  expect(sent.type).toBe('character.set');
  expect(sent.character).toMatchObject({ name: 'Borin', ac: 18, level: 1, attacks: [] });
});

it('kurtarma zarı düğmesi yeteneği gönderir', async () => {
  const send = vi.fn();
  render(<CharacterCard character={hero} send={send} />);
  await userEvent.click(screen.getByRole('button', { name: 'Dayanıklılık kurtarma zarı' }));
  expect(send).toHaveBeenCalledWith({ type: 'character.save', ability: 'con', mode: 'normal' });
});

it('ölüm zarı düğmesi yalnızca karakter yerdeyken görünür', () => {
  const { rerender } = render(<CharacterCard character={hero} send={vi.fn()} />);
  expect(screen.queryByRole('button', { name: 'Ölüm kurtarma zarı at' })).toBeNull();
  rerender(<CharacterCard character={{ ...hero, hp: 0 }} send={vi.fn()} />);
  expect(screen.getByRole('button', { name: 'Ölüm kurtarma zarı at' })).toBeInTheDocument();
});

it('sunucudan gelen can puanı değişikliği forma yansır', () => {
  const { rerender } = render(<CharacterCard character={hero} send={vi.fn()} />);
  rerender(<CharacterCard character={{ ...hero, hp: 9 }} send={vi.fn()} />);
  expect(screen.getByLabelText('Can puanı')).toHaveValue(9);
});

afterEach(() => vi.unstubAllGlobals());
const sheet = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], 'sayfa.png', { type: 'image/png' });

it('sayfa resmi okutulunca kart dolar ama kaydedilmeden masaya işlenmez', async () => {
  const read = { name: 'Thorin', level: 4, ac: 18, maxHp: 40, hp: 31, speed: 25, abilities: { str: 17 }, hacked: true,
    attacks: [{ name: 'Battleaxe', bonus: 5, damage: '1d8+3', type: 'slashing', range: 5 }] };
  const fetchMock = vi.fn(async () => new Response(JSON.stringify({ character: read }), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  const send = vi.fn();
  render(<CharacterCard character={null} send={send} />);
  await userEvent.upload(screen.getByLabelText('Sayfa resminden doldur'), sheet);
  expect(await screen.findByText(/Kart sayfadan dolduruldu/)).toBeInTheDocument();
  expect(fetchMock).toHaveBeenCalledWith('/api/sheet/read', expect.objectContaining({ method: 'POST', body: sheet }));
  expect(screen.getByLabelText('Karakter adı')).toHaveValue('Thorin');
  expect(screen.getByLabelText('Hız (fit)')).toHaveValue(25);
  expect(screen.getByLabelText('Saldırı adı')).toHaveValue('Battleaxe');
  expect(send).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Kartı kaydet' }));
  expect(send.mock.calls[0]![0].character).toMatchObject({ name: 'Thorin', ac: 18, hp: 31, speed: 25 });
  expect(send.mock.calls[0]![0].character).not.toHaveProperty('hacked');
});

it('sayfa okunamazsa nedenini söyler ve yazılanı silmez', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ error: 'Sayfa okunamadı; daha net bir resimle yeniden dene' }), { status: 502 })));
  render(<CharacterCard character={null} send={vi.fn()} />);
  await userEvent.type(screen.getByLabelText('Karakter adı'), 'Borin');
  await userEvent.upload(screen.getByLabelText('Sayfa resminden doldur'), sheet);
  expect(await screen.findByText('Sayfa okunamadı; daha net bir resimle yeniden dene')).toBeInTheDocument();
  expect(screen.getByLabelText('Karakter adı')).toHaveValue('Borin');
});

it('ad okunamasa da okunan sayılar karta geçer; ad boş kalır', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ character: { ac: 18, maxHp: 40, hp: 31 } }), { status: 200 })));
  render(<CharacterCard character={null} send={vi.fn()} />);
  await userEvent.upload(screen.getByLabelText('Sayfa resminden doldur'), sheet);
  expect(await screen.findByText(/ad okunamadı/)).toBeInTheDocument();
  expect(screen.getByLabelText('Karakter adı')).toHaveValue('');
  expect(screen.getByLabelText('Zırh sınıfı')).toHaveValue(18);
  expect(screen.getByLabelText('En fazla can puanı')).toHaveValue(40);
});

it('hiçbir değer okunamadıysa bunu söyler', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify({ character: {} }), { status: 200 })));
  render(<CharacterCard character={null} send={vi.fn()} />);
  await userEvent.upload(screen.getByLabelText('Sayfa resminden doldur'), sheet);
  expect(await screen.findByText(/hiçbir değer okunamadı/)).toBeInTheDocument();
});

it('kâğıt sayfadaki künye, beceri ve öykü alanlarını gönderir; bonuslar anında hesaplanır', async () => {
  const send = vi.fn();
  render(<CharacterCard character={hero} send={send} />);
  await userEvent.selectOptions(screen.getByLabelText('Sınıf'), 'Barbar');
  await userEvent.type(screen.getByLabelText('Kusurlar'), 'Büyücü nefreti');
  await userEvent.selectOptions(screen.getByLabelText('Atletizm yetkinliği'), 'proficient');
  await userEvent.selectOptions(screen.getByLabelText('Algı yetkinliği'), 'expertise');
  // Kuvvet 16 → +3 ve yetkinlik +2; Algı: Bilgelik 10 → 0 ve uzmanlık +4 → pasif algı 14
  expect(screen.getByText('Pasif algı (Bilgelik)').closest('p')).toHaveTextContent('14');
  await userEvent.click(screen.getByRole('button', { name: 'Atletizm zarı' }));
  expect(send).toHaveBeenCalledWith({ type: 'character.check', skill: 'athletics', mode: 'normal' });
  await userEvent.click(screen.getByRole('button', { name: 'Kartı kaydet' }));
  expect(send.mock.calls.at(-1)![0].character.profile).toMatchObject({
    className: 'Barbar', flaws: 'Büyücü nefreti', skills: { athletics: 'proficient', perception: 'expertise' },
  });
});

it('ırk açılır listeden seçilir; listede olmayan eski ırk kaybolmaz', async () => {
  const send = vi.fn();
  const { rerender } = render(<CharacterCard character={null} send={send} />);
  const race = screen.getByLabelText('Irk');
  expect(race.tagName).toBe('SELECT');
  await userEvent.selectOptions(race, 'Dağ cücesi');
  expect(race).toHaveValue('Dağ cücesi');
  rerender(<CharacterCard character={{ ...hero, profile: { ...blankProfile(), race: 'Aasimar' } }} send={send} />);
  expect(screen.getByRole('option', { name: 'Aasimar' })).toBeInTheDocument();
});

it('ırk seçilince yürüme hızı kartta güncellenir', async () => {
  render(<CharacterCard character={null} send={vi.fn()} />);
  await userEvent.selectOptions(screen.getByLabelText('Irk'), 'Cüce');
  expect(screen.getByLabelText('Hız (fit)')).toHaveValue(25);
});
