import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Monster, Region } from '@masa/shared';

interface TrText { name?: string; text?: string }
interface TrEntry { name?: string; traits?: TrText[]; actions?: TrText[]; legendary?: TrText[] }

const read = <T>(dir: string, file: string): T => JSON.parse(readFileSync(join(dir, file), 'utf8')) as T;

/** SRD 5.1'in insan topluluğu kayıtları; insan kitabında listelenir. */
const SRD_HUMANS = new Set([
  'acolyte', 'archmage', 'assassin', 'bandit', 'bandit-captain', 'berserker', 'commoner', 'cult-fanatic', 'cultist', 'druid',
  'gladiator', 'guard', 'knight', 'mage', 'noble', 'priest', 'scout', 'spy', 'thug', 'tribal-warrior', 'veteran',
]);

/**
 * monsters.json (içe aktarılan veri), regions.json (etiketler) ve tr.json (çeviri) dosyalarını birleştirir.
 * humans.json: bu projede yazılmış insan kayıtları; metinleri ve bölgeleri kendi içindedir.
 */
export function loadMonsters(dataDir: string): Map<string, Monster> {
  const monsters = read<Monster[]>(dataDir, 'monsters.json');
  const regions = read<Record<string, Region[]>>(dataDir, 'regions.json');
  const tr = read<Record<string, TrEntry>>(dataDir, 'tr.json');
  const map = new Map<string, Monster>();
  for (const m of monsters) {
    m.regions = regions[m.id] ?? [];
    const t = tr[m.id];
    if (t) {
      if (t.name) m.name.tr = t.name;
      const apply = (target: Monster['traits'], source: TrText[] | undefined) =>
        target.forEach((item, i) => {
          const s = source?.[i];
          // Çeviri kısmi olabilir: çevrilmemiş alan İngilizce kalır.
          if (s?.name) item.name.tr = s.name;
          if (s?.text) item.text.tr = s.text;
        });
      apply(m.traits, t.traits);
      apply(m.actions, t.actions);
      apply(m.legendaryActions, t.legendary);
    }
    if (SRD_HUMANS.has(m.id)) m.human = true;
    map.set(m.id, m);
  }
  for (const m of read<Monster[]>(dataDir, 'humans.json')) {
    m.human = true;
    map.set(m.id, m);
  }
  return map;
}
