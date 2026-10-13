import { describe, expect, it } from 'vitest';
import { bestSpeed, feetBetween, newTable, type MonsterCombatant, type PlayerView, type TableState } from '@masa/shared';
import { upgrade } from '../hub';
import { viewFor } from '../view';
import { IntentError } from './context';
import { emptyState, heroInput, run, startFight } from './fixtures';

const dm = (s: TableState, intent: object) => run(s, 'dm', intent).state;
const pl = (s: TableState, intent: object) => run(s, 'player', intent).state;
const token = (s: TableState, label: string) => s.board.tokens.find((t) => t.label === label)!;
const combatant = (s: TableState, kind: 'character' | 'monster') => s.encounter!.combatants.find((c) => c.kind === kind)!;
const mine = (s: TableState) => (viewFor('player', s, []) as PlayerView).encounter!.combatants.find((c) => c.kind === 'character')!;
const move = (s: TableState, label: string, x: number, y: number) => ({ type: 'board.moveToken', tokenId: token(s, label).id, x, y });

/** Savaş yeni başladı: Aria (0,5 / 0,88) önce oynar, Goblin 1 (0,08 / 0,1) sonra. Alan 100 × 75 ft. */
function freshFight(attacks = heroInput.attacks as object[]): TableState {
  let s = pl(emptyState, { type: 'character.set', character: { ...heroInput, attacks } });
  s = dm(s, { type: 'encounter.addMonster', monsterId: 'goblin', count: 1, hpMode: 'average' });
  return startFight(s, 5, 15);
}

describe('mesafe', () => {
  it('uzaklığı alanın enine ve oranına göre ft olarak ölçer', () => {
    expect(feetBetween({ x: 0, y: 0 }, { x: 0.3, y: 0 }, { widthFt: 100, aspect: 0.75 })).toBe(30);
    expect(feetBetween({ x: 0, y: 0 }, { x: 0, y: 0.4 }, { widthFt: 100, aspect: 0.75 })).toBe(30);
    expect(feetBetween({ x: 0, y: 0 }, { x: 0.3, y: 0.4 }, { widthFt: 200, aspect: 1 })).toBe(100);
  });
  it('canavarın en hızlı hareket biçimini hız sayar', () => {
    expect(bestSpeed('30 ft.')).toBe(30);
    expect(bestSpeed('0 ft., fly 50 ft. (hover)')).toBe(50);
    expect(bestSpeed('')).toBe(30);
  });
});

