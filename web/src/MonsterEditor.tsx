import { useEffect, useState, type FormEvent } from 'react';
import {
  ABILITIES, ABILITY_TR, DAMAGE_TR, DAMAGE_TYPES, REGIONS, REGION_TR, abilityMod, parseDice,
  type Ability, type DamageType, type Monster, type Region,
} from '@masa/shared';
import { crLabel, signed } from './StatBlock';
import type { Send } from './useTable';

const SIZES: [string, string][] = [
  ['Tiny', 'Minik'], ['Small', 'Küçük'], ['Medium', 'Orta'], ['Large', 'Büyük'], ['Huge', 'Dev'], ['Gargantuan', 'Devasa'],
];
/** SRD 5.1: zorluk derecesine göre deneyim puanı. */
const XP_BY_CR: [number, number][] = [
  [0, 10], [0.125, 25], [0.25, 50], [0.5, 100], [1, 200], [2, 450], [3, 700], [4, 1100], [5, 1800], [6, 2300], [7, 2900],
  [8, 3900], [9, 5000], [10, 5900], [11, 7200], [12, 8400], [13, 10000], [14, 11500], [15, 13000], [16, 15000], [17, 18000],
  [18, 20000], [19, 22000], [20, 25000], [21, 33000], [22, 41000], [23, 50000], [24, 62000], [25, 75000], [26, 90000],
  [27, 105000], [28, 120000], [29, 135000], [30, 155000],
];

interface TextRow { name: string; text: string }
interface ActionRow extends TextRow { attack: boolean; bonus: number; dice: string; type: DamageType }
interface Draft {
  id: string | null;
  name: string; size: string; type: string; ac: number; hp: number; hitDice: string; speed: string; cr: number;
  abilities: Record<Ability, number>;
  saves: Record<Ability, string>;
  resistances: DamageType[]; immunities: DamageType[]; vulnerabilities: DamageType[];
  regions: Region[];
  /** İnsan kitabında listelensin mi. */
  human: boolean;
  senses: string; languages: string;
  traits: TextRow[]; actions: ActionRow[]; legendary: TextRow[]; legendaryCount: number;
}

const NO_SAVES: Record<Ability, string> = { str: '', dex: '', con: '', int: '', wis: '', cha: '' };
const BLANK: Draft = {
  id: null, name: '', size: 'Medium', type: 'monstrosity', ac: 12, hp: 22, hitDice: '4d8+4', speed: '30 ft.', cr: 1,
  abilities: { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 }, saves: NO_SAVES,
  resistances: [], immunities: [], vulnerabilities: [], regions: [], human: false, senses: '', languages: '',
  traits: [], actions: [{ name: '', text: '', attack: true, bonus: 3, dice: '1d6+1', type: 'slashing' }], legendary: [], legendaryCount: 3,
};

const fromMonster = (m: Monster): Draft => ({
  id: m.id, name: m.name.tr ?? m.name.en, size: m.size, type: m.type, ac: m.ac, hp: m.hp, hitDice: m.hitDice, speed: m.speed, cr: m.cr,
  abilities: { ...m.abilities },
  saves: Object.fromEntries(ABILITIES.map((a) => [a, m.saves[a] === undefined ? '' : String(m.saves[a])])) as Record<Ability, string>,
  resistances: [...m.resistances], immunities: [...m.immunities], vulnerabilities: [...m.vulnerabilities], regions: [...m.regions], human: !!m.human,
  senses: m.senses, languages: m.languages,
  traits: m.traits.map((t) => ({ name: t.name.tr ?? t.name.en, text: t.text.tr ?? '' })),
  actions: m.actions.map((a) => ({
    name: a.name.tr ?? a.name.en, text: a.text.tr ?? '', attack: !!a.attack, bonus: a.attack?.bonus ?? 0,
    dice: a.attack?.damage[0]?.dice ?? '1d6', type: a.attack?.damage[0]?.type ?? 'slashing',
  })),
  legendary: m.legendaryActions.map((t) => ({ name: t.name.tr ?? t.name.en, text: t.text.tr ?? '' })),
  legendaryCount: m.legendaryCount || 3,
});

