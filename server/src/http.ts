import { mintTicket } from './tickets';
import { join } from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import type { Character, Monster, Role } from '@masa/shared';
import { SheetReadError, type SheetReader } from './sheetReader';
import { COOKIE, createLimiter, readCookie, safeEqual, sameOrigin, sign, sniffMime, verify } from './auth';

export interface AppDeps {
  dmPassword: string;
  secret: string;
  secure: boolean;
  code: () => string;
  monsters: () => Monster[];
  webDir?: string;
  /** Yeni oyun ve oyun kayıtları; yalnızca DM kullanır. */
  game?: {
    reset(): Promise<void>;
    save(name: string): Promise<void>;
    list(): Promise<{ id: string; name: string; at: number; hero: string | null }[]>;
    load(id: string): Promise<boolean>;
    remove(id: string): Promise<void>;
  };
  /** Karakter sayfası resmini okuyup kart alanlarını çıkarır. Verilmezse özellik kapalıdır. */
  readSheet?: SheetReader;
  /** Daha önce kaydedilmiş karakter kartları. */
  characters?: () => Promise<Character[]>;
  /** Yüklenen dosyaların deposu. Verilmezse dosya uçları kapalıdır. */
  files?: {
    save(file: { kind: string; name: string; mime: string; data: Uint8Array; by?: 'dm' | 'player' }): Promise<string>;
    load(id: string): Promise<{ id: string; kind: string; name: string; mime: string; data: Uint8Array; at: number; by?: 'dm' | 'player' | null } | null>;
  };
}

const MAX_UPLOAD = '8mb';
const ALLOWED: Record<string, string[]> = {
  map: ['image/png', 'image/jpeg', 'image/webp'],
  sheet: ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'],
};

const MONTH = 30 * 24 * 60 * 60 * 1000;