describe('savaş alanı', () => {
  it('savaş başlayınca herkes alana dizilir ve alan oyuncuya açılır', () => {
    const s = freshFight();
    expect(s.board.visible).toBe(true);
    expect(s.board.tokens.map((t) => [t.label, t.kind])).toEqual([['Aria', 'character'], ['Goblin 1', 'monster']]);
    expect(combatant(s, 'character')).toMatchObject({ moved: 0, dashed: false });
  });

  it('gizlenmiş karakter jetonu savaş başlayınca açılır; oyuncu jetonsuz kalmaz', () => {
    let s = pl(emptyState, { type: 'character.set', character: heroInput });
    s = dm(s, { type: 'board.placeCombatants' });
    s = dm(s, { type: 'board.patchToken', tokenId: token(s, 'Aria').id, hidden: true });
    s = dm(s, { type: 'encounter.addMonster', monsterId: 'goblin', count: 1, hpMode: 'average' });
    s = startFight(s, 5, 15);
    expect((viewFor('player', s, []) as PlayerView).board!.tokens.some((t) => t.mine)).toBe(true);
  });

  it('oyuncu kendi sırasında hızı kadar yürür; kalan mesafe ekranına gider', () => {
    let s = freshFight();
    expect(mine(s).moveLeft).toBe(30);
    s = pl(s, move(s, 'Aria', 0.5, 0.68));
    expect(token(s, 'Aria')).toMatchObject({ x: 0.5, y: 0.68 });
    expect(mine(s).moveLeft).toBe(15);
    s = pl(s, move(s, 'Aria', 0.35, 0.68));
    expect(mine(s).moveLeft).toBe(0);
  });

  it('kalan mesafeden uzağa yürütmez ve jetonu yerinde bırakır', () => {
    const s = freshFight();
    expect(() => pl(s, move(s, 'Aria', 0.5, 0.2))).toThrow('O kadar uzağa yürüyemezsin: 51 fit gerekiyor, 30 fit kaldı');
    const part = pl(s, move(s, 'Aria', 0.5, 0.6));
    expect(() => pl(part, move(part, 'Aria', 0.5, 0.4))).toThrow('9 fit kaldı');
  });

  it('sıra oyuncuda değilken yürütmez', () => {
    const s = pl(freshFight(), { type: 'combat.nextTurn' });
    expect(() => pl(s, move(s, 'Aria', 0.5, 0.8))).toThrow('Sıra sende değil');
  });

  it('sıra geri geldiğinde yürüme hakkı yenilenir', () => {
    let s = freshFight();
    s = pl(s, move(s, 'Aria', 0.5, 0.48));
    expect(mine(s).moveLeft).toBe(0);
    s = dm(pl(s, { type: 'combat.nextTurn' }), { type: 'combat.nextTurn' });
    expect(mine(s)).toMatchObject({ current: true, moveLeft: 30 });
  });

  it('koşu bir hız kadar daha yol verir; turda bir kez kullanılır', () => {
    let s = freshFight();
    s = pl(s, move(s, 'Aria', 0.5, 0.48));
    s = pl(s, { type: 'combat.dash' });
    expect(mine(s).moveLeft).toBe(30);
    s = pl(s, move(s, 'Aria', 0.5, 0.2));
    expect(mine(s).moveLeft).toBe(9);
    expect(() => pl(s, { type: 'combat.dash' })).toThrow('Bu tur zaten koştun');
    const goblinTurn = pl(s, { type: 'combat.nextTurn' });
    expect(() => pl(goblinTurn, { type: 'combat.dash' })).toThrow('Sıra sende değil');
  });

  it.each(['restrained', 'grappled', 'stunned'])('%s durumundayken yürüyemez', (condition) => {
    let s = freshFight();
    s = dm(s, { type: 'combatant.patch', combatantId: combatant(s, 'character').id, patch: { conditions: [condition] } });
    expect(mine(s).moveLeft).toBe(0);
    expect(() => pl(s, move(s, 'Aria', 0.5, 0.8))).toThrow('0 fit kaldı');
  });

  it('yere düşen karakter yürüyemez', () => {
    let s = freshFight();
    s = dm(s, { type: 'combatant.patch', combatantId: combatant(s, 'character').id, patch: { hp: 0 } });
    expect(mine(s).moveLeft).toBe(0);
    expect(() => pl(s, move(s, 'Aria', 0.5, 0.8))).toThrow('Karakter ayakta değil');
  });

  it('DM engellenmez: sırası gelen canavarın yürüyüşü sayılır, düzeltmeler sayılmaz', () => {
    let s = freshFight();
    s = dm(s, move(s, 'Aria', 0.9, 0.1));
    s = dm(s, move(s, 'Goblin 1', 0.5, 0.5));
    expect(combatant(s, 'character').moved).toBe(0);
    expect(combatant(s, 'monster').moved).toBe(0);
    s = pl(s, { type: 'combat.nextTurn' });
    s = dm(s, move(s, 'Goblin 1', 0.9, 0.5));
    s = dm(s, move(s, 'Goblin 1', 0.1, 0.5));
    expect(combatant(s, 'monster').moved).toBe(120);
  });

  it('savaş yokken oyuncu jetonunu serbestçe taşır', () => {
    let s = pl(emptyState, { type: 'character.set', character: heroInput });
    s = dm(dm(s, { type: 'board.placeCombatants' }), { type: 'board.show', visible: true });
    expect(token(pl(s, move(s, 'Aria', 0.05, 0.05)), 'Aria')).toMatchObject({ x: 0.05, y: 0.05 });
  });

  it('alanın ölçeğini yalnızca DM ayarlar; ölçek büyüyünce aynı yol daha uzun sayılır', () => {
    let s = freshFight();
    expect(() => pl(s, { type: 'board.setScale', widthFt: 500 })).toThrow('Bu işlem yalnızca DM içindir');
    expect(() => dm(s, { type: 'board.setScale', widthFt: 'geniş' })).toThrow(IntentError);
    s = dm(s, { type: 'board.setScale', widthFt: 300, aspect: 0.5 });
    expect(s.board).toMatchObject({ widthFt: 300, aspect: 0.5 });
    expect(() => pl(s, move(s, 'Aria', 0.5, 0.58))).toThrow('45 fit gerekiyor');
    expect(dm(s, { type: 'board.setScale', widthFt: 5, aspect: 99 }).board).toMatchObject({ widthFt: 20, aspect: 4 });
  });

  it('oyuncuya alanın ölçeğini ve hedef alınabilecek jetonları verir', () => {
    const s = freshFight();
    const view = viewFor('player', s, []) as PlayerView;
    expect(view.board).toMatchObject({ widthFt: 100, aspect: 0.75 });
    expect(view.board!.tokens.map((t) => [t.label, t.targetId])).toEqual([['Aria', null], ['Goblin 1', combatant(s, 'monster').id]]);
    expect(view.encounter!.combatants.find((c) => c.kind === 'monster')!.moveLeft).toBeNull();
  });
});

