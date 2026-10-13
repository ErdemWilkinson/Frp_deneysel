import { abilityMod, rollD20, type Combatant } from '@masa/shared';
import { character, fail, publicName, say, type Raw, type Work } from './context';
import { resort, turnLabel } from './encounter';
import { mode } from './validate';

function inInitiative(w: Work) {
  const e = w.s.encounter;
  return e && e.status === 'initiative' ? e : fail('İnisiyatif zarı şu an beklenmiyor');
}

const nameOf = (w: Work, c: Combatant): string => (c.kind === 'monster' ? publicName(c) : (w.s.character?.name ?? 'Karakter'));

/**
 * İnisiyatif zarı. Oyuncu yalnızca kendi zarını atar ve bir kez; DM canavarlar için (tek tek ya da hepsi için),
 * gerekirse karakter için de atar. Sıra, DM `combat.begin` diyene kadar kurulmaz.
 */
export function rollInitiative(w: Work, i: Raw): void {
  const e = inInitiative(w);
  const kind = mode(i.mode);
  const hero = character(w);
  const roll = (c: Combatant): void => {
    const bonus = c.kind === 'monster' ? c.dexMod : abilityMod(hero.abilities.dex);
    const r = rollD20(w.ctx.rng, kind);
    c.initiative = r.kept + bonus;
    const how = kind === 'normal' ? '' : ` (${kind === 'advantage' ? 'avantaj' : 'dezavantaj'}: ${r.rolls.join(', ')})`;
    const sign = bonus >= 0 ? `+${bonus}` : String(bonus);
    say(w, 'roll', `${nameOf(w, c)} inisiyatif zarı attı: ${c.initiative} (zar ${r.kept} ${sign})${how}`);
  };

  if (w.role !== 'dm') {
    const me = e.combatants.find((c) => c.kind === 'character') ?? fail('Karakter savaşta değil');
    if (me.initiative !== null) fail('İnisiyatif zarını zaten attın');
    roll(me);
    return;
  }
  if (i.combatantId !== undefined) {
    roll(e.combatants.find((c) => c.id === i.combatantId) ?? fail('Katılımcı bulunamadı'));
    return;
  }
  const waiting = e.combatants.filter((c) => c.kind === 'monster' && c.initiative === null);
  if (waiting.length === 0) fail('Zarlanacak yaratık kalmadı');
  for (const c of waiting) roll(c);
}

/** DM herkesin zarını gördükten sonra sırayı kurar ve ilk rauntu başlatır. */
export function beginCombat(w: Work): void {
  const e = inInitiative(w);
  const waiting = e.combatants.filter((c) => c.initiative === null);
  if (waiting.length > 0) fail(`İnisiyatif bekleniyor: ${waiting.map((c) => nameOf(w, c)).join(', ')}`);
  e.status = 'active';
  e.round = 1;
  resort(e, w.s);
  e.turnIndex = 0;
  say(w, 'turn', `Sıra belirlendi. ${turnLabel(w, e)}`);
}
