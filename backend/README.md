# Backend — D&D AI Game Master

Node.js + Express API. As of Phase 12 (2026-08), the old tactical grid (x/y movement, separate scene state)
was completely removed — the game is now a single **freeform chat** interface: the player types
what they want to do in natural language (`POST /api/chat`), and the server infers intent from that text (attack/equip/
drop/pick up/drink/cast) and produces REAL mechanical outcomes (HP/mana/XP/inventory) (see the "Chat" section).
Runtime state is kept in `Map`s inside `data/store.js`; these `Map`s are loaded from persistent
storage at startup (`data/db.js` — SQLite or Postgres) and written back on every change
(see the "Persistence" section).

## Setup

```bash
cd backend
npm install
```

## Running

```bash
npm start       # node server.js
npm run dev     # node --watch server.js (auto-restarts on file changes)
```

Default port: `3001` (overridable via the `PORT` env var). Health check: `GET /api/health`.

## Environment variables

All are read only from environment variables; none are committed in code/`.env` (`.env` is in `.gitignore`).

| Variable | Required | Description |
|---|---|---|
| `PORT` | No | Default `3001`, platforms like Render set it automatically |
| `GEMINI_API_KEY` | No | If missing/errors/times out, the system silently falls back to the mock GM |
| `GEMINI_MODEL` | No | Default `gemini-3.6-flash` |
| `AI_HOURLY_LIMIT` | No | Hourly AI call limit (shared across all sessions), default `30` |
| `DATABASE_URL` | No | If present, Postgres is used (`pg`); otherwise local `game.db` (SQLite) — see `data/db.js`. In tests (`VITEST=true`), SQLite (`:memory:`) is always used even if this variable is set |
| `DATABASE_SSL` | No | If set to `false`, SSL is disabled on the Postgres connection (enabled by default) |
| `DB_PATH` | No | SQLite file path override (for test/development purposes) |
| `FRONTEND_ORIGIN` | No | Comma-separated list of allowed origins for CORS — IN ADDITION to the local dev origins |
| `PUBLIC_RATE_LIMIT_MAX` | No | Per-IP requests-per-minute limit on unauthenticated-accessible endpoints, default `20` |

## Session isolation

Each client identifies itself via the `X-Session-Id` header (see `services/sessionId.js`). If this header
is missing, the server falls back to a `DEFAULT_SESSION_ID` that stays fixed for the process lifetime
(for backward compatibility with old clients/tools only). Character, chat history, and the "active character"
relationship are kept entirely on a per-session basis — different sessions can't see each other's data.
`GET /api/character` returns the active character via sessionId (does not take `characterId`
as a parameter); `POST /api/character/intro` verifies that the given `characterId` matches
the calling session's active character, otherwise returns 403. (Before Phase 12-C there was a separate
`requireOwnedCharacter()` helper — once the grid's `scene.js` was removed, this was no longer the only
check point, so the helper was also removed and the check moved directly into the route.)

## Persistence

`data/db.js` chooses SQLite (`data/dbSqlite.js`) or Postgres (`data/dbPostgres.js`) depending on
whether `DATABASE_URL` is present. At server startup, `loadAll()` loads all characters/chat
histories/session records into in-memory `Map`s; these `Map`s are the single source of truth
at runtime, while the DB is a shadow copy updated in the background (via fire-and-forget `save*()`
calls). Stale sessions are cleaned up periodically.

Freeform enemy/loot state (`services/freeformEncounter.js`) is deliberately NOT PERSISTED
to the DB — it is kept only in memory and resets on server restart (an acceptable limitation;
persistent data like character/inventory/XP is not affected).

## AI integration

GM narration is generated via Google Gemini through `services/aiGm.js` (`services/narrationService.js`
is the single entry point). If ANY of the following conditions occur, the system silently
falls back to the template text (mock) in `data/gmFlavor.js` / `data/openingFlavor.js`, without
showing the user an error:

- `GEMINI_API_KEY` is not set,
- the hourly AI call budget (`AI_HOURLY_LIMIT`) is exhausted,
- the Gemini request didn't respond within 15 seconds (timeout),
- the Gemini request returned an error/empty response.