describe('menzil', () => {
  const bow = { name: 'Uzun Yay', bonus: 5, damage: '1d8+2', type: 'piercing', range: 150 };
  const attack = (s: TableState, attackIndex: number, ...faces: number[]) =>
    run(s, 'player', { type: 'character.attack', attackIndex, targetId: combatant(s, 'monster').id }, ...faces);

  it('yakın dövüş saldırısı uzaktaki hedefe yapılamaz', () => {
    const s = freshFight();
    expect(() => attack(s, 0, 15, 4)).toThrow('Hedef menzil dışında: 72 fit uzakta, Uzun Kılıç menzili 5 fit');
  });

  it('yanına yürüyünce saldırabilir', () => {
    let s = freshFight();
    s = dm(s, move(s, 'Goblin 1', 0.5, 0.82));
    const out = attack(s, 0, 15, 4);
    expect(out.log[0]!.text).toContain('isabet');
    expect((combatant(out.state, 'monster') as MonsterCombatant).hp).toBe(0);
  });

  it('menzilli saldırı uzaktan yapılır; menzil verilmemişse 5 fit sayılır', () => {
    const s = freshFight([...heroInput.attacks, bow]);
    expect(s.character!.attacks.map((a) => a.range)).toEqual([5, 5, 150]);
    expect(attack(s, 2, 15, 4).log[0]!.text).toContain('Uzun Yay');
  });

  it('jetonu alanda olmayan hedefte menzil aranmaz', () => {
    let s = freshFight();
    s = dm(s, { type: 'board.removeToken', tokenId: token(s, 'Goblin 1').id });
    expect(attack(s, 0, 15, 4).log[0]!.text).toContain('isabet');
  });
});

describe('eski kayıtlar', () => {
  it('hız, menzil, ölçek ve yürüme alanları olmayan kaydı tamamlar', () => {
    const old = {
      code: 'ABC123', sheetId: null,
      board: { mapId: 'map-1', visible: true, tokens: [] },
      character: { name: 'Aria', attacks: [{ name: 'Kılıç', bonus: 5, damage: '1d8', type: 'slashing' }] },
      encounter: { id: 'e', status: 'active', round: 1, turnIndex: 0, combatants: [{ id: 'c', kind: 'character', initiative: 3, conditions: [] }] },
    } as unknown as TableState;
    const s = upgrade(old);
    expect(s.board).toMatchObject({ mapId: 'map-1', widthFt: 100, aspect: 0.75 });
    expect(s.character).toMatchObject({ speed: 30, attacks: [{ range: 5 }] });
    expect(s.encounter!.combatants[0]).toMatchObject({ moved: 0, dashed: false });
    expect(upgrade({ code: 'X' } as TableState)).toEqual(newTable('X'));
  });
});
