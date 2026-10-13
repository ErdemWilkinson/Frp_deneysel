import { describe, expect, it } from 'vitest';
import type { TableState } from '@masa/shared';
import { IntentError } from './context';
import { emptyState, heroInput, run } from './fixtures';

const withHero = (): TableState => run(emptyState, 'player', { type: 'character.set', character: heroInput }).state;
const add = (s: TableState, role: 'dm' | 'player', item: object) => run(s, role, { type: 'inventory.add', ...item });
const bag = (s: TableState) => s.character!.inventory!;

describe('çanta', () => {
  it('oyuncu eşyayı doğrudan ekler; günlüğe yazılır', () => {
    const out = add(withHero(), 'player', { name: 'Meşale', qty: 3, light: 20 });
    expect(bag(out.state)).toMatchObject([{ name: 'Meşale', qty: 3, light: 20, lit: false }]);
    expect(out.log[0]!.text).toBe('Aria çantasına eklendi: Meşale ×3');
  });

  it('DM de oyuncunun çantasına eşya ekler', () => {
    const out = add(withHero(), 'dm', { name: 'Gümüş anahtar', note: 'Kuleye açılır' });
    expect(bag(out.state)).toMatchObject([{ name: 'Gümüş anahtar', qty: 1, note: 'Kuleye açılır' }]);
    expect(out.log[0]!.text).toBe('DM, Aria karakterinin çantasına eklendi: Gümüş anahtar');
  });

  it('aynı eşya yeniden eklenince adedi artar', () => {
    let s = add(withHero(), 'player', { name: 'Ok', qty: 10 }).state;
    s = add(s, 'player', { name: 'ok', qty: 5 }).state;
    expect(bag(s)).toHaveLength(1);
    expect(bag(s)[0]!.qty).toBe(15);
  });

  it('adet değişir, sıfıra inince eşya çantadan çıkar; çıkar düğmesi de siler', () => {
    let s = add(withHero(), 'player', { name: 'İksir', qty: 2 }).state;
    const id = bag(s)[0]!.id;
    s = run(s, 'player', { type: 'inventory.update', itemId: id, qty: 1 }).state;
    expect(bag(s)[0]!.qty).toBe(1);
    s = run(s, 'player', { type: 'inventory.update', itemId: id, qty: 0 }).state;
    expect(bag(s)).toEqual([]);

    s = add(s, 'player', { name: 'Kürek' }).state;
    s = run(s, 'player', { type: 'inventory.remove', itemId: bag(s)[0]!.id }).state;
    expect(bag(s)).toEqual([]);
  });

  it('ışık veren eşya yakılıp söndürülür; ışık vermeyen yakılamaz', () => {
    let s = add(withHero(), 'player', { name: 'Fener', light: 30 }).state;
    s = add(s, 'player', { name: 'Kürek' }).state;
    const [lamp, shovel] = bag(s);
    const lit = run(s, 'player', { type: 'inventory.update', itemId: lamp!.id, lit: true });
    expect(bag(lit.state)[0]!.lit).toBe(true);
    expect(lit.log[0]!.text).toBe('Aria: Fener yakıldı');
    expect(() => run(s, 'player', { type: 'inventory.update', itemId: shovel!.id, lit: true })).toThrow('ışık vermez');
  });

  it('kart formu kaydedilince aynı karakterin çantası korunur', () => {
    let s = add(withHero(), 'player', { name: 'Meşale', light: 20 }).state;
    s = run(s, 'player', { type: 'character.set', character: { ...heroInput, hp: 20 } }).state;
    expect(bag(s)).toHaveLength(1);
    expect(s.character!.hp).toBe(20);
  });

  it('geçersiz eşyayı reddeder', () => {
    const s = withHero();
    expect(() => add(s, 'player', { name: '   ' })).toThrow(IntentError);
    expect(() => add(s, 'player', { name: 'Ok', qty: 0 })).toThrow(IntentError);
    expect(() => add(s, 'player', { name: 'Ok', light: -5 })).toThrow(IntentError);
    expect(() => run(s, 'player', { type: 'inventory.remove', itemId: 'yok' })).toThrow('bulunamadı');
    expect(() => add(emptyState, 'player', { name: 'Ok' })).toThrow('karakter kartı');
  });
});
