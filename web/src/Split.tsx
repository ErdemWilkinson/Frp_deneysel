import { useRef, type KeyboardEvent, type PointerEvent as ReactPointerEvent, type ReactNode } from 'react';
import { useStored } from './storage';

interface Props {
  /** Genişliklerin hatırlanacağı ad. */
  id: string;
  /** Bölmelerin başlangıç genişlikleri, yüzde olarak; toplamı 100. */
  initial: number[];
  /** Her bölmenin adı; ayırıcının erişilebilir adında kullanılır. */
  labels: string[];
  min?: number;
  children: ReactNode[];
}

const STEP = 2;

/** Yan yana bölmeler. Aradaki ayırıcı sürüklenerek ya da ok tuşlarıyla genişlik değiştirilir. */
export function Split({ id, initial, labels, min = 14, children }: Props) {
  const valid = (v: unknown): boolean =>
    Array.isArray(v) && v.length === initial.length && v.every((x) => typeof x === 'number' && x >= min) &&
    Math.abs(v.reduce((a: number, b: number) => a + b, 0) - 100) < 0.5;
  const [sizes, setSizes] = useStored<number[]>(`masa.split.${id}`, initial, valid);
  const root = useRef<HTMLDivElement>(null);

  // Ayırıcı yalnızca iki komşusunu etkiler: biri ne kadar büyürse öbürü o kadar küçülür.
  const resize = (index: number, base: number[], delta: number) => {
    const d = Math.max(min - base[index]!, Math.min(base[index + 1]! - min, delta));
    setSizes(base.map((s, i) => (i === index ? s + d : i === index + 1 ? s - d : s)));
  };

  const drag = (index: number) => (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const width = root.current?.getBoundingClientRect().width || 1;
    const base = sizes;
    const x0 = event.clientX;
    const move = (e: PointerEvent) => resize(index, base, ((e.clientX - x0) / width) * 100);
    const stop = () => {
      window.removeEventListener('pointermove', move);
      document.body.classList.remove('resizing');
    };
    document.body.classList.add('resizing');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
  };

  const key = (index: number) => (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') resize(index, sizes, -STEP);
    else if (event.key === 'ArrowRight') resize(index, sizes, STEP);
    else if (event.key === 'Enter') setSizes(initial);
    else return;
    event.preventDefault();
  };

  return (
    <div className="split" ref={root}>
      {children.map((child, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="split-part" style={{ flex: `${sizes[i]} 1 0` }}>
          <div className="pane" role="group" aria-label={labels[i]}>{child}</div>
          {i < children.length - 1 && (
            <div className="split-handle" role="separator" tabIndex={0} aria-orientation="vertical"
              aria-label={`${labels[i]} ile ${labels[i + 1]} arasındaki ayırıcı`}
              aria-valuenow={Math.round(sizes[i]!)} aria-valuemin={min} aria-valuemax={Math.round(sizes[i]! + sizes[i + 1]! - min)}
              title="Sürükle ya da ok tuşlarıyla genişlet; çift tıkla sıfırla"
              onPointerDown={drag(i)} onKeyDown={key(i)} onDoubleClick={() => setSizes(initial)} />
          )}
        </div>
      ))}
    </div>
  );
}
