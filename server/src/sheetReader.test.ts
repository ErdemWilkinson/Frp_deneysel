import { beforeEach, expect, it, vi } from 'vitest';

beforeEach(() => { vi.spyOn(console, 'error').mockImplementation(() => {}); });
import request from 'supertest';
import { createApp } from './http';
import { SheetReadError, createSheetReader, type SheetReader } from './sheetReader';

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]);
const reply = (content: string, status = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });

it('resmi anahtarla birlikte gönderir ve modelin döndürdüğü nesneyi verir', async () => {
  const fetchMock = vi.fn(async (_url: unknown, _init?: RequestInit) => reply('{"name":"Thorin","ac":18}'));
  const read = createSheetReader('sk-test', fetchMock as unknown as typeof fetch);
  expect(await read(PNG, 'image/png')).toEqual({ name: 'Thorin', ac: 18 });

  const [url, init] = fetchMock.mock.calls[0]!;
  expect(url).toBe('https://api.deepseek.com/chat/completions');
  expect((init!.headers as Record<string, string>).Authorization).toBe('Bearer sk-test');
  const sent = JSON.parse(init!.body as string);
  expect(sent.response_format).toEqual({ type: 'json_object' });
  expect(sent.messages[0].content[1].image_url.url).toBe(`data:image/png;base64,${PNG.toString('base64')}`);
});

it('kod çiti ya da açıklama içine sarılmış yanıttan nesneyi ayıklar', async () => {
  const wrapped = ['İşte sonuç:', '```json', '{"name":"Thorin","level":4}', '```'].join('\n');
  const read = createSheetReader('sk-test', (async () => reply(wrapped)) as unknown as typeof fetch);
  expect(await read(PNG, 'image/png')).toEqual({ name: 'Thorin', level: 4 });
});

it.each([
  ['ağ hatası', async () => { throw new Error('ECONNRESET'); }, 'ulaşılamadı'],
  ['reddedilen anahtar', async () => reply('', 401), 'anahtarı reddetti'],
  ['biten bakiye', async () => reply('', 402), 'bakiye'],
  ['sunucu hatası', async () => reply('', 500), 'hata verdi (500)'],
  ['JSON olmayan yanıt', async () => reply('üzgünüm, okuyamadım'), 'Sayfa okunamadı'],
  ['nesne olmayan yanıt', async () => reply('[1,2]'), 'Sayfa okunamadı'],
])('%s anlaşılır bir hataya çevrilir', async (_label, impl, message) => {
  const read = createSheetReader('sk-test', impl as unknown as typeof fetch);
  await expect(read(PNG, 'image/png')).rejects.toThrow(SheetReadError);
  await expect(read(PNG, 'image/png')).rejects.toThrow(message);
});

const appWith = (readSheet?: SheetReader) => createApp({
  dmPassword: 'gizli', secret: 'sır', secure: false, code: () => 'ABC123', monsters: () => [], readSheet,
}).app;
const asPlayer = async (app: ReturnType<typeof appWith>) =>
  ((await request(app).post('/api/login/player').send({ code: 'ABC123' })).headers['set-cookie'] as unknown as string[])[0]!.split(';')[0]!;
const post = (app: ReturnType<typeof appWith>, body: Buffer, cookie?: string) => {
  const req = request(app).post('/api/sheet/read').set('Content-Type', 'application/octet-stream');
  return (cookie ? req.set('Cookie', cookie) : req).send(body);
};

it('uç: giriş yapan oyuncunun resmini okutur ve sonucu döndürür', async () => {
  const read = vi.fn<SheetReader>(async () => ({ name: 'Thorin' }));
  const app = appWith(read);
  const res = await post(app, PNG, await asPlayer(app));
  expect(res.status).toBe(200);
  expect(res.body).toEqual({ character: { name: 'Thorin' } });
  expect(read.mock.calls[0]![1]).toBe('image/png');
});

it('uç: girişsiz, resim olmayan ve başka siteden gelen isteği okutmaz', async () => {
  const read = vi.fn<SheetReader>(async () => ({}));
  const app = appWith(read);
  const cookie = await asPlayer(app);
  expect((await post(app, PNG)).status).toBe(401);
  expect((await post(app, Buffer.from('%PDF-1.7'), cookie)).status).toBe(415);
  expect((await post(app, PNG, cookie).set('Origin', 'https://evil.example')).status).toBe(403);
  expect(read).not.toHaveBeenCalled();
});

it('uç: okuma hatasını kullanıcıya iletir; anahtar yoksa özelliğin kapalı olduğunu söyler', async () => {
  const failing = appWith(async () => { throw new SheetReadError('Sayfa okunamadı; daha net bir resimle yeniden dene'); });
  const res = await post(failing, PNG, await asPlayer(failing));
  expect(res.status).toBe(502);
  expect(res.body).toEqual({ error: 'Sayfa okunamadı; daha net bir resimle yeniden dene' });

  const off = appWith(undefined);
  const closed = await post(off, PNG, await asPlayer(off));
  expect(closed.status).toBe(503);
  expect(closed.body.error).toMatch(/DEEPSEEK_API_KEY/);
});
