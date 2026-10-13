import { writeFileSync } from 'node:fs';
import { validateMonster } from '@masa/shared';
import { transformMonster } from '../src/monsters/transform';

const SOURCE = 'https://raw.githubusercontent.com/5e-bits/5e-database/main/src/2014/en/5e-SRD-Monsters.json';
const OUT = new URL('../data/monsters.json', import.meta.url);

const response = await fetch(SOURCE);
if (!response.ok) throw new Error(`İndirilemedi: ${response.status} ${SOURCE}`);
const raw = (await response.json()) as unknown[];
const monsters = raw.map(transformMonster).sort((a, b) => a.id.localeCompare(b.id));

const errors = monsters.flatMap(validateMonster);
if (errors.length > 0) {
  console.error(errors.join('\n'));
  throw new Error(`${errors.length} doğrulama hatası; dosya yazılmadı`);
}
writeFileSync(OUT, `${JSON.stringify(monsters, null, 1)}\n`);
console.log(`${monsters.length} canavar yazıldı`);
