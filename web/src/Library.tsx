import { useEffect, useMemo, useState } from 'react';
import type { Monster } from '@masa/shared';
import { fetchBookMonsters } from './api';
import { Bestiary } from './Bestiary';
import { RaceBook, SpellBook } from './Reference';
import { Tabs } from './Tabs';

const nothing = () => undefined;

/** Giriş gerektirmeyen gezinti: canavar, insan, büyü ve ırk kitapları yalnızca okunur. */
export function Library() {
  const [monsters, setMonsters] = useState<Monster[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState('book');

  useEffect(() => {
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    // Ücretsiz sunucu uykudan uyanırken ilk istek düşebilir; birkaç kez yeniden dener.
    const load = (attempt: number) => {
      fetchBookMonsters()
        .then((list) => { if (!stopped) setMonsters(list); })
        .catch((e: Error) => {
          if (stopped) return;
          if (attempt < 5) timer = setTimeout(() => load(attempt + 1), 3000);
          else setError(e.message);
        });
    };
    load(0);
    return () => { stopped = true; clearTimeout(timer); };
  }, []);

  const creatures = useMemo(() => (monsters ?? []).filter((m) => !m.human), [monsters]);
  const people = useMemo(() => (monsters ?? []).filter((m) => m.human), [monsters]);
  const book = (list: Monster[], title: string) => (
    monsters === null
      ? <p className="notice">{error ? `Kitap yüklenemedi: ${error}` : 'Kitap getiriliyor…'}</p>
      : <Bestiary monsters={list} title={title} send={nothing} onRegions={nothing} readOnly />
  );

  return (
    <main className="start library">
      <a className="back" href="#">Ana menüye dön</a>
      <h1>Kitaplık</h1>
      <p className="hint">Masa açık olmasa da kitaplara göz at. Burada yalnızca okunur; karşılaşma kurmak için masaya DM olarak girmek gerekir.</p>
      <Tabs label="Kitaplık" active={tab} onChange={setTab} tabs={[
        { key: 'book', label: 'Canavar kitabı', content: book(creatures, 'Canavar kitabı') },
        { key: 'people', label: 'İnsan kitabı', content: book(people, 'İnsan kitabı') },
        { key: 'spells', label: 'Büyüler kitabı', content: <SpellBook cantrips={false} /> },
        { key: 'cantrips', label: 'Büyü hileleri', content: <SpellBook cantrips /> },
        { key: 'races', label: 'Irklar kitabı', content: <RaceBook /> },
      ]} />
    </main>
  );
}
