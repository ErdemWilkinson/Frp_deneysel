import { beforeEach, describe, expect, it } from 'vitest';
import { newTable, type LogEntry, type TableState } from '@masa/shared';
import { createLiteDb, migrate } from './db';
import { createStore, type Store } from './store';

const state: TableState = newTable('ABC123');
const entry = (id: string, visibility: LogEntry['visibility'] = 'public'): LogEntry =>
  ({ id, at: 1700000000000, actor: 'dm', visibility, kind: 'roll', text: `kayıt ${id}` });

let store: Store;
beforeEach(async () => {
  const db = await createLiteDb();
  await migrate(db);
  await migrate(db); // ikinci çalıştırma zararsız olmalı
  store = createStore(db);
});

describe('store', () => {
  it('masa yokken null döner; oluşturulunca geri okur', async () => {
    expect(await store.loadTable()).toBeNull();
    await store.createTable(state);
    expect(await store.loadTable()).toEqual(state);
  });

  it('durumu ve günlük kayıtlarını birlikte yazar, sırayı korur', async () => {
    await store.createTable(state);
    const next = { ...state, encounter: { id: 'e1', status: 'draft' as const, round: 0, turnIndex: 0, combatants: [] } };
    await store.commit(next, [entry('a'), entry('b', 'dm'), entry('c')]);
    expect(await store.loadTable()).toEqual(next);
    expect(await store.recentLog(10)).toEqual([entry('a'), entry('b', 'dm'), entry('c')]);
  });

  it('günlük kaydı olmadan da durumu yazar', async () => {
    await store.createTable(state);
    await store.commit({ ...state, code: 'XYZ789' }, []);
    expect((await store.loadTable())!.code).toBe('XYZ789');
  });

  it('günlük yazımı başarısız olursa durum da yazılmaz', async () => {
    await store.createTable(state);
    await store.commit(state, [entry('a')]);
    await expect(store.commit({ ...state, code: 'BROKEN' }, [entry('a')])).rejects.toThrow();
    expect((await store.loadTable())!.code).toBe('ABC123');
  });

  it('son kayıtları eski → yeni sırayla, sınırla döndürür', async () => {
    await store.createTable(state);
    await store.commit(state, [entry('a'), entry('b'), entry('c')]);
    expect((await store.recentLog(2)).map((l) => l.id)).toEqual(['b', 'c']);
  });

  it('bölge düzeltmelerini saklar ve üzerine yazar', async () => {
    await store.saveOverride('goblin', ['forest']);
    await store.saveOverride('goblin', ['urban', 'ruins']);
    expect(await store.loadOverrides()).toEqual({ goblin: ['urban', 'ruins'] });
  });
});
