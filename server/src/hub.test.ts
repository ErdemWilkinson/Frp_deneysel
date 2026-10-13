import { beforeEach, describe, expect, it } from 'vitest';
import { newTable, type DmView, type PlayerView, type ServerMessage } from '@masa/shared';
import { createLiteDb, migrate, type Db } from './db';
import { heroInput, monsters, newId } from './game/fixtures';
import { createHub, type Client } from './hub';
import { createStore, type Store } from './store';

let db: Db;
let store: Store;
const boot = (s: Store = store) =>
  createHub({ store: s, monsters: monsters(), rng: (sides) => Math.min(10, sides), now: () => 1000, newId });

function client(role: Client['role']) {
  const inbox: ServerMessage[] = [];
  const c: Client = { role, send: (m) => inbox.push(m) };
  const last = <T>() => {
    const m = inbox.at(-1);
    if (m?.type !== 'state') throw new Error('son mesaj durum değil');
    return m.view as T;
  };
  return { c, inbox, last };
}
const msg = (intent: object, id = 1) => JSON.stringify({ id, intent });
const addGoblin = { type: 'encounter.addMonster', monsterId: 'goblin', count: 1, hpMode: 'average' };

beforeEach(async () => {
  db = await createLiteDb();
  await migrate(db);
  store = createStore(db);
  await store.createTable(newTable('ABC123'));
});

describe('hub', () => {
  it('katılan istemciye hemen kendi görünümünü gönderir', async () => {
    const hub = await boot();
    const dm = client('dm');
    hub.join(dm.c);
    expect(dm.last<DmView>()).toMatchObject({ role: 'dm', code: 'ABC123', encounter: null });
    expect(hub.code()).toBe('ABC123');
  });

  it('hamleyi uygular ve herkese role göre süzülmüş görünüm yayınlar', async () => {
    const hub = await boot();
    const dm = client('dm');
    const player = client('player');
    hub.join(dm.c);
    hub.join(player.c);
    await hub.submit(player.c, msg({ type: 'character.set', character: heroInput }));
    await hub.submit(dm.c, msg(addGoblin));
    await hub.submit(dm.c, msg({ type: 'encounter.start' }));
    expect(dm.last<DmView>().encounter!.combatants).toHaveLength(2);
    expect(JSON.stringify(player.last<PlayerView>())).not.toContain('monsterId');
    expect(player.last<PlayerView>().encounter!.combatants.map((c) => c.name).sort()).toEqual(['Aria', 'Goblin 1']);
  });

  it('reddedilen hamlede yalnızca gönderene hata döner ve durum değişmez', async () => {
    const hub = await boot();
    const dm = client('dm');
    const player = client('player');
    hub.join(dm.c);
    hub.join(player.c);
    await hub.submit(player.c, msg(addGoblin, 7));
    expect(player.inbox.at(-1)).toEqual({ type: 'error', id: 7, message: 'Bu işlem yalnızca DM içindir' });
    expect(dm.inbox).toHaveLength(1);
    expect(await store.loadTable()).toMatchObject({ encounter: null });
  });

  it.each([
    ['geçersiz JSON', '{nope'],
    ['intent alanı yok', '{"id":3}'],
    ['dizi', '[]'],
    ['çok büyük mesaj', JSON.stringify({ id: 1, intent: { type: 'roll', expr: 'x'.repeat(30_000) } })],
  ])('bozuk mesajda çökmez: %s', async (_label, raw) => {
    const hub = await boot();
    const dm = client('dm');
    hub.join(dm.c);
    await hub.submit(dm.c, raw);
    expect(dm.inbox.at(-1)!.type).toBe('error');
    await hub.submit(dm.c, msg({ type: 'roll', expr: '1d20' }));
    expect(dm.last<DmView>().log).toHaveLength(1);
  });

  it('aynı anda gelen hamleleri sırayla işler; hiçbiri kaybolmaz', async () => {
    const hub = await boot();
    const dm = client('dm');
    hub.join(dm.c);
    await Promise.all([1, 2, 3, 4, 5].map((n) => hub.submit(dm.c, msg(addGoblin, n))));
    const names = dm.last<DmView>().encounter!.combatants.map((c) => (c.kind === 'monster' ? c.name : ''));
    expect(names).toEqual(['Goblin 1', 'Goblin 2', 'Goblin 3', 'Goblin 4', 'Goblin 5']);
    expect((await store.loadTable())!.encounter!.combatants).toHaveLength(5);
  });

  it('yeniden başlatılınca dövüş ve günlük kaldığı yerden devam eder', async () => {
    const first = await boot();
    const dm = client('dm');
    const player = client('player');
    first.join(dm.c);
    first.join(player.c);
    await first.submit(dm.c, msg({ type: 'character.set', character: heroInput }));
    await first.submit(dm.c, msg(addGoblin));
    await first.submit(dm.c, msg({ type: 'encounter.start' }));
    await first.submit(dm.c, msg({ type: 'combat.rollInitiative' }));
    await first.submit(player.c, msg({ type: 'combat.rollInitiative' }));
    await first.submit(dm.c, msg({ type: 'combat.begin' }));
    await first.submit(dm.c, msg({ type: 'combat.nextTurn' }));
    const before = dm.last<DmView>();

    const second = await boot();
    const again = client('dm');
    second.join(again.c);
    expect(again.last<DmView>()).toEqual(before);
    expect(again.last<DmView>().encounter).toMatchObject({ status: 'active', turnIndex: 1 });
  });

  it('veritabanı yazımı başarısız olursa durum değişmez ve yayın yapılmaz', async () => {
    const broken: Store = { ...store, commit: async () => { throw new Error('bağlantı koptu'); } };
    const hub = await boot(broken);
    const dm = client('dm');
    hub.join(dm.c);
    await hub.submit(dm.c, msg(addGoblin, 4));
    expect(dm.inbox.at(-1)).toEqual({ type: 'error', id: 4, message: 'Sunucu hatası; değişiklik kaydedilmedi' });
    expect(dm.inbox.filter((m) => m.type === 'state')).toHaveLength(1);
  });

  it('ayrılan istemciye yayın yapmaz', async () => {
    const hub = await boot();
    const dm = client('dm');
    const leave = hub.join(dm.c);
    leave();
    await hub.submit(client('dm').c, msg(addGoblin));
    expect(dm.inbox).toHaveLength(1);
  });

  it('bölge düzeltmesini kaydeder ve yeniden başlatmada uygular', async () => {
    const hub = await boot();
    await hub.submit(client('dm').c, msg({ type: 'monster.setRegions', monsterId: 'goblin', regions: ['urban'] }));
    expect(await store.loadOverrides()).toEqual({ goblin: ['urban'] });

    const catalog = monsters();
    await createHub({ store, monsters: catalog, rng: () => 1, now: () => 1000, newId });
    expect(catalog.get('goblin')!.regions).toEqual(['urban']);
  });
});
