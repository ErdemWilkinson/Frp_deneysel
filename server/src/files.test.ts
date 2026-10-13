import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import { newTable, type DmView, type ServerMessage } from '@masa/shared';
import { sniffMime } from './auth';
import { createLiteDb, migrate } from './db';
import { draft } from './game/bestiary.test';
import { monsters, newId } from './game/fixtures';
import { createApp } from './http';
import { createHub, type Client } from './hub';
import { createStore, type Store } from './store';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4]);
const PDF = Buffer.from('%PDF-1.7 sahte');
const SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

let store: Store;
beforeEach(async () => {
  const db = await createLiteDb();
  await migrate(db);
  store = createStore(db);
  await store.createTable(newTable('ABC123'));
});

describe('sniffMime', () => {
  it('türü ilk baytlardan tanır; tanımadığını reddeder', () => {
    expect(sniffMime(PNG)).toBe('image/png');
    expect(sniffMime(PDF)).toBe('application/pdf');
    expect(sniffMime(Buffer.from([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
    expect(sniffMime(Buffer.from('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp');
    expect(sniffMime(SVG)).toBeNull();
    expect(sniffMime(new Uint8Array())).toBeNull();
  });
});

describe('store: dosyalar ve özel canavarlar', () => {
  const file = (id: string, at: number, kind = 'map') => ({ id, kind, name: `${id}.png`, mime: 'image/png', data: new Uint8Array(PNG), at });

  it('dosyayı bayt bayt geri okur', async () => {
    await store.saveFile(file('a', 1));
    const loaded = await store.loadFile('a');
    expect(loaded).toMatchObject({ id: 'a', kind: 'map', name: 'a.png', mime: 'image/png', at: 1 });
    expect(Buffer.from(loaded!.data).equals(PNG)).toBe(true);
    expect(await store.loadFile('yok')).toBeNull();
  });

  it('eski dosyaları siler; kullanımdaki ve başka türdeki dosyalara dokunmaz', async () => {
    for (const [id, at] of [['a', 1], ['b', 2], ['c', 3], ['d', 4]] as const) await store.saveFile(file(id, at));
    await store.saveFile(file('s', 0, 'sheet'));
    await store.pruneFiles('map', 2, ['a']);
    const left = await Promise.all(['a', 'b', 'c', 'd', 's'].map(async (id) => ((await store.loadFile(id)) ? id : '')));
    expect(left.filter(Boolean)).toEqual(['a', 'c', 'd', 's']);
  });

  it('özel canavarı saklar, günceller ve siler', async () => {
    const m = { ...monsters().get('goblin')!, id: 'custom-a' };
    await store.saveCustomMonster(m);
    await store.saveCustomMonster({ ...m, ac: 19 });
    expect((await store.loadCustomMonsters()).map((x) => [x.id, x.ac])).toEqual([['custom-a', 19]]);
    await store.deleteCustomMonster('custom-a');
    expect(await store.loadCustomMonsters()).toEqual([]);
  });
});

describe('hub: özel canavarlar ve eski kayıtlar', () => {
  const boot = (catalog = monsters()) =>
    createHub({ store, monsters: catalog, rng: (sides) => Math.min(10, sides), now: () => 1000, newId });
  const client = (role: Client['role']) => {
    const inbox: ServerMessage[] = [];
    return { c: { role, send: (m: ServerMessage) => { inbox.push(m); } }, inbox };
  };
  const msg = (intent: object) => JSON.stringify({ id: 1, intent });

  it('yaratılan canavarı kaydeder, hemen kullanılabilir kılar ve yeniden başlatmada yükler', async () => {
    const catalog = monsters();
    const hub = await boot(catalog);
    const dm = client('dm');
    hub.join(dm.c);
    await hub.submit(dm.c, msg({ type: 'monster.save', monster: draft }));
    await hub.submit(dm.c, msg({ type: 'encounter.addMonster', monsterId: draft.id, count: 1, hpMode: 'average' }));
    const view = (dm.inbox.at(-1) as { view: DmView }).view;
    expect(view.encounter!.combatants[0]).toMatchObject({ name: 'Gece Kurdu 1', ac: 14, hp: 45 });

    const fresh = monsters();
    await boot(fresh);
    expect(fresh.get(draft.id)?.name.tr).toBe('Gece Kurdu');

    await hub.submit(dm.c, msg({ type: 'encounter.end' }));
    await hub.submit(dm.c, msg({ type: 'monster.delete', monsterId: draft.id }));
    expect(catalog.has(draft.id)).toBe(false);
    expect(await store.loadCustomMonsters()).toEqual([]);
  });

  it('harita alanı olmayan eski kaydı varsayılanlarla tamamlar', async () => {
    await store.commit({ code: 'ABC123', character: null, encounter: null } as never, []);
    const hub = await boot();
    const dm = client('dm');
    hub.join(dm.c);
    expect((dm.inbox[0] as { view: DmView }).view).toMatchObject({ board: { mapId: null, visible: false, tokens: [] }, sheetId: null });
    expect(hub.filesInUse()).toEqual([]);
  });
});

describe('http: dosya yükleme', () => {
  const make = () => {
    const saved = new Map<string, { id: string; kind: string; name: string; mime: string; data: Uint8Array; at: number; by?: 'dm' | 'player' | null }>();
    const { app } = createApp({
      dmPassword: 'gizli', secret: 'sır', secure: false, code: () => 'ABC123', monsters: () => [],
      files: {
        async save(file) { const id = `f${saved.size + 1}`; saved.set(id, { ...file, id, at: 1_700_000_000_000 }); return id; },
        async load(id) { return saved.get(id) ?? null; },
      },
    });
    return { app, saved };
  };
  const cookieOf = (res: request.Response) => (res.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
  const asDm = async (app: Parameters<typeof request>[0]) => cookieOf(await request(app).post('/api/login/dm').send({ password: 'gizli' }));
  const asPlayer = async (app: Parameters<typeof request>[0]) => cookieOf(await request(app).post('/api/login/player').send({ code: 'ABC123' }));
  const upload = (app: Parameters<typeof request>[0], kind: string, body: Buffer, cookie?: string) => {
    const req = request(app).post(`/api/files/${kind}`).set('Content-Type', 'application/octet-stream').set('X-File-Name', encodeURIComponent('Orman haritası.png'));
    return (cookie ? req.set('Cookie', cookie) : req).send(body);
  };

  it('DM harita yükler; herkes oturumuyla geri indirir', async () => {
    const { app } = make();
    const dm = await asDm(app);
    const res = await upload(app, 'map', PNG, dm);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ id: 'f1', name: 'Orman haritası.png' });

    const got = await request(app).get('/api/files/f1').set('Cookie', await asPlayer(app));
    expect(got.status).toBe(200);
    expect(got.headers['content-type']).toBe('image/png');
    expect(got.headers['x-content-type-options']).toBe('nosniff');
    expect(Buffer.from(got.body).equals(PNG)).toBe(true);
  });

  it('oyuncu harita yükleyemez ama karakter sayfası yükleyebilir', async () => {
    const { app } = make();
    const player = await asPlayer(app);
    expect((await upload(app, 'map', PNG, player)).status).toBe(403);
    expect((await upload(app, 'sheet', PDF, player)).status).toBe(200);
  });

  it('dosyanın ne zaman ve kim tarafından yüklendiğini içeriksiz söyler', async () => {
    const { app } = make();
    await upload(app, 'sheet', PDF, await asPlayer(app));
    const meta = await request(app).get('/api/files/f1/meta').set('Cookie', await asDm(app));
    expect(meta.status).toBe(200);
    expect(meta.body).toEqual({ id: 'f1', kind: 'sheet', name: 'Orman haritası.png', at: 1_700_000_000_000, by: 'player' });
    expect((await request(app).get('/api/files/f1/meta')).status).toBe(401);
    expect((await request(app).get('/api/files/yok/meta').set('Cookie', await asDm(app))).status).toBe(404);
  });

  it('oturumsuz yüklemeyi ve indirmeyi reddeder', async () => {
    const { app } = make();
    expect((await upload(app, 'map', PNG)).status).toBe(401);
    expect((await request(app).get('/api/files/f1')).status).toBe(401);
  });

  it('izin verilmeyen içeriği, beyan edilen türe bakmadan reddeder', async () => {
    const { app, saved } = make();
    const dm = await asDm(app);
    expect((await upload(app, 'map', SVG, dm)).status).toBe(415);
    expect((await upload(app, 'map', PDF, dm)).status).toBe(415);
    expect((await upload(app, 'map', Buffer.alloc(0), dm)).status).toBe(415);
    const lying = await request(app).post('/api/files/map').set('Cookie', dm).set('Content-Type', 'image/png').send(SVG);
    expect(lying.status).toBe(415);
    expect(saved.size).toBe(0);
  });

  it('başka siteden gelen yüklemeyi ve bilinmeyen türü reddeder', async () => {
    const { app } = make();
    const dm = await asDm(app);
    expect((await upload(app, 'map', PNG, dm).set('Origin', 'https://evil.example')).status).toBe(403);
    expect((await upload(app, 'virus', PNG, dm)).status).toBe(404);
  });

  it('sekiz megabayttan büyük dosyayı anlaşılır hatayla reddeder', async () => {
    const { app } = make();
    const res = await upload(app, 'map', Buffer.concat([PNG, Buffer.alloc(9 * 1024 * 1024)]), await asDm(app));
    expect(res.status).toBe(413);
    expect(res.body).toEqual({ error: 'Dosya çok büyük (en fazla 8 MB)' });
  });

  it('olmayan ya da biçimsiz kimlikte 404 döner', async () => {
    const { app } = make();
    const dm = await asDm(app);
    expect((await request(app).get('/api/files/yok').set('Cookie', dm)).status).toBe(404);
    expect((await request(app).get('/api/files/..%2Fsecret').set('Cookie', dm)).status).toBe(404);
  });
});
