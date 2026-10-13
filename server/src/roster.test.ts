import { beforeEach, expect, it } from 'vitest';
import request from 'supertest';
import { newTable, type Character, type ServerMessage } from '@masa/shared';
import { createLiteDb, migrate } from './db';
import { heroInput, monsters, newId } from './game/fixtures';
import { createApp } from './http';
import { createHub, type Client } from './hub';
import { createStore, type Store } from './store';

let store: Store;
let clock = 1000;
beforeEach(async () => {
  const db = await createLiteDb();
  await migrate(db);
  store = createStore(db);
  await store.createTable(newTable('ABC123'));
  clock = 1000;
});

const boot = () => createHub({ store, monsters: monsters(), rng: () => 10, now: () => (clock += 1), newId });
const player = (): Client & { inbox: ServerMessage[] } => {
  const inbox: ServerMessage[] = [];
  return { role: 'player', inbox, send: (m) => { inbox.push(m); } };
};
const set = (character: object) => JSON.stringify({ id: 1, intent: { type: 'character.set', character } });

it('kaydedilen her kart deftere yazılır; aynı adla kaydedilen eskisinin yerini alır, en yeni önce gelir', async () => {
  const hub = await boot();
  const c = player();
  await hub.submit(c, set(heroInput));
  await hub.submit(c, set({ ...heroInput, name: 'Borin', level: 5 }));
  await hub.submit(c, set({ ...heroInput, hp: 9 }));
  const saved = await store.listCharacters();
  expect(saved.map((x) => [x.name, x.level, x.hp])).toEqual([['Aria', 3, 9], ['Borin', 5, 24]]);
  expect(saved[0]).toMatchObject({ speed: 30, attacks: [{ range: 5 }, { range: 5 }] });
});

it('reddedilen kart deftere yazılmaz', async () => {
  const hub = await boot();
  const c = player();
  await hub.submit(c, set({ ...heroInput, ac: 99 }));
  expect(c.inbox.at(-1)).toMatchObject({ type: 'error' });
  expect(await store.listCharacters()).toEqual([]);
});

it('defter yalnızca giriş yapana açılır', async () => {
  const saved = [{ name: 'Aria' } as Character];
  const { app } = createApp({
    dmPassword: 'gizli', secret: 'sır', secure: false, code: () => 'ABC123', monsters: () => [], characters: async () => saved,
  });
  expect((await request(app).get('/api/characters')).status).toBe(401);
  const login = await request(app).post('/api/login/player').send({ code: 'ABC123' });
  const cookie = (login.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
  const res = await request(app).get('/api/characters').set('Cookie', cookie);
  expect(res.status).toBe(200);
  expect(res.body).toEqual(saved);
});
