import { beforeEach, expect, it } from 'vitest';
import request from 'supertest';
import { newTable, type DmView, type PlayerView, type ServerMessage } from '@masa/shared';
import { createLiteDb, migrate } from './db';
import { heroInput, monsters, newId } from './game/fixtures';
import { createApp, type AppDeps } from './http';
import { createHub, type Client } from './hub';
import { createStore, type Store } from './store';

let store: Store;
beforeEach(async () => {
  const db = await createLiteDb();
  await migrate(db);
  store = createStore(db);
  await store.createTable(newTable('ABC123'));
});

const boot = () => createHub({ store, monsters: monsters(), rng: () => 10, now: () => 1000, newId });
const client = (role: Client['role']) => {
  const inbox: ServerMessage[] = [];
  return { c: { role, send: (m: ServerMessage) => { inbox.push(m); } } as Client, inbox };
};
const send = (intent: object) => JSON.stringify({ id: 1, intent });
/** Karakteri, bir goblinle süren savaşı ve haritası olan bir masa. */
async function played() {
  const hub = await boot();
  const dm = client('dm');
  const player = client('player');
  hub.join(dm.c);
  hub.join(player.c);
  await hub.submit(player.c, send({ type: 'character.set', character: heroInput }));
  await hub.submit(dm.c, send({ type: 'board.setMap', mapId: 'map-1' }));
  await hub.submit(dm.c, send({ type: 'encounter.addMonster', monsterId: 'goblin', count: 1, hpMode: 'average' }));
  await hub.submit(dm.c, send({ type: 'encounter.start' }));
  await hub.submit(dm.c, send({ type: 'combat.rollInitiative' }));
  await hub.submit(player.c, send({ type: 'combat.rollInitiative' }));
  await hub.submit(dm.c, send({ type: 'combat.begin' }));
  return { hub, dm, player };
}
const last = <T>(x: { inbox: ServerMessage[] }) => (x.inbox.at(-1) as unknown as { view: T }).view;

it('yeni oyun masayı temizler, kodu korur ve iki tarafa da boş masayı yayınlar', async () => {
  const { hub, dm, player } = await played();
  await hub.reset();
  expect(last<DmView>(dm)).toMatchObject({
    code: 'ABC123', character: null, encounter: null, sheetId: null, board: { mapId: null, visible: false, tokens: [] },
  });
  expect(last<PlayerView>(player)).toMatchObject({ character: null, encounter: null, board: null });
  expect(last<PlayerView>(player).log.map((e) => e.text)).toEqual(['Yeni oyun başladı']);
});

it('yeni oyun kalıcıdır; karakter defteri silinmez', async () => {
  const { hub } = await played();
  await hub.reset();
  const again = await boot();
  const dm = client('dm');
  again.join(dm.c);
  expect(last<DmView>(dm)).toMatchObject({ character: null, encounter: null });
  expect(last<DmView>(dm).log).toHaveLength(1);
  expect((await store.listCharacters()).map((c) => c.name)).toEqual(['Aria']);
});

it('kaydedilen oyun, yeni oyundan sonra olduğu gibi geri yüklenir', async () => {
  const { hub, dm, player } = await played();
  await store.saveGame({ id: 's1', name: 'Orman yolu', state: hub.snapshot(), at: 5 });
  expect(await store.listGames()).toEqual([{ id: 's1', name: 'Orman yolu', at: 5, hero: 'Aria' }]);
  await hub.reset();
  const saved = (await store.loadGame('s1'))!;
  await hub.restore(saved.state, saved.name);
  const view = last<DmView>(dm);
  expect(view.character?.name).toBe('Aria');
  expect(view.encounter).toMatchObject({ status: 'active', combatants: expect.arrayContaining([expect.objectContaining({ name: 'Goblin 1' })]) });
  expect(view.board).toMatchObject({ mapId: 'map-1', visible: true });
  expect(last<PlayerView>(player).log.map((e) => e.text)).toEqual(['Kayıtlı oyun yüklendi: Orman yolu']);
  expect(await store.loadGame('yok')).toBeNull();
});

it('kayıt, kaydedildiği andaki masadır; sonraki hamleler onu değiştirmez', async () => {
  const { hub, dm } = await played();
  await store.saveGame({ id: 's1', name: 'Önce', state: hub.snapshot(), at: 5 });
  await hub.submit(dm.c, send({ type: 'encounter.end' }));
  expect((await store.loadGame('s1'))!.state.encounter?.status).toBe('active');
  await store.deleteGame('s1');
  expect(await store.listGames()).toEqual([]);
});

it('oyun uçları yalnızca DM içindir ve başka siteden çağrılamaz', async () => {
  const calls: string[] = [];
  const game: AppDeps['game'] = {
    async reset() { calls.push('reset'); },
    async save(name) { calls.push(`save:${name}`); },
    async list() { return [{ id: 's1', name: 'Orman yolu', at: 5, hero: 'Aria' }]; },
    async load(id) { calls.push(`load:${id}`); return id === 's1'; },
    async remove(id) { calls.push(`remove:${id}`); },
  };
  const { app } = createApp({ dmPassword: 'gizli', secret: 'sır', secure: false, code: () => 'ABC123', monsters: () => [], game });
  const cookie = async (path: string, body: object) =>
    ((await request(app).post(path).send(body)).headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
  const dm = await cookie('/api/login/dm', { password: 'gizli' });
  const player = await cookie('/api/login/player', { code: 'ABC123' });

  expect((await request(app).post('/api/game/new')).status).toBe(401);
  expect((await request(app).post('/api/game/new').set('Cookie', player)).status).toBe(403);
  expect((await request(app).get('/api/game/saves').set('Cookie', player)).status).toBe(403);
  expect((await request(app).post('/api/game/new').set('Cookie', dm).set('Origin', 'https://evil.example')).status).toBe(403);
  expect(calls).toEqual([]);

  expect((await request(app).post('/api/game/new').set('Cookie', dm)).status).toBe(200);
  expect((await request(app).post('/api/game/saves').set('Cookie', dm).send({ name: '  ' })).status).toBe(400);
  expect((await request(app).post('/api/game/saves').set('Cookie', dm).send({ name: ' Orman yolu ' })).status).toBe(200);
  expect((await request(app).get('/api/game/saves').set('Cookie', dm)).body).toHaveLength(1);
  expect((await request(app).post('/api/game/saves/s1/load').set('Cookie', dm)).status).toBe(200);
  expect((await request(app).post('/api/game/saves/yok/load').set('Cookie', dm)).status).toBe(404);
  expect((await request(app).post('/api/game/saves/s1/delete').set('Cookie', dm)).status).toBe(200);
  expect(calls).toEqual(['reset', 'save:Orman yolu', 'load:s1', 'load:yok', 'remove:s1']);
});