Responses from endpoints like `POST /api/chat` and `POST /api/character/intro` include a
`source: "ai" | "mock"` field, explicitly telling the client which path was used.

## Endpoints

### Character (`/api/character`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/character/options` | List of selectable races/classes/appearances |
| POST | `/api/character/roll-stats` | `{ raceId }` — rolls dice and generates a race-bonused attribute set (does not save) |
| POST | `/api/character/create` | `{ name, raceId, classId, appearanceId, attributes? }` — creates a new character, makes it the session's active character |
| POST | `/api/character/intro` | `{ characterId }` — generates the AI (or mock) opening narration, adds it to chat history |
| GET | `/api/character` | Returns the session's active character (404 if none) |
| POST | `/api/character/reset` | Clears the session's character/chat/freeform encounter links and permanently deletes the character |

### Chat (`/api/chat`)

| Method | Path | Description |
|---|---|---|
| GET | `/api/chat` | The session's chat history |
| POST | `/api/chat` | `{ message }` (max 500 characters) — adds the player message, resolves the mechanical outcome, generates the AI/mock GM response |

All `/api/character/*` POST endpoints (`create`, `roll-stats`, `intro`, `reset`) and `/api/chat` POST
are subject to the IP-based `PUBLIC_RATE_LIMIT_MAX`; `POST /api/chat` and `/character/intro` also
consume the shared hourly `AI_HOURLY_LIMIT` budget (since they trigger AI narration).

## Freeform mechanical resolution

Every player message sent to `POST /api/chat` is scanned against the intent patterns in
`services/actionResolver.js` (regex-based, aware of inflection — see the `WORD_START` note at the
top of the file), and the first matching intent is converted into a REAL mechanical outcome
(HP/mana/XP/inventory mutation) inside `resolveFreeformAction()` in `services/freeformCombat.js`.
Priority order (even if a message matches multiple patterns, only ONE outcome is produced):
**spell > attack > use item (drink) > equip/unequip item > drop item > pick up item**. If no intent
matches (or the mechanical precondition isn't met — e.g. target/item not found), `resolveFreeformAction`
returns `null` and the system falls back to pure roleplay/flavor narration (`resolveAction()` in
`services/actionResolver.js`, using an estimated D20 only for narrative color).

- **Attack**: hits the enemy in the active encounter (if there are multiple enemies, a name match is
  required) using primary attribute + D20; if an enemy is still alive AFTER the player's own attack,
  a single enemy retaliates (`resolveEnemyRetaliation`).
- **Spell**: triggered when the name in `data/spells.js` or a synonym (`SPELL_ALIASES`) appears in the text;
  an attack spell (Fireball) hits ALL living enemies in the encounter (AoE).
- **Equip/unequip/drop item**: uses the common name-matching function `nameMatchesText()` — it tries
  the exact item name, its Turkish consonant-softened inflected form (e.g. "Kılıç"→"Kılıcı"), AND
  (for multi-word names) just the last word (e.g. "Kısa Kılıç" → "Kılıcımı"). If the name doesn't match,
  no mechanical outcome is produced at all (silently falling back for an item that isn't owned/doesn't
  exist is avoided).
- **Pick up/drop item**: works reciprocally with the scene's loot pool (`services/freeformEncounter.js`) —
  a dropped item is added to the loot pool and can be picked up again. When the inventory cap
  (`MAX_INVENTORY=30`) is full, a pickup request is rejected with `inventoryFull`.
- A dead character (`hp.current<=0`) cannot perform any mechanical action via `POST /api/chat` —
  `routes/chat.js` returns early at the very start; the AI call/mechanical resolution is never
  triggered.

## Notes

- There is NO separate "Action/Bonus Action" turn economy (that was specific to the grid era, removed
  in Phase 12) — the player can type as many messages as they want, each message is resolved on its own.
- Ownership/authorization checks (the active-character check in `/character/intro`) verify that the
  session matches the `characterId` on every request.
