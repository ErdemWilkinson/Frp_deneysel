import type { RollMode } from './dice';
import type { DeathSaves, HpBand } from './rules';
import type { CharacterProfile, SkillKey } from './sheet';

export const ABILITIES = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
export type Ability = (typeof ABILITIES)[number];

export const DAMAGE_TYPES = [
  'acid', 'bludgeoning', 'cold', 'fire', 'force', 'lightning', 'necrotic',
  'piercing', 'poison', 'psychic', 'radiant', 'slashing', 'thunder',
] as const;
export type DamageType = (typeof DAMAGE_TYPES)[number];

export const REGIONS = [
  'forest', 'mountain', 'underground', 'swamp', 'desert', 'coast',
  'underwater', 'arctic', 'grassland', 'urban', 'ruins', 'planar',
  // Açık su: canavar kitabında ayrı etiketi yoktur, kıyı ve su altı yaratıklarından seçilir.
  'sea', 'lake',
  // Zindan: odalar ve koridorlardan kurulu, duvarlı bir savaş alanı. Canavarlar yeraltı ve harabe etiketlerinden seçilir.
  'dungeon',
  // Yerleşim: küçük şehir (kasaba) ve büyük şehir; yapılar, odalar, sokaklar ve ara sokaklarla çizilir.
  'town', 'city',
  // Yapılı araziler: her biri kendi yapılarıyla (duvar, sütun, çadır, çit...) çizilir.
  'castle', 'ship', 'camp', 'graveyard', 'temple', 'farm', 'river', 'tavern', 'market',
  // Zindan benzeri yeraltı mekânları: odalar ve koridorlar, farklı görünüşte.
  'cavern', 'sewer', 'mine',
] as const;
export type Region = (typeof REGIONS)[number];

export const CONDITIONS = [
  'blinded', 'charmed', 'deafened', 'frightened', 'grappled', 'incapacitated', 'invisible',
  'paralyzed', 'petrified', 'poisoned', 'prone', 'restrained', 'stunned', 'unconscious', 'exhaustion',
] as const;
export type Condition = (typeof CONDITIONS)[number];

