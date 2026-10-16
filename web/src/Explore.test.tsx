import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { Monster } from '@masa/shared';
import { Gate } from './Gate';
import { Library } from './Library';
import { loadLocalCharacters, saveLocalCharacter } from './localCharacters';
import { Workshop } from './Workshop';

const goblin = {
  id: 'goblin', name: { tr: 'Goblin', en: 'Goblin' }, size: 'Small', type: 'humanoid', ac: 15, hp: 7, hitDice: '2d6',
  speed: '30 ft.', abilities: { str: 8, dex: 14, con: 10, int: 10, wis: 8, cha: 8 }, saves: {}, skills: {},
  resistances: [], immunities: [], vulnerabilities: [], defenseNotes: [], conditionImmunities: [],
  senses: '', languages: '', cr: 0.25, xp: 50, traits: [], actions: [], legendaryActions: [], legendaryCount: 0, regions: ['forest'],
} satisfies Partial<Monster> as unknown as Monster;

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.unstubAllGlobals());

it('ana menü, giriş yapmadan atölye ve kitaplığa bağlantı verir', () => {
  render(<Gate onEnter={vi.fn()} />);
  expect(screen.getByRole('link', { name: 'Karakter atölyesi' })).toHaveAttribute('href', '#atolye');
  expect(screen.getByRole('link', { name: 'Kitaplığa göz at' })).toHaveAttribute('href', '#kitap');
});

it('atölyede yeni karakter yapılır, tarayıcıya kaydedilir ve listede görünür', async () => {
  render(<Workshop />);
  await userEvent.click(screen.getByRole('button', { name: /Yeni karakter yap/ }));
  // Masa dışında zar atma düğmeleri yoktur.
  expect(screen.queryByRole('button', { name: 'Zar at' })).toBeNull();
  await userEvent.type(screen.getByLabelText('Karakter adı'), 'Arda');
  await userEvent.click(screen.getByRole('button', { name: 'Karakteri bu tarayıcıya kaydet' }));
  expect(loadLocalCharacters().map((c) => c.name)).toEqual(['Arda']);
  expect(within(screen.getByRole('list', { name: 'Kayıtlı karakterler' })).getByText('Arda')).toBeInTheDocument();
  expect(screen.getByRole('status')).toHaveTextContent('"Arda" bu tarayıcıya kaydedildi.');
});

it('atölyede kayıtlı karakter silinir', async () => {
  saveLocalCharacter({
    name: 'Bora', level: 3, ac: 14, maxHp: 20, hp: 20, tempHp: 0, speed: 30,
    abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, proficiency: 2, saveProficiencies: [], attacks: [],
  } as never);
  vi.stubGlobal('confirm', vi.fn(() => true));
  render(<Workshop />);
  await userEvent.click(screen.getByRole('button', { name: 'Bora sil' }));
  expect(loadLocalCharacters()).toEqual([]);
  expect(screen.getByText('Bu tarayıcıda henüz karakter yok.')).toBeInTheDocument();
});

it('bozuk depo atölyeyi çökertmez', () => {
  window.localStorage.setItem('masa.workshop.characters', '{bozuk');
  render(<Workshop />);
  expect(screen.getByText('Bu tarayıcıda henüz karakter yok.')).toBeInTheDocument();
});

it('kitaplık canavarları giriş olmadan, yalnızca okunur gösterir', async () => {
  vi.stubGlobal('fetch', vi.fn(async () => new Response(JSON.stringify([goblin]), { status: 200 })));
  render(<Library />);
  await userEvent.click(await screen.findByRole('button', { name: /Goblin/ }));
  expect(vi.mocked(fetch).mock.calls[0]![0]).toBe('/api/book/monsters');
  expect(screen.queryByRole('button', { name: 'Karşılaşmaya ekle' })).toBeNull();
  expect(screen.queryByRole('checkbox', { name: /Orman/ })).toBeNull();
  expect(screen.getByText(/Bölgeler: Orman/)).toBeInTheDocument();
});
