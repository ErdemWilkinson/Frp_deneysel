import { useCallback, useEffect, useRef, useState } from 'react';
import type { Intent, ServerMessage, View } from '@masa/shared';
import { authToken, wsTicket } from './api';

export type Send = (intent: Intent) => void;

export function useTable() {
  const [view, setView] = useState<View | null>(null);
  const [status, setStatus] = useState<'connecting' | 'open'>('connecting');
  const [error, setError] = useState<string | null>(null);
  const socket = useRef<WebSocket | null>(null);
  const nextId = useRef(1);

  useEffect(() => {
    let stopped = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const connect = (ticket: string | null) => {
      if (stopped) return;
      const query = ticket ? `?ticket=${encodeURIComponent(ticket)}` : '';
      const ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws${query}`);
      socket.current = ws;
      ws.onopen = () => { attempt = 0; setStatus('open'); };
      ws.onmessage = (event) => {
        const message = JSON.parse(event.data as string) as ServerMessage;
        if (message.type === 'state') setView(message.view);
        else setError(message.message);
      };
      ws.onclose = () => {
        if (stopped) return;
        setStatus('connecting');
        // 0,5 sn'den başlayıp 8 sn'ye kadar uzayan bekleme; sunucu uykudaysa uyanmasına zaman tanır.
        timer = setTimeout(open, Math.min(8000, 500 * 2 ** attempt));
        attempt += 1;
      };
    };
    function open() {
      // Sekmeye özel giriş varsa bilet alınır (URL'ye gizli bilgi konmaz); yoksa çerez yeter. Bilet alınamazsa çerezle denenir.
      if (!authToken()) { connect(null); return; }
      wsTicket().then(connect, () => connect(null));
    }
    open();
    return () => {
      stopped = true;
      clearTimeout(timer);
      socket.current?.close();
    };
  }, []);

  const send = useCallback<Send>((intent) => {
    const ws = socket.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      setError('Bağlantı yok; yeniden bağlanılıyor');
      return;
    }
    setError(null);
    ws.send(JSON.stringify({ id: nextId.current, intent }));
    nextId.current += 1;
  }, []);

  return { view, status, error, send };
}
