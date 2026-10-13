import { DEFAULT_REACH, DEFAULT_SPEED, newBoard, newTable, newWorld, type LogEntry, type Role, type ServerMessage, type TableState } from '@masa/shared';
import { IntentError, type Ctx } from './game/context';
import { reduce } from './game/reduce';
import type { Store } from './store';
import { viewFor } from './view';

/** Eski kayıtlarda sonradan eklenen alanlar yoktur; eksikler varsayılanla tamamlanır. */
export function upgrade(loaded: TableState): TableState {
  const old = loaded as Partial<TableState>;
  const state: TableState = { ...newTable(loaded.code), ...old, board: { ...newBoard(), ...old.board }, world: { ...newWorld(), ...old.world } };
  // Ana harita eklenmeden önce tek harita vardı ve dünya haritası olarak kullanılıyordu; yerine taşınır.
  if (!old.world && state.board.mapId && state.encounter?.status !== 'active') {
    state.world.mapId = state.board.mapId;
    state.world.aspect = state.board.aspect;
    state.world.visible = state.board.visible;
    state.board.mapId = null;
    state.board.aspect = newBoard().aspect;
  }
  if (state.character) {
    state.character.inventory ??= [];
    state.character.speed ??= DEFAULT_SPEED;
    for (const attack of state.character.attacks) attack.range ??= DEFAULT_REACH;
  }
  for (const c of state.encounter?.combatants ?? []) {
    c.moved ??= 0;
    c.dashed ??= false;
  }
  return state;
}

export interface Client { role: Role; send: (message: ServerMessage) => void }
export const LOG_WINDOW = 200;
const MAX_MESSAGE = 20_000;

export async function createHub(deps: Ctx & { store: Store }) {
  const loaded = await deps.store.loadTable();
  if (!loaded) throw new Error('Masa kaydı yok; önce createTable çağrılmalı');
  // Eski kayıtlarda harita alanları yok; eksikleri varsayılanla tamamla.
  let state: TableState = upgrade(loaded);
  // Defter eklenmeden önce yapılmış karakter de "eski karakteri yükle" listesinde çıksın.
  if (state.character) await deps.store.saveCharacter(state.character, deps.now());
  for (const monster of await deps.store.loadCustomMonsters()) deps.monsters.set(monster.id, monster);
  let log: LogEntry[] = await deps.store.recentLog(LOG_WINDOW);
  for (const [id, regions] of Object.entries(await deps.store.loadOverrides())) {
    const monster = deps.monsters.get(id);
    if (monster) monster.regions = regions;
  }

  const clients = new Set<Client>();
  let queue: Promise<void> = Promise.resolve();
  const push = (c: Client) => c.send({ type: 'state', view: viewFor(c.role, state, log) });

  async function handle(client: Client, raw: string): Promise<void> {
    let id = 0;
    try {
      if (raw.length > MAX_MESSAGE) throw new IntentError('İstek çok büyük');
      let message: any;
      try { message = JSON.parse(raw); } catch { throw new IntentError('Geçersiz istek'); }
      id = Number.isInteger(message?.id) ? message.id : 0;
      const out = reduce(state, message?.intent, client.role, deps);
      await deps.store.commit(out.state, out.log);
      if (out.regions) {
        await deps.store.saveOverride(out.regions.monsterId, out.regions.regions);
        const monster = deps.monsters.get(out.regions.monsterId);
        if (monster) monster.regions = out.regions.regions;
      }
      if (out.monster && 'save' in out.monster) {
        await deps.store.saveCustomMonster(out.monster.save);
        deps.monsters.set(out.monster.save.id, out.monster.save);
      } else if (out.monster) {
        await deps.store.deleteCustomMonster(out.monster.remove);
        deps.monsters.delete(out.monster.remove);
      }
      // Kaydedilen her kart deftere de yazılır; oyuncu sonradan "eski karakteri yükle" ile geri çağırır.
      if (message.intent?.type === 'character.set' && out.state.character) {
        await deps.store.saveCharacter(out.state.character, deps.now());
      }
      state = out.state;
      log = [...log, ...out.log].slice(-LOG_WINDOW);
      for (const c of clients) push(c);
    } catch (error) {
      const expected = error instanceof IntentError;
      if (!expected) console.error(error);
      client.send({ type: 'error', id, message: expected ? error.message : 'Sunucu hatası; değişiklik kaydedilmedi' });
    }
  }

  /** Masanın durumunu bütünüyle değiştirir (yeni oyun, kayıt yükleme). Hamlelerle aynı kuyrukta sıraya girer. */
  function replace(build: () => { next: TableState; text: string }): Promise<void> {
    const done = queue.then(async () => {
      const { next, text } = build();
      const entry: LogEntry = { id: deps.newId(), at: deps.now(), actor: 'dm', visibility: 'public', kind: 'manual', text };
      await deps.store.clearLog();
      await deps.store.commit(next, [entry]);
      state = next;
      log = [entry];
      for (const c of clients) push(c);
    });
    queue = done.catch((error) => { console.error(error); });
    return done;
  }

  return {
    /** Yeni oyun: karakter, savaş ve savaş alanı temizlenir. Masa kodu, defter ve özel canavarlar kalır. */
    reset: (): Promise<void> => replace(() => ({ next: newTable(state.code), text: 'Yeni oyun başladı' })),
    snapshot: (): TableState => structuredClone(state),
    restore: (saved: TableState, name: string): Promise<void> =>
      replace(() => ({ next: upgrade({ ...structuredClone(saved), code: state.code }), text: `Kayıtlı oyun yüklendi: ${name}` })),
    join(client: Client): () => void {
      clients.add(client);
      push(client);
      return () => { clients.delete(client); };
    },
    /** Hamleler tek bir kuyruğa girer; biri bitmeden diğeri başlamaz. */
    submit(client: Client, raw: string): Promise<void> {
      queue = queue.then(() => handle(client, raw));
      return queue;
    },
    code: (): string => state.code,
    /** Şu an kullanımda olan dosyalar; temizlikte korunur. */
    filesInUse: (): string[] => [state.board.mapId, state.world.mapId, state.sheetId].filter((x): x is string => x !== null),
  };
}

export type Hub = Awaited<ReturnType<typeof createHub>>;
