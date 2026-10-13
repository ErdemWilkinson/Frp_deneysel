import { useState, type FormEvent } from 'react';
import { LIGHT_RADII, QUICK_ITEMS, type Character } from '@masa/shared';
import { num } from './controls';
import type { Send } from './useTable';

/** Sol özetin altındaki hızlı erişim: eşyalar, adet ve ışık anahtarı. Eklemek için Çanta sekmesi. */
export function QuickBag({ character, send }: { character: Character; send: Send }) {
  const items = character.inventory ?? [];
  return (
    <section className="quick-bag" aria-label="Hızlı çanta">
      <h3>Çanta</h3>
      {items.length === 0 ? <p className="hint">Çanta boş.</p> : (
        <ul>
          {items.map((item) => (
            <li key={item.id} className={item.lit ? 'lit' : undefined}>
              <span className="item-name">{item.name}{item.qty > 1 ? ` ×${item.qty}` : ''}</span>
              <span className="qty">
                <button type="button" aria-label={`${item.name} hızlı azalt`}
                  onClick={() => send({ type: 'inventory.update', itemId: item.id, qty: item.qty - 1 })}>−</button>
                {item.light > 0 && (
                  <button type="button" aria-pressed={item.lit} aria-label={`${item.name} ${item.lit ? 'söndür' : 'yak'}`}
                    onClick={() => send({ type: 'inventory.update', itemId: item.id, lit: !item.lit })}>
                    {item.lit ? 'Söndür' : 'Yak'}
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/** Karakterin çantası: eşya doğrudan eklenir; ışık veren eşya yakılınca jetonun çevresini aydınlatır. */
export function Inventory({ character, send }: { character: Character; send: Send }) {
  const items = character.inventory ?? [];
  const [name, setName] = useState('');
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  const [light, setLight] = useState(0);

  const add = (event: FormEvent) => {
    event.preventDefault();
    send({ type: 'inventory.add', name, qty, note: note.trim() || undefined, light });
    setName('');
    setQty(1);
    setNote('');
    setLight(0);
  };

  return (
    <section aria-label="Çanta" className="card inventory">
      <h2>Çanta</h2>
      <div className="quick-items" role="group" aria-label="Hızlı ekle">
        {QUICK_ITEMS.map((q) => (
          <button key={q.name} type="button" onClick={() => send({ type: 'inventory.add', name: q.name, light: q.light })}>
            {q.name}
          </button>
        ))}
      </div>

      <form className="item-form" onSubmit={add}>
        <label>Eşya adı <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required /></label>
        <label>Adet <input type="number" min={1} max={999} value={qty} onChange={(e) => setQty(num(e))} /></label>
        <label>Not <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={120} /></label>
        <label>Işık yarıçapı{' '}
          <select value={light} onChange={(e) => setLight(Number(e.target.value))}>
            {LIGHT_RADII.map((r) => <option key={r} value={r}>{r === 0 ? 'Işık vermez' : `${r} fit`}</option>)}
          </select>
        </label>
        <button type="submit" className="btn-primary">Çantaya ekle</button>
      </form>

      {items.length === 0 ? <p className="hint">Çanta boş.</p> : (
        <ul className="items">
          {items.map((item) => (
            <li key={item.id} className={item.lit ? 'lit' : undefined}>
              <span className="item-name">
                <strong>{item.name}</strong>
                {item.note && <small>{item.note}</small>}
                {item.light > 0 && <small>{item.light} fit ışık</small>}
              </span>
              <span className="qty">
                <button type="button" aria-label={`${item.name} adedini azalt`}
                  onClick={() => send({ type: 'inventory.update', itemId: item.id, qty: item.qty - 1 })}>−</button>
                <output aria-label={`${item.name} adedi`}>{item.qty}</output>
                <button type="button" aria-label={`${item.name} adedini artır`} disabled={item.qty >= 999}
                  onClick={() => send({ type: 'inventory.update', itemId: item.id, qty: item.qty + 1 })}>+</button>
              </span>
              {item.light > 0 && (
                <label className="switch">
                  <input type="checkbox" aria-label={`${item.name} yanıyor`} checked={item.lit}
                    onChange={(e) => send({ type: 'inventory.update', itemId: item.id, lit: e.target.checked })} /> Yanıyor
                </label>
              )}
              <button type="button" aria-label={`${item.name} çıkar`} onClick={() => send({ type: 'inventory.remove', itemId: item.id })}>Çıkar</button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
