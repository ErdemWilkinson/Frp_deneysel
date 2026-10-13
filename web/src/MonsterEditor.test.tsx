import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import type { LogEntry, Monster } from '@masa/shared';
import { Bestiary } from './Bestiary';
import { CharacterCard, readCharacter } from './CharacterCard';
import { DiceLog } from './DiceLog';
import { MonsterEditor, averageHp, customId } from './MonsterEditor';

const wolf: Monster = {
  id: 'custom-gece-kurdu-abc', name: { tr: 'Gece Kurdu', en: 'Gece Kurdu' }, size: 'Large', type: 'monstrosity',
  ac: 14, hp: 45, hitDice: '6d10+12', speed: '50 ft.', cr: 3, xp: 700,
  abilities: { str: 18, dex: 15, con: 14, int: 6, wis: 12, cha: 8 }, saves: { dex: 4 }, skills: {},
  resistances: ['cold'], immunities: [], vulnerabilities: [], defenseNotes: [], conditionImmunities: [],
  senses: '', languages: '', regions: ['forest'], legendaryActions: [], legendaryCount: 0,
  traits: [{ name: { tr: 'Karanlıkta Av', en: 'Karanlıkta Av' }, text: { tr: 'Karanlıkta avantajlıdır.', en: 'Karanlıkta avantajlıdır.' } }],
  actions: [{ name: { tr: 'Isırık', en: 'Isırık' }, text: { tr: null, en: 'Isırık' }, attack: { bonus: 6, damage: [{ dice: '2d6+4', type: 'piercing' }] } }],
};
const goblin: Monster = { ...wolf, id: 'goblin', name: { tr: 'Goblin', en: 'Goblin' }, traits: [], cr: 0.25 };

it('kimliği sunucunun kabul ettiği biçimde, Türkçe harfleri sadeleştirerek üretir', () => {
  expect(customId('Gölge Şövalyesi İğde', 46655)).toBe('custom-golge-sovalyesi-igde-zzz');
  expect(customId('!!!', 1)).toBe('custom-yaratik-1');
  expect(customId('a'.repeat(80), 1)).toMatch(/^custom-[a-z0-9-]{1,60}$/);
});

it('can zarının ortalamasını hesaplar; okunamayan zarda null döner', () => {
  expect(averageHp('6d10+12')).toBe(45);
  expect(averageHp('2d6')).toBe(7);
  expect(averageHp('çok')).toBeNull();
});

it('yeni yaratığı sayıları sayı olarak, saldırısıyla birlikte gönderir', async () => {
  const send = vi.fn();
  const onSaved = vi.fn();
  render(<MonsterEditor editing={null} types={['beast', 'undead']} send={send} onSaved={onSaved} />);
  await userEvent.type(screen.getByLabelText('Ad'), 'Gece Kurdu');
  await userEvent.selectOptions(screen.getByLabelText('Meydan okuma derecesi'), '3');
  await userEvent.clear(screen.getByLabelText('Can zarı'));
  await userEvent.type(screen.getByLabelText('Can zarı'), '6d10+12');
  await userEvent.click(screen.getByRole('button', { name: /Can puanını can zarının ortalaması yap \(45\)/ }));
  await userEvent.type(screen.getByLabelText('Çeviklik kurtarma bonusu'), '4');
  await userEvent.click(screen.getByText('Direnç'));
  await userEvent.click(within(screen.getByRole('group', { name: 'Direnç' })).getByRole('checkbox', { name: 'soğuk' }));
  await userEvent.type(screen.getByLabelText('Eylem adı'), 'Isırık');
  await userEvent.click(screen.getByRole('button', { name: 'Özellik ekle' }));
  await userEvent.type(screen.getByLabelText('Özellik adı'), 'Karanlıkta Av');
  await userEvent.click(screen.getByRole('button', { name: 'Yaratığı kitaba ekle' }));

  const sent = send.mock.calls[0]![0];
  expect(sent.type).toBe('monster.save');
  expect(sent.monster).toMatchObject({
    id: expect.stringMatching(/^custom-gece-kurdu-[a-z0-9]+$/), name: 'Gece Kurdu', cr: 3, xp: 700, hp: 45, hitDice: '6d10+12',
    saves: { dex: 4 }, resistances: ['cold'], traits: [{ name: 'Karanlıkta Av', text: '' }],
    actions: [{ name: 'Isırık', text: '', attack: { bonus: 3, damage: [{ dice: '1d6+1', type: 'slashing' }] } }],
  });
  expect(onSaved).toHaveBeenCalledWith(sent.monster.id, false);
  expect(screen.getByLabelText('Ad')).toHaveValue('');
});

it('düzenlerken kimliği korur; saldırı zarı kapatılan eylem metin olarak gider', async () => {
  const send = vi.fn();
  render(<MonsterEditor editing={wolf} types={[]} send={send} onSaved={vi.fn()} onCancel={vi.fn()} />);
  expect(screen.getByLabelText('Ad')).toHaveValue('Gece Kurdu');
  expect(screen.getByLabelText('Çeviklik kurtarma bonusu')).toHaveValue(4);
  await userEvent.click(screen.getByRole('checkbox', { name: 'Saldırı zarı atılır' }));
  await userEvent.type(screen.getByLabelText('Eylem metni'), 'Hedef yere düşer.');
  await userEvent.click(screen.getByRole('button', { name: 'Değişiklikleri kaydet' }));
  const { monster } = send.mock.calls[0]![0];
  expect(monster.id).toBe('custom-gece-kurdu-abc');
  expect(monster.actions).toEqual([{ name: 'Isırık', text: 'Hedef yere düşer.' }]);
  expect(monster.traits).toEqual([{ name: 'Karanlıkta Av', text: 'Karanlıkta avantajlıdır.' }]);
});

