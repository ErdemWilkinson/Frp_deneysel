import { useCallback, useState } from 'react';

function read<T>(key: string, fallback: T, valid: (v: unknown) => boolean): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return valid(parsed) ? (parsed as T) : fallback;
  } catch {
    return fallback;
  }
}

/** Bu tarayıcıda hatırlanan küçük tercih (bölme genişliği, açık sekme). Depo kapalıysa yalnızca bellekte tutar. */
export function useStored<T>(key: string, initial: T, valid: (v: unknown) => boolean = () => true): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => read(key, initial, valid));
  const set = useCallback((next: T) => {
    setValue(next);
    try { window.localStorage.setItem(key, JSON.stringify(next)); } catch { /* özel pencere: tercih bu oturumda kalır */ }
  }, [key]);
  return [value, set];
}
