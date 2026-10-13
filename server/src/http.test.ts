import { describe, expect, it } from 'vitest';
import request from 'supertest';
import { goblin } from './game/fixtures';
import { createApp } from './http';

const make = () =>
  createApp({ dmPassword: 'gizli', secret: 'sır', secure: false, code: () => 'ABC123', monsters: () => [goblin] }).app;
const cookieOf = (res: request.Response) => (res.headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;

describe('http', () => {
  it('sağlık yolu yanıt verir', async () => {
    expect((await request(make()).get('/api/health')).body).toEqual({ ok: true });
  });

  it('DM doğru parolayla girer ve masa kodunu alır', async () => {
    const app = make();
    const res = await request(app).post('/api/login/dm').send({ password: 'gizli' });
    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ role: 'dm', code: 'ABC123' });
    expect(res.headers['set-cookie']![0]).toMatch(/HttpOnly/i);
    const me = await request(app).get('/api/me').set('Cookie', cookieOf(res));
    expect(me.body).toEqual({ role: 'dm', code: 'ABC123' });
  });

  it.each([[{ password: 'yanlış' }], [{}], [{ password: 123 }]])('yanlış parolayı reddeder: %j', async (body) => {
    const res = await request(make()).post('/api/login/dm').send(body);
    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Parola yanlış' });
  });

  it('oyuncu masa koduyla girer; büyük-küçük harf ve boşluk fark etmez', async () => {
    const app = make();
    const res = await request(app).post('/api/login/player').send({ code: ' abc123 ' });
    expect(res.body).toMatchObject({ role: 'player', code: 'ABC123' });
    expect((await request(app).post('/api/login/player').send({ code: 'NOPE' })).status).toBe(401);
  });

  it('canavar kitabını yalnızca DM okur', async () => {
    const app = make();
    expect((await request(app).get('/api/monsters')).status).toBe(401);
    const player = cookieOf(await request(app).post('/api/login/player').send({ code: 'ABC123' }));
    expect((await request(app).get('/api/monsters').set('Cookie', player)).status).toBe(403);
    const dm = cookieOf(await request(app).post('/api/login/dm').send({ password: 'gizli' }));
    const book = await request(app).get('/api/monsters').set('Cookie', dm);
    expect(book.body).toHaveLength(1);
    expect(book.body[0].id).toBe('goblin');
  });

  it('çerez başka rolün olsa da sekmenin kendi girişi (başlık) geçerlidir', async () => {
    const app = make();
    const dm = await request(app).post('/api/login/dm').send({ password: 'gizli' });
    const player = cookieOf(await request(app).post('/api/login/player').send({ code: 'ABC123' }));
    const me = await request(app).get('/api/me').set('Cookie', player).set('X-Masa-Token', dm.body.token);
    expect(me.body.role).toBe('dm');
  });

  it('çıkış çerezi siler', async () => {
    const res = await request(make()).post('/api/logout');
    expect(res.headers['set-cookie']![0]).toMatch(/masa_session=;/);
  });

  it('art arda çok deneme 429 döner', async () => {
    const app = make();
    const codes: number[] = [];
    for (let n = 0; n < 11; n += 1) codes.push((await request(app).post('/api/login/dm').send({ password: 'x' })).status);
    expect(codes.slice(0, 10).every((c) => c === 401)).toBe(true);
    expect(codes[10]).toBe(429);
  });

  it('bozuk JSON gövdesinde 400 döner', async () => {
    const res = await request(make()).post('/api/login/dm').set('Content-Type', 'application/json').send('{nope');
    expect(res.status).toBe(400);
  });
});

describe('ws bileti', () => {
  it('kısa ömürlü tek kullanımlık biletle verilir; girişsiz alınamaz', async () => {
    const { mintTicket, takeTicket } = await import('./tickets');
    const t = mintTicket('dm', 1000);
    expect(takeTicket(t, 1000 + 29_000)).toBe('dm');
    expect(takeTicket(t, 1000 + 29_000)).toBeNull();
    const old = mintTicket('player', 1000);
    expect(takeTicket(old, 1000 + 31_000)).toBeNull();
    expect(takeTicket('uydurma')).toBeNull();
  });
});
