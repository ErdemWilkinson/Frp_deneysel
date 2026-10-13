import type { HpBand } from './rules';
import type { Ability, Condition, DamageType, Daylight, Difficulty, Region } from './types';

export const ABILITY_TR: Record<Ability, string> = {
  str: 'Kuvvet', dex: 'Çeviklik', con: 'Dayanıklılık', int: 'Zekâ', wis: 'Bilgelik', cha: 'Karizma',
};
export const DAMAGE_TR: Record<DamageType, string> = {
  acid: 'asit', bludgeoning: 'ezici', cold: 'soğuk', fire: 'ateş', force: 'kuvvet',
  lightning: 'yıldırım', necrotic: 'nekrotik', piercing: 'delici', poison: 'zehir',
  psychic: 'psişik', radiant: 'ışıl', slashing: 'kesici', thunder: 'gök gürültüsü',
};
export const REGION_TR: Record<Region, string> = {
  forest: 'Orman', mountain: 'Dağ', underground: 'Mağara / yeraltı', swamp: 'Bataklık',
  desert: 'Çöl', coast: 'Kıyı / sahil', underwater: 'Su altı', arctic: 'Kutup', grassland: 'Ova',
  urban: 'Şehir', ruins: 'Harabe', planar: 'Başka düzlem', sea: 'Açık deniz', lake: 'Göl', dungeon: 'Zindan',
  town: 'Küçük şehir', city: 'Büyük şehir',
  castle: 'Kale', ship: 'Gemi güvertesi', camp: 'Kamp yeri', graveyard: 'Mezarlık', temple: 'Tapınak', farm: 'Çiftlik',
  river: 'Nehir geçidi', tavern: 'Han (iç mekân)', market: 'Pazar meydanı', cavern: 'Mağara kompleksi', sewer: 'Kanalizasyon', mine: 'Maden',
};
export const DAYLIGHT_TR: Record<Daylight, string> = {
  day: 'Gündüz', morning: 'Sabah', evening: 'Akşam', night: 'Gece', dark: 'Karanlık',
};
export const CONDITION_TR: Record<Condition, string> = {
  blinded: 'kör', charmed: 'büyülenmiş', deafened: 'sağır', frightened: 'korkmuş',
  grappled: 'yakalanmış', incapacitated: 'etkisiz', invisible: 'görünmez', paralyzed: 'felçli',
  petrified: 'taşlaşmış', poisoned: 'zehirlenmiş', prone: 'yere düşmüş', restrained: 'kısıtlanmış',
  stunned: 'sersemlemiş', unconscious: 'bilinçsiz', exhaustion: 'bitkin',
};
export const DIFFICULTY_TR: Record<Difficulty, string> = {
  easy: 'Kolay', medium: 'Orta', hard: 'Zor', deadly: 'Ölümcül',
};
export const BAND_TR: Record<HpBand, string> = {
  healthy: 'sağlam', hurt: 'yaralı', bloodied: 'ağır yaralı', down: 'düştü',
};
