import type { Intent, Role, TableState } from '@masa/shared';
import { deleteMonster, saveMonster } from './bestiary';
import { addMarker, moveToken, patchToken, placeCombatants, removeToken, setDaylight, setMap, setScale, setSheet, showBoard } from './board';
import { addItem, removeItem, updateItem } from './inventory';
import { characterAttack, characterCheck, characterSave, deathSave, freeRoll, setCharacter } from './character';
import { dash, manualDamage, manualHeal, monsterAttack, monsterSave, nextTurn, patchCombatant, setRegions } from './combat';
import { identify, setIdentify, setTheater } from './identify';
import { beginCombat, rollInitiative } from './initiative';
import { addMonster, end, generate, removeCombatant, start } from './encounter';
import { moveOnWorld, setTerrain, setWorldAspect, setWorldMap, setWorldRegion, showWorld } from './world';
import { IntentError, fail, type Ctx, type Outcome, type Raw, type Work } from './context';

const DM_ONLY = new Set([
  'encounter.addMonster', 'encounter.remove', 'encounter.generate', 'encounter.start', 'encounter.end',
  'combat.begin', 'combat.monsterAttack', 'combat.monsterSave', 'combat.applyDamage', 'combat.heal',
  'combatant.patch', 'monster.setRegions', 'monster.save', 'monster.delete',
  'board.setMap', 'board.setScale', 'board.show', 'board.setTerrain', 'board.setDaylight', 'table.setIdentify', 'table.setTheater',
  'world.setMap', 'world.show', 'world.move', 'world.setRegion', 'world.setAspect', 'board.placeCombatants', 'board.addMarker', 'board.patchToken', 'board.removeToken',
]);

export function reduce(state: TableState, intent: Intent, role: Role, ctx: Ctx): Outcome {
  const i = intent as unknown as Raw;
  if (!i || typeof i !== 'object' || typeof i.type !== 'string') throw new IntentError('Geçersiz istek');
  if (DM_ONLY.has(i.type) && role !== 'dm') throw new IntentError('Bu işlem yalnızca DM içindir');
  const w: Work = { s: structuredClone(state), log: [], ctx, role };
  switch (i.type) {
    case 'roll': freeRoll(w, i); break;
    case 'character.set': setCharacter(w, i); break;
    case 'character.attack': characterAttack(w, i); break;
    case 'character.save': characterSave(w, i); break;
    case 'character.check': characterCheck(w, i); break;
    case 'character.deathSave': deathSave(w); break;
    case 'encounter.addMonster': addMonster(w, i); break;
    case 'encounter.remove': removeCombatant(w, i); break;
    case 'encounter.generate': generate(w, i); break;
    case 'table.setIdentify': setIdentify(w, i); break;
    case 'table.setTheater': setTheater(w, i); break;
    case 'character.identify': identify(w, i); break;
    case 'encounter.start': start(w); break;
    case 'encounter.end': end(w); break;
    case 'combat.rollInitiative': rollInitiative(w, i); break;
    case 'combat.begin': beginCombat(w); break;
    case 'combat.nextTurn': nextTurn(w); break;
    case 'combat.dash': dash(w); break;
    case 'combat.monsterAttack': monsterAttack(w, i); break;
    case 'combat.monsterSave': monsterSave(w, i); break;
    case 'combat.applyDamage': manualDamage(w, i); break;
    case 'combat.heal': manualHeal(w, i); break;
    case 'combatant.patch': patchCombatant(w, i); break;
    case 'monster.setRegions': setRegions(w, i); break;
    case 'monster.save': saveMonster(w, i); break;
    case 'monster.delete': deleteMonster(w, i); break;
    case 'board.setMap': setMap(w, i); break;
    case 'board.show': showBoard(w, i); break;
    case 'board.setScale': setScale(w, i); break;
    case 'board.placeCombatants': placeCombatants(w); break;
    case 'board.addMarker': addMarker(w, i); break;
    case 'board.moveToken': moveToken(w, i); break;
    case 'board.patchToken': patchToken(w, i); break;
    case 'board.removeToken': removeToken(w, i); break;
    case 'board.setDaylight': setDaylight(w, i); break;
    case 'inventory.add': addItem(w, i); break;
    case 'inventory.update': updateItem(w, i); break;
    case 'inventory.remove': removeItem(w, i); break;
    case 'sheet.set': setSheet(w, i); break;
    case 'board.setTerrain': setTerrain(w, i); break;
    case 'world.setMap': setWorldMap(w, i); break;
    case 'world.show': showWorld(w, i); break;
    case 'world.move': moveOnWorld(w, i); break;
    case 'world.setRegion': setWorldRegion(w, i); break;
    case 'world.setAspect': setWorldAspect(w, i); break;
    default: fail('Bilinmeyen istek');
  }
  return { state: w.s, log: w.log, regions: w.regions, monster: w.monster };
}
