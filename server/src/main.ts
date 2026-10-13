import { randomInt, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { newTable } from '@masa/shared';
import { newCode } from './auth';
import { loadConfig } from './config';
import { createLiteDb, createPgDb, migrate } from './db';
import { createApp } from './http';
import { createHub } from './hub';
import { loadMonsters } from './monsters/load';
import { createSheetReader } from './sheetReader';
import { createStore } from './store';
import { attachWebSocket } from './ws';

const here = (path: string): string => fileURLToPath(new URL(path, import.meta.url));
// Yerelde gizli değerler depo kökündeki .env dosyasından okunur (git'e girmez).
if (existsSync(here('../../.env'))) process.loadEnvFile(here('../../.env'));
const config = loadConfig(process.env);

// DATABASE_URL yoksa (yerel geliştirme) diske yazan gömülü Postgres kullanılır.
const db = config.databaseUrl
  ? createPgDb(config.databaseUrl, config.databaseCa, config.databaseInsecureSsl)
  : await createLiteDb(here('../.data/pg'));
await migrate(db);

const store = createStore(db);
if (!(await store.loadTable())) await store.createTable(newTable(newCode()));

const monsters = loadMonsters(here('../data'));
const hub = await createHub({
  store, monsters, rng: (sides) => randomInt(1, sides + 1), now: Date.now, newId: randomUUID,
});

const webDir = here('../../web/dist');
const { app, roleOf } = createApp({
  dmPassword: config.dmPassword,
  secret: config.secret,
  secure: config.production,
  code: hub.code,
  monsters: () => [...monsters.values()],
  webDir: existsSync(webDir) ? webDir : undefined,
  characters: () => store.listCharacters(),
  readSheet: config.deepseekKey ? createSheetReader(config.deepseekKey) : undefined,
  game: {
    reset: () => hub.reset(),
    save: (name) => store.saveGame({ id: randomUUID(), name, state: hub.snapshot(), at: Date.now() }),
    list: () => store.listGames(),
    async load(id) {
      const saved = await store.loadGame(id);
      if (saved) await hub.restore(saved.state, saved.name);
      return !!saved;
    },
    remove: (id) => store.deleteGame(id),
  },
  files: {
    async save(file) {
      const id = randomUUID();
      await store.saveFile({ id, at: Date.now(), ...file });
      await store.pruneFiles(file.kind, 30, hub.filesInUse());
      return id;
    },
    load: (id) => store.loadFile(id),
  },
});

const server = createServer(app);
attachWebSocket(server, hub, roleOf);
server.listen(config.port, () => console.log(`Masa hazır: http://localhost:${config.port}`));
