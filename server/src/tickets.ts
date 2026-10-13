import { randomBytes } from 'node:crypto';
import type { Role } from '@masa/shared';

const TTL_MS = 30_000;
const tickets = new Map<string, { role: Role; expires: number }>();

/** WebSocket el sıkışması için kısa ömürlü, tek kullanımlık bilet; asıl giriş bilgisi URL'ye girmez. */
export function mintTicket(role: Role, now = Date.now()): string {
  for (const [key, t] of tickets) if (t.expires <= now) tickets.delete(key);
  const ticket = randomBytes(24).toString('base64url');
  tickets.set(ticket, { role, expires: now + TTL_MS });
  return ticket;
}

export function takeTicket(ticket: string | null, now = Date.now()): Role | null {
  if (!ticket) return null;
  const t = tickets.get(ticket);
  tickets.delete(ticket);
  return t && t.expires > now ? t.role : null;
}
