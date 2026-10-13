// server/data/tr/ altındaki çeviri kaynaklarından server/data/tr.json dosyasını üretir.
//   monster-names.json  canavar kimliği → Türkçe ad
//   item-names.json     İngilizce özellik/eylem adı → Türkçe ad (parantez ekleri kuralla çevrilir)
//   texts.json          sayıları "#" ile maskelenmiş İngilizce metin → {0},{1}... yer tutuculu Türkçe metin
// Kalıp saldırı satırları (yalnızca isabet ve hasar bildiren) kuralla çevrilir.
import { readFileSync, writeFileSync } from 'node:fs';
import type { Monster, MonsterText } from '@masa/shared';
import { translateAttack } from '../src/monsters/translate';

const dir = new URL('../data/', import.meta.url);
const read = <T>(file: string): T => JSON.parse(readFileSync(new URL(file, dir), 'utf8')) as T;

const monsters = read<Monster[]>('monsters.json');
const monsterNames = read<Record<string, string>>('tr/monster-names.json');
const itemNames = read<Record<string, string>>('tr/item-names.json');
const texts = read<Record<string, string>>('tr/texts.json');
// anchored.json: "canavar/bölüm/sıra" → Türkçe kalıp. Anahtar elle yazılmaz; o kaydın metninden türetilir
// ve aynı kalıbı taşıyan bütün canavarlara uygulanır.
const anchored = read<Record<string, string>>('tr/anchored.json');
for (const [anchor, template] of Object.entries(anchored)) {
  const [id, section, index] = anchor.split('/') as [string, 'traits' | 'actions' | 'legendaryActions', string];
  const source = monsters.find((m) => m.id === id)?.[section][Number(index)];
  if (!source) throw new Error(`anchored.json: ${anchor} bulunamadı`);
  texts[source.text.en.replace(/\d+/g, '#')] = template;
}

const SUFFIX: Record<string, string> = {
  'Object Form Only': 'Yalnızca Nesne Biçiminde',
  'Boar or Hybrid Form Only': 'Yalnızca Domuz ya da Melez Biçimde',
  'Bite in Beast Form': 'Hayvan Biçiminde Isırık',
  'Fiend Form Only': 'Yalnızca İblis Biçiminde',
  'Oni Form Only': 'Yalnızca Oni Biçiminde',
  'Hag Form Only': 'Yalnızca Cadı Biçiminde',
  '1/Turn': 'Tur Başına 1',
};

export function translateName(en: string): string | null {
  const m = en.match(/^(.*?) \((.+)\)$/);
  const base = itemNames[m ? m[1]! : en];
  if (!base) return null;
  if (!m) return base;
  const cost = m[2]!.match(/^Costs (\d+) Actions$/);
  const suffix = cost ? `${cost[1]} Eylem Harcar` : SUFFIX[m[2]!];
  return suffix ? `${base} (${suffix})` : null;
}

/** Sayıları sırayla yer tutuculara oturtarak çeviri belleğinden metin üretir. */
export function translateFromMemory(en: string): string | null {
  const template = texts[en.replace(/\d+/g, '#')];
  if (template === undefined) return null;
  const numbers = en.match(/\d+/g) ?? [];
  return template.replace(/\{(\d+)\}/g, (_, i: string) => numbers[Number(i)] ?? `{${i}}`);
}

const item = (t: MonsterText) => {
  const name = translateName(t.name.en);
  const text = translateAttack(t.text.en) ?? translateFromMemory(t.text.en);
  return { ...(name ? { name } : {}), ...(text ? { text } : {}) };
};

const out: Record<string, unknown> = {};
let total = 0, named = 0, texted = 0;
const missingNames = new Set<string>();
for (const m of monsters) {
  const section = (list: MonsterText[]) => list.map((t) => {
    const r = item(t);
    total += 1;
    if (r.name) named += 1; else missingNames.add(t.name.en);
    if (r.text) texted += 1;
    return r;
  });
  out[m.id] = {
    ...(monsterNames[m.id] ? { name: monsterNames[m.id] } : {}),
    traits: section(m.traits), actions: section(m.actions), legendary: section(m.legendaryActions),
  };
}
writeFileSync(new URL('tr.json', dir), `${JSON.stringify(out, null, 1)}\n`);
console.log(`ad: ${named}/${total} | metin: ${texted}/${total}`);
if (missingNames.size > 0) console.log(`Adı çevrilmemiş: ${[...missingNames].join(' | ')}`);
