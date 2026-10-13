import type { Character, InventoryItem } from '@masa/shared';
import { character, fail, say, type Raw, type Work } from './context';
import { int, text } from './validate';

export const MAX_ITEMS = 60;
export const MAX_QTY = 999;

const noteOf = (v: unknown): string => {
  if (v === undefined || v === null || v === '') return '';
  return typeof v === 'string' && v.trim().length <= 120 ? v.trim() : fail('Eşya notu en fazla 120 karakter olabilir');
};

/** Kaydedilmiş bir karakterle gelen çantayı doğrular. Kimliği olmayan eşyaya yeni kimlik verilir. */
export function parseInventory(input: unknown, newId: () => string): InventoryItem[] {
  if (!Array.isArray(input)) return [];
  if (input.length > MAX_ITEMS) fail(`Çantada en fazla ${MAX_ITEMS} eşya olabilir`);
  return input.map((raw: any) => {
    const light = int(raw?.light ?? 0, 0, 120, 'Işık yarıçapı');
    return {
      id: typeof raw?.id === 'string' && raw.id.length > 0 && raw.id.length <= 64 ? raw.id : newId(),
      name: text(raw?.name, 40, 'Eşya adı'),
      qty: int(raw?.qty ?? 1, 1, MAX_QTY, 'Adet'),
      note: noteOf(raw?.note),
      light,
      lit: light > 0 && raw?.lit === true,
    };
  });
}

const bag = (c: Character): InventoryItem[] => (c.inventory ??= []);
const owner = (w: Work, c: Character): string => (w.role === 'dm' ? `DM, ${c.name} karakterinin çantasına` : `${c.name} çantasına`);

export function addItem(w: Work, i: Raw): void {
  const c = character(w);
  const items = bag(c);
  const name = text(i.name, 40, 'Eşya adı');
  const qty = int(i.qty ?? 1, 1, MAX_QTY, 'Adet');
  const light = int(i.light ?? 0, 0, 120, 'Işık yarıçapı');
  const note = noteOf(i.note);
  // Aynı ad ve aynı ışıkla gelen eşya, var olanın adedine eklenir.
  const same = items.find((x) => x.name.toLowerCase() === name.toLowerCase() && x.light === light);
  if (same) {
    same.qty = Math.min(MAX_QTY, same.qty + qty);
    if (note) same.note = note;
  } else {
    if (items.length >= MAX_ITEMS) fail(`Çantada en fazla ${MAX_ITEMS} eşya olabilir`);
    items.push({ id: w.ctx.newId(), name, qty, note, light, lit: false });
  }
  say(w, 'manual', `${owner(w, c)} eklendi: ${name}${qty > 1 ? ` ×${qty}` : ''}`);
}

function itemOf(c: Character, id: unknown): InventoryItem {
  return bag(c).find((x) => x.id === id) ?? fail('Eşya bulunamadı');
}

export function updateItem(w: Work, i: Raw): void {
  const c = character(w);
  const item = itemOf(c, i.itemId);
  if (i.name !== undefined) item.name = text(i.name, 40, 'Eşya adı');
  if (i.note !== undefined) item.note = noteOf(i.note);
  if (i.qty !== undefined) {
    const qty = int(i.qty, 0, MAX_QTY, 'Adet');
    if (qty === 0) { removeFrom(c, item.id); return say(w, 'manual', `${c.name}: ${item.name} tükendi`); }
    item.qty = qty;
  }
  if (i.lit !== undefined) {
    if (typeof i.lit !== 'boolean') fail('Işık durumu geçersiz');
    if (i.lit && item.light === 0) fail(`${item.name} ışık vermez`);
    if (item.lit !== i.lit) {
      item.lit = i.lit;
      say(w, 'manual', `${c.name}: ${item.name} ${i.lit ? 'yakıldı' : 'söndürüldü'}`);
    }
  }
}

function removeFrom(c: Character, id: string): void {
  c.inventory = bag(c).filter((x) => x.id !== id);
}

export function removeItem(w: Work, i: Raw): void {
  const c = character(w);
  const item = itemOf(c, i.itemId);
  removeFrom(c, item.id);
  say(w, 'manual', `${c.name}: ${item.name} çantadan çıkarıldı`);
}
