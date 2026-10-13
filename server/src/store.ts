import type { Character, LogEntry, Monster, Region, TableState } from '@masa/shared';
import type { Db } from './db';

// Durum ve günlük tek ifadede yazılır: biri başarısız olursa ikisi de geri alınır.
const COMMIT = `
  with saved as (update tables set state = $1::jsonb, code = $2 where id = 1 returning 1)
  insert into log_entries (id, at, actor, visibility, kind, text)
  select e->>'id', (e->>'at')::bigint, e->>'actor', e->>'visibility', e->>'kind', e->>'text'
  from jsonb_array_elements($3::jsonb) with ordinality as t(e, n)
  order by n`;

export interface SavedGame { id: string; name: string; at: number; hero: string | null }
export interface StoredFile { id: string; kind: string; name: string; mime: string; data: Uint8Array; at: number; by?: 'dm' | 'player' | null }

export function createStore(db: Db) {
  return {
    async loadTable(): Promise<TableState | null> {
      const { rows } = await db.query('select state from tables where id = 1');
      return (rows[0]?.state as TableState | undefined) ?? null;
    },
    async createTable(state: TableState): Promise<void> {
      await db.query('insert into tables (id, code, state) values (1, $1, $2::jsonb)', [state.code, JSON.stringify(state)]);
    },
    async commit(state: TableState, entries: LogEntry[]): Promise<void> {
      await db.query(COMMIT, [JSON.stringify(state), state.code, JSON.stringify(entries)]);
    },
    async recentLog(limit: number): Promise<LogEntry[]> {
      const { rows } = await db.query(
        `select id, at, actor, visibility, kind, text from
           (select * from log_entries order by seq desc limit $1) recent
         order by seq asc`,
        [limit],
      );
      return rows.map((r) => ({ ...r, at: Number(r.at) }) as LogEntry);
    },
    async loadOverrides(): Promise<Record<string, Region[]>> {
      const { rows } = await db.query('select monster_id, regions from monster_overrides');
      return Object.fromEntries(rows.map((r) => [r.monster_id, r.regions as Region[]]));
    },
    async saveOverride(monsterId: string, regions: Region[]): Promise<void> {
      await db.query(
        `insert into monster_overrides (monster_id, regions) values ($1, $2::jsonb)
         on conflict (monster_id) do update set regions = excluded.regions`,
        [monsterId, JSON.stringify(regions)],
      );
    },
    async loadCustomMonsters(): Promise<Monster[]> {
      const { rows } = await db.query('select body from custom_monsters order by id');
      return rows.map((r) => r.body as Monster);
    },
    async saveCustomMonster(monster: Monster): Promise<void> {
      await db.query(
        `insert into custom_monsters (id, body) values ($1, $2::jsonb)
         on conflict (id) do update set body = excluded.body`,
        [monster.id, JSON.stringify(monster)],
      );
    },
    async deleteCustomMonster(id: string): Promise<void> {
      await db.query('delete from custom_monsters where id = $1', [id]);
    },
    async clearLog(): Promise<void> {
      await db.query('delete from log_entries');
    },
    /** Oyun kayıtları: masanın o anki durumunun adlandırılmış kopyaları. */
    async saveGame(game: { id: string; name: string; state: TableState; at: number }): Promise<void> {
      await db.query('insert into saves (id, name, state, at) values ($1, $2, $3::jsonb, $4)',
        [game.id, game.name, JSON.stringify(game.state), game.at]);
    },
    async listGames(): Promise<SavedGame[]> {
      const { rows } = await db.query(
        `select id, name, at, state->'character'->>'name' as hero from saves order by at desc limit 50`);
      return rows.map((r) => ({ id: r.id, name: r.name, at: Number(r.at), hero: r.hero ?? null }));
    },
    async loadGame(id: string): Promise<{ name: string; state: TableState } | null> {
      const { rows } = await db.query('select name, state from saves where id = $1', [id]);
      return rows[0] ? { name: rows[0].name, state: rows[0].state as TableState } : null;
    },
    async deleteGame(id: string): Promise<void> {
      await db.query('delete from saves where id = $1', [id]);
    },
    /** Karakter defteri: ada göre son kaydedilen kart tutulur. */
    async saveCharacter(character: Character, at: number): Promise<void> {
      await db.query(
        `insert into characters (name, body, at) values ($1, $2::jsonb, $3)
         on conflict (name) do update set body = excluded.body, at = excluded.at`,
        [character.name, JSON.stringify(character), at],
      );
    },
    async listCharacters(): Promise<Character[]> {
      const { rows } = await db.query('select body from characters order by at desc limit 50');
      return rows.map((r) => r.body as Character);
    },
    async saveFile(file: StoredFile): Promise<void> {
      await db.query('insert into files (id, kind, name, mime, data, at, by_role) values ($1, $2, $3, $4, $5, $6, $7)',
        [file.id, file.kind, file.name, file.mime, file.data, file.at, file.by ?? null]);
    },
    async loadFile(id: string): Promise<StoredFile | null> {
      const { rows } = await db.query('select id, kind, name, mime, data, at, by_role from files where id = $1', [id]);
      const r = rows[0];
      if (!r) return null;
      const { by_role: by, ...rest } = r;
      return { ...rest, by: by ?? null, data: new Uint8Array(r.data), at: Number(r.at) };
    },
    /** Bir türün en yeni `keep` dosyası dışındakileri siler; `protect` içindekilere dokunmaz. */
    async pruneFiles(kind: string, keep: number, protect: string[]): Promise<void> {
      await db.query(
        `delete from files where kind = $1 and id <> all($3::text[])
           and id not in (select id from files where kind = $1 order by at desc limit $2)`,
        [kind, keep, protect],
      );
    },
  };
}

export type Store = ReturnType<typeof createStore>;