export const DIFFICULTIES = ['easy', 'medium', 'hard', 'deadly'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

/** Günün saati ve ortam ışığı: gündüz tam aydınlıktır, karanlıkta yalnızca ışık kaynaklarının çevresi görünür. */
export const DAYLIGHTS = ['day', 'morning', 'evening', 'night', 'dark'] as const;
export type Daylight = (typeof DAYLIGHTS)[number];

export const ROLL_MODES = ['normal', 'advantage', 'disadvantage'] as const;
export type Role = 'dm' | 'player';

export interface Localized { tr: string | null; en: string }
export interface MonsterText { name: Localized; text: Localized }
export interface DamagePart { dice: string; type: DamageType }
export interface MonsterAction extends MonsterText {
  attack?: { bonus: number; damage: DamagePart[] };
}

export interface Monster {
  id: string;
  /** İnsan kitabında listelenir: haydut, muhafız, tüccar gibi insan topluluğundan kişiler. */
  human?: boolean;
  name: Localized;
  size: string;
  type: string;
  ac: number;
  hp: number;
  hitDice: string;
  speed: string;
  abilities: Record<Ability, number>;
  saves: Partial<Record<Ability, number>>;
  skills: Record<string, number>;
  resistances: DamageType[];
  immunities: DamageType[];
  vulnerabilities: DamageType[];
  /** Tek bir hasar türüne indirgenemeyen savunmalar ("büyülü olmayan saldırılardan..."); DM elle uygular. */
  defenseNotes: string[];
  conditionImmunities: string[];
  senses: string;
  languages: string;
  cr: number;
  xp: number;
  traits: MonsterText[];
  actions: MonsterAction[];
  legendaryActions: MonsterText[];
  legendaryCount: number;
  regions: Region[];
}

export interface CharacterAttack {
  name: string; bonus: number; damage: string; type: DamageType;
  /** Menzil (ft): yakın dövüşte 5, yayda 80 gibi. */
  range: number;
}
export interface InventoryItem {
  id: string;
  name: string;
  qty: number;
  note: string;
  /** Yanınca aydınlattığı yarıçap (ft); 0 ise ışık vermez. Aynı mesafe kadar da loş ışık yayar. */
  light: number;
  lit: boolean;
}
export interface Character {
  name: string;
  level: number;
  ac: number;
  maxHp: number;
  hp: number;
  tempHp: number;
  /** Yürüme hızı (ft); bir turda bu kadar yol alınır. */
  speed: number;
  abilities: Record<Ability, number>;
  proficiency: number;
  saveProficiencies: Ability[];
  attacks: CharacterAttack[];
  /** Karakter sayfasının kimlik, beceri ve öykü bölümü; eski kayıtlarda olmayabilir. */
  profile?: CharacterProfile;
  /** Çanta: eşyalar serbestçe eklenir; ışık veren bir eşya yakılınca jeton çevresini aydınlatır. */
  inventory?: InventoryItem[];
  deathSaves: DeathSaves;
  dead: boolean;
}

export interface MonsterCombatant {
  id: string;
  kind: 'monster';
  monsterId: string;
  name: string;
  ac: number;
  hp: number;
  maxHp: number;
  tempHp: number;
  dexMod: number;
  initiative: number | null;
  conditions: Condition[];
  revealName: boolean;
  revealHp: boolean;
  legendaryLeft: number | null;
  /** Bu yaratığın tecrübe puanı karaktere verildi mi. */
  xpAwarded?: boolean;
  /** Oyuncunun yaratığı zarla tanıma zorluğu; yoksa zorluk derecesinden hesaplanır. */
  identifyDc?: number;
  /** Bu tür için tanıma zarı atıldı mı; DM sıfırlayabilir. */
  identifyTried?: boolean;
  /** Bu turda yürünen mesafe (ft) ve koşu eyleminin kullanılıp kullanılmadığı. */
  moved: number;
  dashed: boolean;
}
/** Karakterin can puanı `TableState.character` içinde durur; burada yalnızca savaşa özgü alanlar var. */
export interface CharacterCombatant {
  id: string;
  kind: 'character';
  initiative: number | null;
  conditions: Condition[];
  moved: number;
  dashed: boolean;
}
export type Combatant = MonsterCombatant | CharacterCombatant;

export interface Encounter {
  id: string;
  /** draft: taslak · initiative: inisiyatif zarları bekleniyor · active: raunt oynanıyor. */
  status: 'draft' | 'initiative' | 'active';
  round: number;
  turnIndex: number;
  combatants: Combatant[];
}

/** Harita üzerindeki jeton. Konum, haritanın genişlik ve yüksekliğine oranla 0–1 arasındadır. */
export interface Token {
  id: string;
  label: string;
  kind: 'character' | 'monster' | 'marker';
  /** Savaştaki bir canavara bağlıysa onun kimliği; ad ve can durumu oradan gelir. */
  combatantId: string | null;
  x: number;
  y: number;
  hidden: boolean;
  /** Bu jetonun yaydığı ışığın yarıçapı (ft); yoksa 0. */
  light?: number;
}
export interface Board {
  mapId: string | null;
  visible: boolean;
  tokens: Token[];
  /** Alanın eni kaç ft; mesafeler buna göre ölçülür. */
  widthFt: number;
  /** Alanın boyunun enine oranı (resmin oranı). */
  aspect: number;
  /** Yüklenmiş harita yoksa alan bu arazi türüne göre çizilir. */
  terrain: Region | null;
  /** Çizimin tohumu: aynı tohum iki ekranda da aynı alanı verir. */
  seed: number;
  daylight: Daylight;
}
/** Ana harita: dünyanın büyük haritası ve karakterin üzerindeki yeri. */
export interface World {
  mapId: string | null;
  aspect: number;
  visible: boolean;
  x: number;
  y: number;
  /** Karakterin bulunduğu yerin arazi türü; karşılaşma ve savaş alanı buna göre kurulur. */
  region: Region | null;
}
export const newWorld = (): World => ({ mapId: null, aspect: 0.75, visible: false, x: 0.5, y: 0.5, region: null });
export const newBoard = (): Board => ({ mapId: null, visible: false, tokens: [], widthFt: 100, aspect: 0.75, terrain: null, seed: 1, daylight: 'day' });

export interface TableState {
  code: string;
  character: Character | null;
  encounter: Encounter | null;
  board: Board;
  world: World;
  /** Oyuncunun yüklediği karakter sayfası dosyası. */
  sheetId: string | null;
  /** Hayali savaş: sıra ve harita yoktur, savaşı yalnızca DM yönetir. Savaş kurulmadan da açılabilir. */
  theater: boolean;
  /** Yeni gelen yaratıklar bilinmeyen girer; oyuncu bilgi zarıyla tanır. */
  identify: boolean;
}
export const newTable = (code: string): TableState => ({
  code, character: null, encounter: null, board: newBoard(), world: newWorld(), sheetId: null, theater: false, identify: false,
});

export interface LogEntry {
  id: string;
  at: number;
  actor: Role;
  visibility: 'public' | 'dm';
  kind: 'roll' | 'attack' | 'damage' | 'save' | 'condition' | 'manual' | 'turn';
  text: string;
}

export interface CombatantPatch {
  hp?: number;
  tempHp?: number;
  initiative?: number;
  conditions?: Condition[];
  revealName?: boolean;
  revealHp?: boolean;
  legendaryLeft?: number;
  identifyDc?: number;
  identifyTried?: boolean;
}

export type Intent =
  | { type: 'roll'; expr: string; mode?: RollMode; secret?: boolean; label?: string }
  | { type: 'character.set'; character: unknown }
  | { type: 'character.attack'; attackIndex: number; targetId: string; mode?: RollMode; d20?: number }
  | { type: 'character.save'; ability: Ability; dc?: number; mode?: RollMode }
  | { type: 'character.check'; skill: SkillKey; dc?: number; mode?: RollMode }
  | { type: 'character.deathSave' }
  | { type: 'encounter.addMonster'; monsterId: string; count: number; hpMode: 'average' | 'rolled' }
  | { type: 'encounter.remove'; combatantId: string }
  | { type: 'encounter.generate'; region: Region; level: number; difficulty: Difficulty }
  | { type: 'table.setIdentify'; identify: boolean }
  | { type: 'table.setTheater'; theater: boolean }
  | { type: 'character.identify'; targetId: string }
  | { type: 'encounter.start' }
  | { type: 'encounter.end' }
  | { type: 'combat.rollInitiative'; combatantId?: string; mode?: RollMode }
  | { type: 'combat.begin' }
  | { type: 'combat.nextTurn' }
  | { type: 'combat.dash' }
  | { type: 'combat.monsterAttack'; combatantId: string; actionIndex: number; mode?: RollMode }
  | { type: 'combat.monsterSave'; combatantId: string; ability: Ability; dc: number; mode?: RollMode }
  | { type: 'combat.applyDamage'; combatantId: string; amount: number; damageType: DamageType }
  | { type: 'combat.heal'; combatantId: string; amount: number }
  | { type: 'combatant.patch'; combatantId: string; patch: CombatantPatch }
  | { type: 'monster.setRegions'; monsterId: string; regions: Region[] }
  | { type: 'monster.save'; monster: unknown }
  | { type: 'monster.delete'; monsterId: string }
  | { type: 'board.setMap'; mapId: string | null }
  | { type: 'board.show'; visible: boolean }
  | { type: 'board.setTerrain'; terrain: Region | null }
  | { type: 'world.setMap'; mapId: string | null }
  | { type: 'world.show'; visible: boolean }
  | { type: 'world.move'; x: number; y: number; region?: Region | null }
  | { type: 'world.setRegion'; region: Region | null }
  | { type: 'world.setAspect'; aspect: number }
  | { type: 'board.setScale'; widthFt?: number; aspect?: number }
  | { type: 'board.placeCombatants' }
  | { type: 'board.addMarker'; label: string }
  | { type: 'board.moveToken'; tokenId: string; x: number; y: number }
  | { type: 'board.patchToken'; tokenId: string; hidden?: boolean; label?: string; light?: number }
  | { type: 'board.setDaylight'; daylight: Daylight }
  | { type: 'inventory.add'; name: string; qty?: number; note?: string; light?: number }
  | { type: 'inventory.update'; itemId: string; name?: string; qty?: number; note?: string; lit?: boolean }
  | { type: 'inventory.remove'; itemId: string }
  | { type: 'board.removeToken'; tokenId: string }
  | { type: 'sheet.set'; fileId: string | null };

export interface PlayerCombatant {
  id: string;
  kind: 'monster' | 'character';
  name: string;
  initiative: number | null;
  conditions: Condition[];
  band: HpBand | null;
  hp: number | null;
  maxHp: number | null;
  current: boolean;
  /** Karakterin bu turda kalan yürüme mesafesi (ft); canavarlar için bilinmez. */
  moveLeft: number | null;
  /** Oyuncu bu yaratığı bilgi zarıyla tanımayı deneyebilir mi. */
  identifiable?: boolean;
}
export interface PlayerToken {
  id: string;
  label: string;
  kind: Token['kind'];
  x: number;
  y: number;
  band: HpBand | null;
  /** Oyuncu bu jetonu sürükleyebilir mi? */
  mine: boolean;
  /** Jeton savaştaki bir yaratığınsa, saldırıda hedef gösterilecek kimlik. */
  targetId: string | null;
  /** Jetonun yaydığı ışığın yarıçapı (ft); jetonu taşıyanın yaktığı eşya da sayılır. */
  light?: number;
}
export interface PlayerView {
  role: 'player';
  code: string;
  /** DM hayali savaşı açtı mı (savaş kurulmadan da geçerlidir). */
  theater?: boolean;
  character: Character | null;
  encounter: { round: number; phase: 'initiative' | 'combat'; theater: boolean; combatants: PlayerCombatant[] } | null;
  board: { mapId: string | null; widthFt: number; aspect: number; terrain: Region | null; seed: number; daylight: Daylight; tokens: PlayerToken[] } | null;
  /** DM açtıysa ana harita ve karakterin üzerindeki yeri. */
  world: { mapId: string; aspect: number; x: number; y: number } | null;
  sheetId: string | null;
  log: LogEntry[];
}
export interface DmView {
  role: 'dm';
  code: string;
  /** Hayali savaş ve yaratığı zarla tanıtma tercihleri. */
  theater?: boolean;
  identify?: boolean;
  character: Character | null;
  encounter: Encounter | null;
  board: Board;
  world: World;
  sheetId: string | null;
  log: LogEntry[];
}
export type View = PlayerView | DmView;

export interface ClientMessage { id: number; intent: Intent }
export type ServerMessage =
  | { type: 'state'; view: View }
  | { type: 'error'; id: number; message: string };
