import { takeTicket } from './tickets';
import type { Server } from 'node:http';
import type { Duplex } from 'node:stream';
import { WebSocketServer } from 'ws';
import type { Role } from '@masa/shared';
import { sameOrigin } from './auth';
import type { Client, Hub } from './hub';

function refuse(socket: Duplex, status: number, reason: string): void {
  socket.write(`HTTP/1.1 ${status} ${reason}\r\nConnection: close\r\n\r\n`);
  socket.destroy();
}


export function attachWebSocket(
  server: Server,
  hub: Pick<Hub, 'join' | 'submit'>,
  roleOf: (cookieHeader: string | undefined) => Role | null,
): void {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 32 * 1024 });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url ?? '', 'http://masa');
    if (url.pathname !== '/ws') return refuse(socket, 404, 'Not Found');
    // Çerez WebSocket el sıkışmasında başka sitelerden de gönderilir; kökeni kendimiz denetleriz.
    if (!sameOrigin(req.headers.origin, req.headers.host)) return refuse(socket, 403, 'Forbidden');
    // Sekmeye özel giriş, kısa ömürlü tek kullanımlık biletle gelir; yoksa çereze bakılır.
    const ticket = url.searchParams.get('ticket');
    const role = ticket ? takeTicket(ticket) : roleOf(req.headers.cookie);
    if (!role) return refuse(socket, 401, 'Unauthorized');

    wss.handleUpgrade(req, socket, head, (ws) => {
      const client: Client = {
        role,
        send: (message) => { if (ws.readyState === ws.OPEN) ws.send(JSON.stringify(message)); },
      };
      const leave = hub.join(client);
      ws.on('message', (data) => { void hub.submit(client, data.toString()); });
      ws.on('close', leave);
      ws.on('error', leave);
    });
  });

  // Ara sunucular boşta kalan bağlantıyı kapatmasın.
  const beat = setInterval(() => { for (const ws of wss.clients) ws.ping(); }, 30_000);
  server.on('close', () => clearInterval(beat));
}
