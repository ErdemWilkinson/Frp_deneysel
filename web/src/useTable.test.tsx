import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useTable } from './useTable';

class FakeSocket {
  static instances: FakeSocket[] = [];
  static OPEN = 1;
  readyState = 0;
  sent: string[] = [];
  onopen?: () => void;
  onmessage?: (event: { data: string }) => void;
  onclose?: () => void;
  constructor(public url: string) { FakeSocket.instances.push(this); }
  send(data: string) { this.sent.push(data); }
  close() { this.readyState = 3; }
  open() { this.readyState = 1; this.onopen?.(); }
  drop() { this.readyState = 3; this.onclose?.(); }
}
const latest = () => FakeSocket.instances.at(-1)!;
const view = { role: 'player', code: 'ABC123', character: null, encounter: null, log: [] };

beforeEach(() => {
  FakeSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeSocket);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('gelen durumu görünüme yazar ve niyetleri numaralayarak gönderir', () => {
  const { result } = renderHook(() => useTable());
  expect(latest().url).toMatch(/\/ws$/);
  act(() => latest().open());
  act(() => latest().onmessage!({ data: JSON.stringify({ type: 'state', view }) }));
  expect(result.current.view).toEqual(view);
  expect(result.current.status).toBe('open');
  act(() => result.current.send({ type: 'roll', expr: '1d20' }));
  act(() => result.current.send({ type: 'combat.nextTurn' }));
  expect(latest().sent.map((s) => JSON.parse(s).id)).toEqual([1, 2]);
});

it('sunucu hatasını gösterir, sonraki gönderimde temizler', () => {
  const { result } = renderHook(() => useTable());
  act(() => latest().open());
  act(() => latest().onmessage!({ data: JSON.stringify({ type: 'error', id: 1, message: 'Sıra sende değil' }) }));
  expect(result.current.error).toBe('Sıra sende değil');
  act(() => result.current.send({ type: 'combat.nextTurn' }));
  expect(result.current.error).toBeNull();
});

it('bağlantı kopunca yeniden bağlanır; koptuğu sırada gönderimi reddeder', () => {
  const { result } = renderHook(() => useTable());
  act(() => latest().open());
  act(() => latest().drop());
  expect(result.current.status).toBe('connecting');
  act(() => result.current.send({ type: 'combat.nextTurn' }));
  expect(result.current.error).toBe('Bağlantı yok; yeniden bağlanılıyor');
  act(() => { vi.advanceTimersByTime(600); });
  expect(FakeSocket.instances).toHaveLength(2);
});

it('bileşen kaldırılınca yeniden bağlanmayı bırakır', () => {
  const { unmount } = renderHook(() => useTable());
  act(() => latest().open());
  unmount();
  act(() => latest().drop());
  act(() => { vi.advanceTimersByTime(10_000); });
  expect(FakeSocket.instances).toHaveLength(1);
});
