import type { Character, Monster, Role } from '@masa/shared';

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export interface Session { role: Role; code: string; token?: string }

// Aynı tarayıcıda DM ve oyuncu sekmesi çerezi paylaşır; her sekmenin girişi sekmeye özel saklanır.
const TOKEN_KEY = 'masa.token';
export const authToken = (): string | null => { try { return sessionStorage.getItem(TOKEN_KEY); } catch { return null; } };
const keepToken = (s: Session): Session => {
  try { if (s.token) sessionStorage.setItem(TOKEN_KEY, s.token); } catch { /* sekme depolaması kapalı */ }
  return s;
};
const withAuth = (headers: Record<string, string> = {}): Record<string, string> => {
  const token = authToken();
  return token ? { ...headers, 'X-Masa-Token': token } : headers;
};

async function call<T>(path: string, body?: unknown): Promise<T> {
  const init: RequestInit = body === undefined
    ? { credentials: 'same-origin', headers: withAuth() }
    : { method: 'POST', credentials: 'same-origin', headers: withAuth({ 'Content-Type': 'application/json' }), body: JSON.stringify(body) };
  const res = await fetch(path, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Sunucuya ulaşılamadı');
  return data as T;
}

export const me = () => call<Session>('/api/me');
export const loginDm = (password: string) => call<Session>('/api/login/dm', { password }).then(keepToken);
export const loginPlayer = (code: string) => call<Session>('/api/login/player', { code }).then(keepToken);
/** Bağlantı için kısa ömürlü tek kullanımlık bilet; sekmenin giriş bilgisi URL'ye konmaz. */
export const wsTicket = () => call<{ ticket: string }>('/api/ws-ticket', {}).then((r) => r.ticket);
export const logout = () => call<{ ok: true }>('/api/logout', {}).finally(() => {
  try { sessionStorage.removeItem(TOKEN_KEY); } catch { /* sekme depolaması kapalı */ }
});
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const fetchMonsters = () => call<Monster[]>('/api/monsters');
/** Giriş gerektirmeyen, yalnızca SRD canavarlarını içeren kitaplık (gezinti kipi). */
export const fetchBookMonsters = () => call<Monster[]>('/api/book/monsters');
/** Bu masada daha önce kaydedilmiş karakter kartları, en yenisi önce. */
export const fetchCharacters = () => call<Character[]>('/api/characters');

/** Karakter sayfası resmini sunucuya okutur; okunan alanları ham haliyle döndürür. */
export async function readSheet(file: File): Promise<unknown> {
  if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(413, 'Dosya çok büyük (en fazla 8 MB)');
  const res = await fetch('/api/sheet/read', {
    method: 'POST', credentials: 'same-origin', body: file, headers: withAuth({ 'Content-Type': 'application/octet-stream' }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Sayfa okunamadı');
  return data.character;
}

export interface SavedGame { id: string; name: string; at: number; hero: string | null }
export const newGame = () => call<{ ok: true }>('/api/game/new', {});
export const listGames = () => call<SavedGame[]>('/api/game/saves');
export const saveGame = (name: string) => call<{ ok: true }>('/api/game/saves', { name });
export const loadGame = (id: string) => call<{ ok: true }>(`/api/game/saves/${encodeURIComponent(id)}/load`, {});
export const deleteGame = (id: string) => call<{ ok: true }>(`/api/game/saves/${encodeURIComponent(id)}/delete`, {});

export const fileUrl = (id: string): string => `/api/files/${encodeURIComponent(id)}`;

/** Harita ya da karakter sayfası yükler; dosyanın kimliğini döndürür. */
export async function uploadFile(kind: 'map' | 'sheet', file: File): Promise<{ id: string; name: string }> {
  if (file.size > MAX_UPLOAD_BYTES) throw new ApiError(413, 'Dosya çok büyük (en fazla 8 MB)');
  const res = await fetch(`/api/files/${kind}`, {
    method: 'POST', credentials: 'same-origin', body: file,
    headers: withAuth({ 'Content-Type': 'application/octet-stream', 'X-File-Name': encodeURIComponent(file.name) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data.error ?? 'Dosya yüklenemedi');
  return data as { id: string; name: string };
}

export interface FileMeta { id: string; kind: string; name: string; at: number; by: 'dm' | 'player' | null }

/** Dosyanın adı ve ne zaman, kim tarafından yüklendiği. */
export async function fileMeta(id: string): Promise<FileMeta> {
  const res = await fetch(`/api/files/${encodeURIComponent(id)}/meta`, { credentials: 'same-origin', headers: withAuth() });
  if (!res.ok) throw new ApiError(res.status, 'Dosya bilgisi alınamadı');
  return (await res.json()) as FileMeta;
}
