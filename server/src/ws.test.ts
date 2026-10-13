import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { WebSocket } from 'ws';
import type { ServerMessage } from '@masa/shared';
import type { Client } from './hub';
import { attachWebSocket } from './ws';

let server: Server;
afterEach(() => new Promise<void>((done) => { server.closeAllConnections(); server.close(() => done()); }));

function start() {
  const submitted: string[] = [];
  const left: string[] = [];
  const hub = {
    join(client: Client) {
      client.send({ type: 'error', id: 0, message: `merhaba ${client.role}` });
      return () => { left.push(client.role); };
    },
    async submit(_client: Client, raw: string) { submitted.push(raw); },
  };
  server = createServer();
  attachWebSocket(server, hub, (cookie) => (cookie === 'oturum=dm' ? 'dm' : null));
  return new Promise<{ url: string; host: string; submitted: string[]; left: string[] }>((resolve) =>
    server.listen(0, '127.0.0.1', () => {
      const host = `127.0.0.1:${(server.address() as AddressInfo).port}`;
      resolve({ url: `ws://${host}/ws`, host, submitted, left });
    }));
}
const outcome = (socket: WebSocket) =>
  new Promise<string>((resolve) => {
    socket.on('message', (data) => resolve((JSON.parse(data.toString()) as ServerMessage & { message: string }).message));
    socket.on('unexpected-response', (_req, res) => resolve(`http ${res.statusCode}`));
    socket.on('error', () => resolve('error'));
  });

describe('websocket', () => {
  it('oturumu olmayan bağlantıyı reddeder', async () => {
    const { url } = await start();
    expect(await outcome(new WebSocket(url))).toBe('http 401');
  });

  it('başka kökenden gelen bağlantıyı reddeder', async () => {
    const { url } = await start();
    const socket = new WebSocket(url, { headers: { Cookie: 'oturum=dm' }, origin: 'https://evil.example' });
    expect(await outcome(socket)).toBe('http 403');
  });

  it('yanlış yolu reddeder', async () => {
    const { url } = await start();
    expect(await outcome(new WebSocket(url.replace('/ws', '/x'), { headers: { Cookie: 'oturum=dm' } }))).toBe('http 404');
  });

  it('oturumu olan bağlantıyı masaya katar, mesajları iletir, kapanınca ayırır', async () => {
    const { url, host, submitted, left } = await start();
    const socket = new WebSocket(url, { headers: { Cookie: 'oturum=dm' }, origin: `http://${host}` });
    expect(await outcome(socket)).toBe('merhaba dm');
    socket.send('{"id":1}');
    await new Promise((r) => setTimeout(r, 50));
    expect(submitted).toEqual(['{"id":1}']);
    socket.close();
    await new Promise((r) => setTimeout(r, 50));
    expect(left).toEqual(['dm']);
  });
});