const ASCII: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u' };
/** Sunucunun kabul ettiği biçimde kimlik: custom-ad-zaman. */
export const customId = (name: string, stamp: number = Date.now()): string => {
  const slug = name.toLocaleLowerCase('tr').replace(/[çğıöşü]/g, (c) => ASCII[c]!).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30);
  return `custom-${slug || 'yaratik'}-${stamp.toString(36)}`;
};

/** Can zarının ortalaması (ör. 4d8+4 → 22); zar okunamıyorsa null. */
export function averageHp(hitDice: string): number | null {
  try {
    const expr = parseDice(hitDice);
    return Math.max(1, Math.floor(expr.terms.reduce((sum, t) => sum + (t.count * (t.sides + 1)) / 2, 0) + expr.modifier));
  } catch {
    return null;
  }
}

function Checks<T extends string>({ legend, all, label, value, onChange }: {
  legend: string; all: readonly T[]; label: (x: T) => string; value: T[]; onChange: (next: T[]) => void;
}) {
  return (
    <details className="checks" open={value.length > 0}>
      <summary>{legend}{value.length > 0 ? ` (${value.length})` : ''}</summary>
      <div role="group" aria-label={legend}>
        {all.map((x) => (
          <label key={x}>
            <input type="checkbox" checked={value.includes(x)}
              onChange={() => onChange(value.includes(x) ? value.filter((y) => y !== x) : [...value, x])} /> {label(x)}
          </label>
        ))}
      </div>
    </details>
  );
}