export function createApp(d: AppDeps) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '10kb' }));
  // Aynı tarayıcıda DM ve oyuncu sekmesi çerezi paylaşır; her sekme kendi girişini başlıkla bildirir.
  app.use((req, _res, next) => {
    const token = req.headers['x-masa-token'];
    if (typeof token === 'string' && token) req.headers.cookie = `${COOKIE}=${token}`;
    next();
  });

  const allow = createLimiter(10, 60_000);
  const roleOf = (cookieHeader: string | undefined): Role | null =>
    verify(readCookie(cookieHeader, COOKIE), d.code(), d.secret);

  function login(role: Role, check: (body: any) => boolean, wrong: string) {
    return (req: Request, res: Response) => {
      if (!allow(req.ip ?? 'unknown')) {
        res.status(429).json({ error: 'Çok fazla deneme; bir dakika sonra yeniden dene' });
        return;
      }
      if (!check(req.body)) {
        res.status(401).json({ error: wrong });
        return;
      }
      const token = sign(role, d.code(), d.secret);
      res.cookie(COOKIE, token, {
        httpOnly: true, sameSite: 'lax', secure: d.secure, maxAge: MONTH, path: '/',
      });
      res.json({ role, code: d.code(), token });
    };
  }

  app.get('/api/health', (_req, res) => { res.json({ ok: true }); });
  app.post('/api/login/dm', login('dm',
    (body) => typeof body?.password === 'string' && safeEqual(body.password, d.dmPassword), 'Parola yanlış'));
  app.post('/api/login/player', login('player',
    (body) => typeof body?.code === 'string' && safeEqual(body.code.trim().toUpperCase(), d.code()), 'Masa kodu yanlış'));
  app.post('/api/ws-ticket', (req, res) => {
    const role = roleOf(req.headers.cookie);
    if (!role) { res.status(401).json({ error: 'Giriş gerekli' }); return; }
    res.json({ ticket: mintTicket(role) });
  });
  app.post('/api/logout', (_req, res) => {
    res.clearCookie(COOKIE, { path: '/' });
    res.json({ ok: true });
  });
  app.get('/api/me', (req, res) => {
    const role = roleOf(req.headers.cookie);
    if (!role) { res.status(401).json({ error: 'Giriş gerekli' }); return; }
    res.json({ role, code: d.code() });
  });
  app.get('/api/monsters', (req, res) => {
    const role = roleOf(req.headers.cookie);
    if (!role) { res.status(401).json({ error: 'Giriş gerekli' }); return; }
    if (role !== 'dm') { res.status(403).json({ error: 'Canavar kitabı yalnızca DM içindir' }); return; }
    res.json(d.monsters());
  });

  app.get('/api/characters', async (req, res) => {
    if (!roleOf(req.headers.cookie)) { res.status(401).json({ error: 'Giriş gerekli' }); return; }
    res.json(d.characters ? await d.characters() : []);
  });

  const allowRead = createLimiter(6, 60_000);
  app.post('/api/sheet/read', express.raw({ type: () => true, limit: MAX_UPLOAD }), async (req, res) => {
    if (!roleOf(req.headers.cookie)) { res.status(401).json({ error: 'Giriş gerekli' }); return; }
    if (!sameOrigin(req.headers.origin, req.headers.host)) { res.status(403).json({ error: 'İstek reddedildi' }); return; }
    if (!d.readSheet) { res.status(503).json({ error: 'Sayfa okuma kapalı: sunucuda DEEPSEEK_API_KEY tanımlı değil' }); return; }
    const data = Buffer.isBuffer(req.body) ? new Uint8Array(req.body) : new Uint8Array();
    const mime = sniffMime(data);
    if (!mime || !mime.startsWith('image/')) { res.status(415).json({ error: 'Sayfa PNG, JPEG ya da WebP resmi olmalı' }); return; }
    if (!allowRead(req.ip ?? 'unknown')) { res.status(429).json({ error: 'Çok fazla okuma isteği; bir dakika sonra yeniden dene' }); return; }
    try {
      res.json({ character: await d.readSheet(data, mime) });
    } catch (error) {
      if (!(error instanceof SheetReadError)) throw error;
      res.status(502).json({ error: error.message });
    }
  });

  if (d.game) {
    const game = d.game;
    /** DM'den ve aynı siteden gelmeyen isteği yanıtlar; geçerliyse true döner. */
    const dmOnly = (req: Request, res: Response): boolean => {
      const role = roleOf(req.headers.cookie);
      if (!role) { res.status(401).json({ error: 'Giriş gerekli' }); return false; }
      if (role !== 'dm') { res.status(403).json({ error: 'Bu işlem yalnızca DM içindir' }); return false; }
      if (!sameOrigin(req.headers.origin, req.headers.host)) { res.status(403).json({ error: 'İstek reddedildi' }); return false; }
      return true;
    };
    app.post('/api/game/new', async (req, res) => {
      if (!dmOnly(req, res)) return;
      await game.reset();
      res.json({ ok: true });
    });
    app.get('/api/game/saves', async (req, res) => {
      if (!dmOnly(req, res)) return;
      res.json(await game.list());
    });
    app.post('/api/game/saves', async (req, res) => {
      if (!dmOnly(req, res)) return;
      const name = typeof req.body?.name === 'string' ? req.body.name.trim().slice(0, 60) : '';
      if (!name) { res.status(400).json({ error: 'Kayda bir ad ver' }); return; }
      await game.save(name);
      res.json({ ok: true });
    });
    app.post('/api/game/saves/:id/load', async (req, res) => {
      if (!dmOnly(req, res)) return;
      if (!(await game.load(String(req.params.id)))) { res.status(404).json({ error: 'Kayıt bulunamadı' }); return; }
      res.json({ ok: true });
    });
    app.post('/api/game/saves/:id/delete', async (req, res) => {
      if (!dmOnly(req, res)) return;
      await game.remove(String(req.params.id));
      res.json({ ok: true });
    });
  }

  if (d.files) {
    const files = d.files;
    const allowUpload = createLimiter(20, 60_000);
    app.post('/api/files/:kind', express.raw({ type: () => true, limit: MAX_UPLOAD }), async (req, res) => {
      const role = roleOf(req.headers.cookie);
      const kind = String(req.params.kind);
      if (!role) { res.status(401).json({ error: 'Giriş gerekli' }); return; }
      if (!sameOrigin(req.headers.origin, req.headers.host)) { res.status(403).json({ error: 'İstek reddedildi' }); return; }
      if (!ALLOWED[kind]) { res.status(404).json({ error: 'Bilinmeyen dosya türü' }); return; }
      if (kind === 'map' && role !== 'dm') { res.status(403).json({ error: 'Haritayı yalnızca DM yükleyebilir' }); return; }
      if (!allowUpload(req.ip ?? 'unknown')) { res.status(429).json({ error: 'Çok fazla yükleme; bir dakika sonra yeniden dene' }); return; }
      const data = Buffer.isBuffer(req.body) ? new Uint8Array(req.body) : new Uint8Array();
      const mime = sniffMime(data);
      if (!mime || !ALLOWED[kind].includes(mime)) {
        res.status(415).json({ error: kind === 'map' ? 'Harita PNG, JPEG ya da WebP olmalı' : 'Dosya PDF, PNG, JPEG ya da WebP olmalı' });
        return;
      }
      let name = 'dosya';
      try { name = decodeURIComponent(String(req.headers['x-file-name'] ?? '')).replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 80) || name; } catch { /* ad okunamadıysa varsayılan kalır */ }
      res.json({ id: await files.save({ kind, name, mime, data, by: role }), name });
    });
    /** Dosyanın adı, türü, ne zaman ve kim tarafından yüklendiği; içeriği değil. */
    app.get('/api/files/:id/meta', async (req, res) => {
      if (!roleOf(req.headers.cookie)) { res.status(401).json({ error: 'Giriş gerekli' }); return; }
      const file = /^[\w-]{1,64}$/.test(String(req.params.id)) ? await files.load(String(req.params.id)) : null;
      if (!file) { res.status(404).json({ error: 'Dosya bulunamadı' }); return; }
      res.json({ id: file.id, kind: file.kind, name: file.name, at: file.at, by: file.by ?? null });
    });
    app.get('/api/files/:id', async (req, res) => {
      if (!roleOf(req.headers.cookie)) { res.status(401).json({ error: 'Giriş gerekli' }); return; }
      const file = /^[\w-]{1,64}$/.test(String(req.params.id)) ? await files.load(String(req.params.id)) : null;
      if (!file) { res.status(404).json({ error: 'Dosya bulunamadı' }); return; }
      res.set({
        'Content-Type': file.mime,
        'X-Content-Type-Options': 'nosniff',
        'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`,
        'Cache-Control': 'private, max-age=31536000, immutable',
      });
      res.send(Buffer.from(file.data));
    });
  }

  if (d.webDir) {
    const webDir = d.webDir;
    app.use(express.static(webDir));
    app.get(/^\/(?!api\/|ws$).*/, (_req, res) => { res.sendFile(join(webDir, 'index.html')); });
  }

  app.use((err: { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    const status = err?.status === 400 || err?.status === 413 ? err.status : 500;
    if (status === 500) console.error(err);
    res.status(status).json({ error: status === 413 ? 'Dosya çok büyük (en fazla 8 MB)' : 'İstek işlenemedi' });
  });

  return { app, roleOf };
}
