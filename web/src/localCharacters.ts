import type { Character } from '@masa/shared';
import { readCharacter } from './CharacterCard';

export type SavedCharacter = Omit<Character, 'deathSaves' | 'dead'>;

const KEY = 'masa.workshop.characters';
const LIMIT = 30;

/** Atölyede bu tarayıcıda saklanan karakterler. Depo kapalıysa ya da bozuksa boş liste döner. */
export function loadLocalCharacters(): SavedCharacter[] {
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.map(readCharacter).filter((c): c is SavedCharacter => c !== null);
  } catch {
    return [];
  }
}

/** Aynı adlı karakterin üzerine yazar; yeni olanı başa koyar. Depo yazılamazsa false döner. */
export function saveLocalCharacter(character: SavedCharacter): boolean {
  const rest = loadLocalCharacters().filter((c) => c.name !== character.name);
  try {
    window.localStorage.setItem(KEY, JSON.stringify([character, ...rest].slice(0, LIMIT)));
    return true;
  } catch {
    return false;
  }
}

export function deleteLocalCharacter(name: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(loadLocalCharacters().filter((c) => c.name !== name)));
  } catch { /* depo kapalı: silinecek bir şey saklanmıyor */ }
}