function TextRows({ legend, noun, rows, onChange }: { legend: string; noun: string; rows: TextRow[]; onChange: (rows: TextRow[]) => void }) {
  const patch = (i: number, p: Partial<TextRow>) => onChange(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  return (
    <fieldset>
      <legend>{legend}</legend>
      {rows.map((r, i) => (
        // eslint-disable-next-line react/no-array-index-key
        <div key={i} className="editor-row">
          <input aria-label={`${noun} adı`} value={r.name} onChange={(e) => patch(i, { name: e.target.value })} maxLength={60} required />
          <textarea aria-label={`${noun} metni`} value={r.text} onChange={(e) => patch(i, { text: e.target.value })} maxLength={2000} rows={2} />
          <button type="button" onClick={() => onChange(rows.filter((_, j) => j !== i))}>Sil</button>
        </div>
      ))}
      <button type="button" disabled={rows.length >= 20} onClick={() => onChange([...rows, { name: '', text: '' }])}>{noun} ekle</button>
    </fieldset>
  );
}

interface Props {
  /** Düzenlenecek özel canavar; yoksa boş form açılır. */
  editing: Monster | null;
  types: string[];
  send: Send;
  /** Kayıt gönderildikten sonra çağrılır; kitabın yenilenmesi içindir. */
  /** İkinci bağımsız değişken: kayıt insan kitabına mı eklendi. */
  onSaved: (id: string, human: boolean) => void;
  onCancel?: () => void;
}

export function MonsterEditor({ editing, types, send, onSaved, onCancel }: Props) {
  const [d, setD] = useState<Draft>(editing ? fromMonster(editing) : BLANK);
  useEffect(() => setD(editing ? fromMonster(editing) : BLANK), [editing]);
  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => setD((x) => ({ ...x, [key]: value }));
  const number = (key: 'ac' | 'hp' | 'legendaryCount') => (e: { target: { value: string } }) => set(key, Number(e.target.value));
  const patchAction = (i: number, p: Partial<ActionRow>) => set('actions', d.actions.map((a, j) => (j === i ? { ...a, ...p } : a)));
  const average = averageHp(d.hitDice);

  const save = (event: FormEvent) => {
    event.preventDefault();
    const id = d.id ?? customId(d.name);
    const saves = Object.fromEntries(ABILITIES.filter((a) => d.saves[a].trim() !== '').map((a) => [a, Number(d.saves[a])]));
    send({
      type: 'monster.save',
      monster: {
        id, name: d.name, size: d.size, type: d.type, ac: d.ac, hp: d.hp, hitDice: d.hitDice, speed: d.speed, cr: d.cr,
        xp: XP_BY_CR.find(([cr]) => cr === d.cr)?.[1] ?? 0,
        abilities: d.abilities, saves,
        resistances: d.resistances, immunities: d.immunities, vulnerabilities: d.vulnerabilities, regions: d.regions,
        senses: d.senses, languages: d.languages,
        ...(d.human ? { human: true } : {}),
        traits: d.traits,
        actions: d.actions.map((a) => ({
          name: a.name, text: a.text,
          ...(a.attack ? { attack: { bonus: a.bonus, damage: [{ dice: a.dice, type: a.type }] } } : {}),
        })),
        legendaryActions: d.legendary, legendaryCount: d.legendaryCount,
      },
    });
    onSaved(id, d.human);
    if (!d.id) setD(BLANK);
  };

  return (
    <section aria-label="Yaratık yarat" className="editor">
      <h2>{d.id ? 'Yaratığı düzenle' : 'Yaratık yarat'}</h2>
      <p className="hint">Kendi yaratığın kitaba eklenir; karşılaşmaya SRD canavarları gibi koyarsın. Oyuncu değerlerini görmez.</p>
      <form onSubmit={save}>
        <label>Ad <input value={d.name} onChange={(e) => set('name', e.target.value)} maxLength={60} required /></label>
        <div className="editor-grid">
          <label>Boyut{' '}
            <select value={d.size} onChange={(e) => set('size', e.target.value)}>
              {SIZES.map(([value, tr]) => <option key={value} value={value}>{tr}</option>)}
            </select>
          </label>
          <label>Tür <input value={d.type} onChange={(e) => set('type', e.target.value)} list="monster-types" maxLength={30} required /></label>
          <datalist id="monster-types">{types.map((t) => <option key={t} value={t} />)}</datalist>
          <label>Meydan okuma derecesi{' '}
            <select value={d.cr} onChange={(e) => set('cr', Number(e.target.value))}>
              {XP_BY_CR.map(([cr, xp]) => <option key={cr} value={cr}>{crLabel(cr)} ({xp} deneyim puanı)</option>)}
            </select>
          </label>
          <label>Zırh sınıfı <input type="number" min={1} max={40} value={d.ac} onChange={number('ac')} required /></label>
          <label>Can zarı <input value={d.hitDice} onChange={(e) => set('hitDice', e.target.value)} maxLength={30} placeholder="4d8+4" required /></label>
          <label>Can puanı <input type="number" min={1} max={9999} value={d.hp} onChange={number('hp')} required /></label>
          <label>Hız <input value={d.speed} onChange={(e) => set('speed', e.target.value)} maxLength={80} /></label>
        </div>
        {average === null
          ? <p className="hint">Can zarı "4d8+4" biçiminde olmalı.</p>
          : average !== d.hp && <button type="button" onClick={() => set('hp', average)}>Can puanını can zarının ortalaması yap ({average})</button>}

        <fieldset>
          <legend>Yetenekler</legend>
          <div className="editor-abilities">
            {ABILITIES.map((a) => (
              <div key={a}>
                <label>{ABILITY_TR[a]} <input type="number" min={1} max={30} value={d.abilities[a]}
                  onChange={(e) => set('abilities', { ...d.abilities, [a]: Number(e.target.value) })} required /></label>
                <span>{signed(abilityMod(d.abilities[a]))}</span>
                <input type="number" min={-10} max={30} aria-label={`${ABILITY_TR[a]} kurtarma bonusu`} placeholder="kurt."
                  value={d.saves[a]} onChange={(e) => set('saves', { ...d.saves, [a]: e.target.value })} />
              </div>
            ))}
          </div>
          <p className="hint">Kurtarma bonusunu boş bırakırsan yetenek değiştiricisi kullanılır.</p>
        </fieldset>

        <Checks legend="Direnç" all={DAMAGE_TYPES} label={(t) => DAMAGE_TR[t]} value={d.resistances} onChange={(v) => set('resistances', v)} />
        <Checks legend="Bağışıklık" all={DAMAGE_TYPES} label={(t) => DAMAGE_TR[t]} value={d.immunities} onChange={(v) => set('immunities', v)} />
        <Checks legend="Zayıflık" all={DAMAGE_TYPES} label={(t) => DAMAGE_TR[t]} value={d.vulnerabilities} onChange={(v) => set('vulnerabilities', v)} />
        <Checks legend="Bölgeler" all={REGIONS} label={(r) => REGION_TR[r]} value={d.regions} onChange={(v) => set('regions', v)} />

        <label className="switch">
          <input type="checkbox" checked={d.human} onChange={(e) => set('human', e.target.checked)} /> İnsan kitabında göster
        </label>

        <label>Duyular <input value={d.senses} onChange={(e) => set('senses', e.target.value)} maxLength={120} placeholder="karanlık görüşü 60 ft." /></label>
        <label>Diller <input value={d.languages} onChange={(e) => set('languages', e.target.value)} maxLength={120} /></label>

        <TextRows legend="Özellikler" noun="Özellik" rows={d.traits} onChange={(rows) => set('traits', rows)} />

        <fieldset>
          <legend>Eylemler</legend>
          {d.actions.map((a, i) => (
            // eslint-disable-next-line react/no-array-index-key
            <div key={i} className="editor-row">
              <input aria-label="Eylem adı" value={a.name} onChange={(e) => patchAction(i, { name: e.target.value })} maxLength={60} required />
              <label className="switch"><input type="checkbox" checked={a.attack} onChange={(e) => patchAction(i, { attack: e.target.checked })} /> Saldırı zarı atılır</label>
              {a.attack && (
                <div className="editor-attack">
                  <label>İsabet <input type="number" min={-10} max={30} value={a.bonus} onChange={(e) => patchAction(i, { bonus: Number(e.target.value) })} /></label>
                  <label>Hasar <input value={a.dice} onChange={(e) => patchAction(i, { dice: e.target.value })} maxLength={30} required /></label>
                  <select aria-label="Hasar türü" value={a.type} onChange={(e) => patchAction(i, { type: e.target.value as DamageType })}>
                    {DAMAGE_TYPES.map((t) => <option key={t} value={t}>{DAMAGE_TR[t]}</option>)}
                  </select>
                </div>
              )}
              <textarea aria-label="Eylem metni" value={a.text} onChange={(e) => patchAction(i, { text: e.target.value })} maxLength={2000} rows={2} />
              <button type="button" onClick={() => set('actions', d.actions.filter((_, j) => j !== i))}>Sil</button>
            </div>
          ))}
          <button type="button" disabled={d.actions.length >= 20}
            onClick={() => set('actions', [...d.actions, { name: '', text: '', attack: false, bonus: 0, dice: '1d6', type: 'slashing' }])}>Eylem ekle</button>
        </fieldset>

        <TextRows legend="Efsanevi eylemler" noun="Efsanevi eylem" rows={d.legendary} onChange={(rows) => set('legendary', rows)} />
        {d.legendary.length > 0 && (
          <label>Raunt başına efsanevi hak <input type="number" min={1} max={5} value={d.legendaryCount} onChange={number('legendaryCount')} /></label>
        )}

        <div className="editor-actions">
          <button className="btn-primary">{d.id ? 'Değişiklikleri kaydet' : 'Yaratığı kitaba ekle'}</button>
          {onCancel && d.id && <button type="button" onClick={onCancel}>Vazgeç</button>}
        </div>
      </form>
    </section>
  );
}
