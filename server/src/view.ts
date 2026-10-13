import {
  hidesUnlit, hpBand, isLit, movementLeft, tokenLight, type Character, type Combatant, type LogEntry, type PlayerCombatant, type PlayerToken, type Role, type TableState,
  type Token, type View,
} from '@masa/shared';

// Alanlar tek tek sayılır; nesne yayma kullanılmaz ki yeni eklenen bir alan kendiliğinden sızmasın.
function forPlayer(c: Combatant, current: boolean, state: TableState): PlayerCombatant {
  if (c.kind === 'character') {
    const hero = state.character;
    return {
      id: c.id, kind: 'character', name: hero?.name ?? 'Karakter', initiative: c.initiative,
      conditions: c.conditions, band: hero ? hpBand(hero.hp, hero.maxHp) : null,
      hp: hero?.hp ?? null, maxHp: hero?.maxHp ?? null, current,
      moveLeft: hero && hero.hp > 0 ? movementLeft(hero.speed, c) : 0,
    };
  }
  const unknown = !c.revealName;
  return {
    id: c.id, kind: 'monster', name: c.revealName ? c.name : 'Bilinmeyen yaratık', initiative: c.initiative,
    conditions: c.conditions, band: hpBand(c.hp, c.maxHp),
    hp: c.revealHp ? c.hp : null, maxHp: c.revealHp ? c.maxHp : null, current, moveLeft: null,
    identifiable: state.identify && unknown && !c.identifyTried && c.hp > 0,
  };
}

// Jetonun adı ve can durumu bağlı olduğu canavardan gelir; DM'in yazdığı etiket oyuncuya gitmez.
function tokenForPlayer(t: Token, state: TableState, light: number): PlayerToken {
  const linked = state.encounter?.combatants.find((c) => c.id === t.combatantId);
  if (linked?.kind === 'monster') {
    return {
      id: t.id, kind: 'monster', x: t.x, y: t.y, mine: false, targetId: linked.id, light,
      label: linked.revealName ? linked.name : 'Bilinmeyen yaratık', band: hpBand(linked.hp, linked.maxHp),
    };
  }
  const hero = t.kind === 'character' ? state.character : null;
  return {
    id: t.id, kind: t.kind, x: t.x, y: t.y, mine: t.kind === 'character', targetId: null, light,
    label: t.kind === 'monster' ? 'Bilinmeyen yaratık' : t.label, band: hero ? hpBand(hero.hp, hero.maxHp) : null,
  };
}

/** Gece ve karanlıkta, hiçbir ışığın erişmediği jeton oyuncudan gizlenir; karakterin kendisi her zaman görünür. */
function visibleTokens(state: TableState): { token: Token; light: number }[] {
  const b = state.board;
  const hero: Character | null = state.character;
  const sources = b.tokens.map((t) => ({ x: t.x, y: t.y, r: tokenLight(t, hero) })).filter((s) => s.r > 0);
  return b.tokens
    .filter((t) => !t.hidden)
    .filter((t) => t.kind === 'character' || !hidesUnlit(b.daylight) || isLit(t, sources, b))
    .map((token) => ({ token, light: tokenLight(token, hero) }));
}

export function viewFor(role: Role, state: TableState, log: LogEntry[]): View {
  if (role === 'dm') {
    return {
      role, code: state.code, character: state.character, encounter: state.encounter,
      board: state.board, world: state.world, sheetId: state.sheetId, theater: state.theater, identify: state.identify, log,
    };
  }
  const e = state.encounter;
  return {
    role: 'player',
    code: state.code,
    theater: state.theater,
    character: state.character,
    encounter: e && e.status !== 'draft'
      ? {
          round: e.round,
          phase: e.status === 'active' ? 'combat' : 'initiative',
          theater: state.theater,
          combatants: e.combatants.map((c, i) => forPlayer(c, e.status === 'active' && i === e.turnIndex, state)),
        }
      : null,
    // Hayali savaşta harita oyuncuya gösterilmez.
    board: state.board.visible && !(e && e.status !== 'draft' && state.theater)
      ? {
          mapId: state.board.mapId, widthFt: state.board.widthFt, aspect: state.board.aspect, terrain: state.board.terrain,
          seed: state.board.seed, daylight: state.board.daylight,
          tokens: visibleTokens(state).map(({ token, light }) => tokenForPlayer(token, state, light)),
        }
      : null,
    // Arazi türü DM'in hazırlık bilgisidir; oyuncu yalnızca haritayı ve yerini görür.
    world: state.world.visible && state.world.mapId
      ? { mapId: state.world.mapId, aspect: state.world.aspect, x: state.world.x, y: state.world.y }
      : null,
    sheetId: state.sheetId,
    log: log.filter((entry) => entry.visibility === 'public'),
  };
}
