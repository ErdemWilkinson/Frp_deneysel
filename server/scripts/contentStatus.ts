import { fileURLToPath } from 'node:url';
import { loadMonsters } from '../src/monsters/load';

const monsters = [...loadMonsters(fileURLToPath(new URL('../data', import.meta.url))).values()];
const untagged = monsters.filter((m) => m.regions.length === 0);
const texts = (m: (typeof monsters)[number]) => [...m.traits, ...m.actions, ...m.legendaryActions];
const untranslated = monsters.filter((m) => m.name.tr === null || texts(m).some((t) => t.name.tr === null || t.text.tr === null));

console.log(`Bölge etiketi: ${monsters.length - untagged.length}/${monsters.length}`);
console.log(`Çeviri: ${monsters.length - untranslated.length}/${monsters.length}`);
const limit = Number(process.argv[2] ?? 40);
if (untagged.length > 0) console.log(`Etiketsiz (ilk ${limit}): ${untagged.slice(0, limit).map((m) => m.id).join(', ')}`);
if (untranslated.length > 0) console.log(`Çevrilmemiş (ilk ${limit}): ${untranslated.slice(0, limit).map((m) => m.id).join(', ')}`);
