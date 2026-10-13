// Kurallara dayalı ilk bölge etiketleme. Çıktı server/data/regions.json dosyasına yazılır;
// DM kitaptan tek tek düzeltebilir. Yeniden çalıştırmak elle yapılmış düzeltmeleri `overrides` ile korur.
import { readFileSync, writeFileSync } from 'node:fs';
import type { Monster, Region } from '@masa/shared';

const dir = new URL('../data/', import.meta.url);
const monsters = JSON.parse(readFileSync(new URL('monsters.json', dir), 'utf8')) as Monster[];

const has = (m: Monster, re: RegExp): boolean => re.test(m.id) || re.test(m.name.en);
const speed = (m: Monster, kind: string): boolean => new RegExp(`${kind} \\d+`).test(m.speed);

// Ada göre kesin yerleşimler: ejderhalar, devler ve sık görülen yaratıklar.
const BY_NAME: [RegExp, Region[]][] = [
  [/red-dragon|red-dragon|brass|copper|gold-dragon|ancient-gold/, ['mountain', 'desert']],
  [/white-dragon|silver-dragon/, ['arctic', 'mountain']],
  [/black-dragon/, ['swamp', 'ruins']],
  [/green-dragon/, ['forest']],
  [/blue-dragon/, ['desert', 'coast']],
  [/bronze-dragon/, ['coast']],
  [/frost-giant|yeti|winter-wolf|remorhaz|mammoth|polar-bear/, ['arctic']],
  [/fire-giant|salamander|magmin|azer|hell-hound|red-dragon|efreeti/, ['mountain', 'underground']],
  [/hill-giant|ogre|troll|ettin/, ['grassland', 'mountain']],
  [/stone-giant|cloud-giant|griffon|hippogriff|roc|harpy|wyvern|manticore|chimera|peryton/, ['mountain']],
  [/storm-giant|merfolk|kraken|sea-hag|sahuagin|giant-shark|hunter-shark|reef-shark|killer-whale|octopus|sea-horse|dolphin|plesiosaurus|quipper|marid|water-elemental|giant-crab|crab|giant-sea-horse/, ['coast', 'underwater']],
  [/lizardfolk|crocodile|giant-toad|frog|bullywug|will-o|swamp|shambling-mound|otyugh|giant-lizard|hydra|giant-constrictor|giant-poisonous-snake|poisonous-snake|constrictor/, ['swamp']],
  [/scorpion|camel|mummy|mummy-lord|dust-mephit|gnoll|jackal|giant-hyena|hyena|sphinx|lamia|couatl|djinni|giant-vulture|vulture|cockatrice/, ['desert']],
  [/drow|duergar|mind-flayer|beholder|umber-hulk|rust-monster|roper|cloaker|piercer|grick|gelatinous|black-pudding|gray-ooze|ochre|gibbering|darkmantle|kuo-toa|quaggoth|svirfneblin|aboleth|bat|giant-spider|phase-spider|spider|stirge|carrion-crawler|owlbear|xorn|earth-elemental|gargoyle/, ['underground']],
  [/wolf|dire-wolf|worg|bear|boar|elk|deer|stag|centaur|dryad|satyr|sprite|pixie|unicorn|treant|ent|blink-dog|giant-owl|owl|panther|tiger|lion|ape|giant-eagle|eagle|hawk|vine|awakened-tree|ankheg|displacer|giant-wasp|giant-badger|badger|boar|giant-boar|swarm-of-insects|green-hag|owlbear|werewolf|wererat|weretiger|werebear|wereboar|goblin|hobgoblin|bugbear|kobold|orc|orog/, ['forest']],
  [/horse|pony|donkey|mule|ox|goat|giant-goat|riding|draft|warhorse|mastiff|rhinoceros|elephant|giant-elk|allosaurus|triceratops|ankylosaurus|tyrannosaurus|axe-beak|giant-lizard|bandit|thug|scout|tribal|commoner|noble|veteran|knight|cultist|acolyte|priest|mage|guard|spy|gladiator|assassin|berserker|archmage|druid|bard|ghoul|ghast|shadow|wight|zombie|skeleton|ghost|wraith|specter|banshee|vampire|poltergeist|mimic|rat|giant-rat|raven|cat|crow|bat|sprite|imp|quasit/, ['urban']],
];

const tags = new Map<string, Set<Region>>();
const add = (id: string, ...regions: Region[]) => {
  const set = tags.get(id) ?? new Set<Region>();
  for (const r of regions) set.add(r);
  tags.set(id, set);
};

for (const m of monsters) {
  for (const [re, regions] of BY_NAME) if (re.test(m.id)) add(m.id, ...regions);

  // Türe göre genel kurallar.
  switch (m.type) {
    case 'fiend': case 'celestial': add(m.id, 'planar'); break;
    case 'elemental': add(m.id, 'planar'); break;
    case 'undead': add(m.id, 'ruins'); break;
    case 'construct': add(m.id, 'ruins'); break;
    case 'ooze': add(m.id, 'underground', 'ruins'); break;
    case 'aberration': add(m.id, 'underground'); break;
    case 'plant': add(m.id, 'forest', 'swamp'); break;
    case 'fey': add(m.id, 'forest'); break;
    case 'dragon': if (!tags.has(m.id)) add(m.id, 'mountain'); break;
    case 'giant': if (!tags.has(m.id)) add(m.id, 'mountain'); break;
    case 'monstrosity': if (!tags.has(m.id)) add(m.id, 'forest', 'underground'); break;
    case 'beast': if (!tags.has(m.id)) add(m.id, 'grassland', 'forest'); break;
    case 'humanoid': if (!tags.has(m.id)) add(m.id, 'urban', 'grassland'); break;
    default: break;
  }

  // Hız ve duyulara göre ek ipuçları.
  if (speed(m, 'swim') && !speed(m, 'walk')) add(m.id, 'underwater');
  else if (speed(m, 'swim')) add(m.id, 'coast');
  if (speed(m, 'burrow')) add(m.id, 'underground');
  if (/darkvision 1[2-9]\d ft|darkvision 120/.test(m.senses)) add(m.id, 'underground');
  if (m.immunities.includes('cold') || m.resistances.includes('cold')) add(m.id, 'arctic');
  if (m.immunities.includes('fire') && m.type !== 'dragon' && m.type !== 'fiend') add(m.id, 'desert');
  if (has(m, /dungeon|tomb|crypt|golem|animated|mimic|gargoyle/)) add(m.id, 'ruins');
  if (m.type === 'undead' && has(m, /ghoul|ghast|vampire|wight|zombie|skeleton|specter|ghost|wraith|mummy/)) add(m.id, 'urban');
}

// En fazla dört etiket; önce yazılma sırası korunur. Etiketsiz kalan olmasın.
const out: Record<string, Region[]> = {};
for (const m of monsters) {
  const regions = [...(tags.get(m.id) ?? new Set<Region>(['grassland']))].slice(0, 4);
  out[m.id] = regions;
}
writeFileSync(new URL('regions.json', dir), `${JSON.stringify(out, null, 1)}\n`);

const count = new Map<Region, number>();
for (const regions of Object.values(out)) for (const r of regions) count.set(r, (count.get(r) ?? 0) + 1);
console.log(`${Object.keys(out).length} canavar etiketlendi`);
console.log([...count.entries()].sort().map(([r, n]) => `${r}: ${n}`).join('\n'));