it('kitap: yalnızca kendi yaratığında düzenle ve sil vardır; silme onay ister', async () => {
  const send = vi.fn();
  const onEdit = vi.fn();
  const onDeleted = vi.fn();
  const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);
  render(<Bestiary monsters={[goblin, wolf]} send={send} onRegions={vi.fn()} onEdit={onEdit} onDeleted={onDeleted} />);
  const list = screen.getByRole('list', { name: 'Canavarlar' });
  await userEvent.click(within(list).getByRole('button', { name: /Goblin/ }));
  expect(screen.queryByRole('button', { name: 'Kitaptan sil' })).toBeNull();

  await userEvent.click(screen.getByRole('checkbox', { name: 'Yalnızca kendi yarattıklarım' }));
  expect(within(list).getAllByRole('listitem')).toHaveLength(1);
  await userEvent.click(within(list).getByRole('button', { name: /Gece Kurdu/ }));
  await userEvent.click(screen.getByRole('button', { name: 'Düzenle' }));
  expect(onEdit).toHaveBeenCalledWith(wolf);
  await userEvent.click(screen.getByRole('button', { name: 'Kitaptan sil' }));
  expect(send).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Kitaptan sil' }));
  expect(send).toHaveBeenCalledWith({ type: 'monster.delete', monsterId: 'custom-gece-kurdu-abc' });
  expect(onDeleted).toHaveBeenCalled();
  confirm.mockRestore();
});

it('hızlı zar düğmeleri seçili kip ve gizlilikle atar', async () => {
  const send = vi.fn();
  render(<DiceLog log={[] as LogEntry[]} send={send} canSecret />);
  const quick = within(screen.getByRole('group', { name: 'Hızlı zar' }));
  expect(quick.getAllByRole('button').map((b) => b.textContent)).toEqual(['d4', 'd6', 'd8', 'd10', 'd12', 'd20', 'd100']);
  await userEvent.click(quick.getByRole('button', { name: 'd20' }));
  await userEvent.selectOptions(screen.getByLabelText('Zar kipi'), 'advantage');
  await userEvent.click(screen.getByRole('checkbox', { name: 'Gizli' }));
  await userEvent.click(quick.getByRole('button', { name: 'd100' }));
  expect(send.mock.calls.map((c) => c[0])).toEqual([
    { type: 'roll', expr: '1d20', mode: 'normal' },
    { type: 'roll', expr: '1d100', mode: 'advantage', secret: true },
  ]);
});

it('kart dosyasını okur: tanımadığı alanı ve bozuk saldırıyı atar, kart olmayanı reddeder', () => {
  const read = readCharacter({
    format: 'acik-masa-karakter', version: 1,
    character: {
      name: ' Borin ', level: 5, ac: 18, maxHp: 44, hp: 30, isAdmin: true, abilities: { str: 17, dex: 'on' },
      saveProficiencies: ['con', 'luck'],
      attacks: [{ name: 'Balta', bonus: 6, damage: '1d12+3', type: 'slashing' }, { name: 'Lazer', bonus: 1, damage: '1d4', type: 'laser' }],
    },
  });
  expect(read).toMatchObject({
    name: 'Borin', level: 5, ac: 18, maxHp: 44, hp: 30, tempHp: 0, saveProficiencies: ['con'],
    abilities: { str: 17, dex: 10 }, attacks: [{ name: 'Balta', bonus: 6, damage: '1d12+3', type: 'slashing', range: 5 }],
  });
  expect(read).not.toHaveProperty('isAdmin');
  expect(readCharacter({ name: 'Bare', level: 2 })).toMatchObject({ name: 'Bare', level: 2 });
  expect(readCharacter({ monsters: [] })).toBeNull();
  expect(readCharacter(null)).toBeNull();
  expect(readCharacter('metin')).toBeNull();
});

it('içe aktarılan kart formu doldurur ama kaydetmeden masaya işlemez', async () => {
  const send = vi.fn();
  render(<CharacterCard character={null} send={send} />);
  const file = new File([JSON.stringify({ character: { name: 'Borin', level: 5, ac: 18 } })], 'borin.json', { type: 'application/json' });
  await userEvent.upload(screen.getByLabelText('Dosyadan içe aktar'), file);
  expect(await screen.findByRole('status')).toHaveTextContent('Kart dosyadan dolduruldu');
  expect(screen.getByLabelText('Karakter adı')).toHaveValue('Borin');
  expect(send).not.toHaveBeenCalled();
  await userEvent.click(screen.getByRole('button', { name: 'Kartı kaydet' }));
  expect(send.mock.calls[0]![0].character).toMatchObject({ name: 'Borin', level: 5, ac: 18 });

  const bad = new File(['bu json değil'], 'not.json', { type: 'application/json' });
  await userEvent.upload(screen.getByLabelText('Dosyadan içe aktar'), bad);
  expect(await screen.findByText(/Bu dosya bir karakter kartı değil/)).toBeInTheDocument();
  expect(screen.getByLabelText('Karakter adı')).toHaveValue('Borin');
});
