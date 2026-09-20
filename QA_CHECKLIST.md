# Manual QA Checklist — Phase 1 / Phase 1.5 / Phase 2 / Phase 3 / Phase 3.5 / Phase 4 / Phase 5 / Phase 6

Usage: with the backend (`cd backend && npm start`, :3001) and frontend (`cd frontend && npm run dev`, :5173) running in separate terminals, open `http://localhost:5173` in a browser and check items in order.

Status: Phase 1.5, Phase 2, and Phase 3 (A, C, D, E) are complete and verified by regression (last: 2026-08-22). Past bug numbers (TASKS.md > "Bugs Found") are kept for reference. **With Phase 3, the character creation flow and the throw UX in the inventory changed fundamentally — the "Character creation" section and the throw items below it reflect the current (post-Phase 3) flow.**

## Character creation (Phase 3-A: D20 roll + appearance + AI opening story)
- [x] When the page first loads, if there's no active character, the character creation form is shown (name, race, class, appearance)
- [x] Submitting with an empty name shows a "Name required." error, no request is sent
- [x] The "Start Adventure" button stays disabled until the "Roll (D20)" button has been pressed
- [x] After rolling, a brief animation (random values changing quickly) plays, then the real D20+race-bonus result appears in the attribute boxes
- [x] Changing race resets the previous roll result (submit becomes disabled again) — makes sense since the race bonus changed
- [x] With a valid name and a roll, "Start Adventure" creates the character, immediately followed by the AI (or mock) opening story screen ("Adventure Begins")
- [x] If the opening story is mock-sourced, a "(mock narration)" label is shown
- [x] "Continue" proceeds to the game screen
- [x] Starting HP/Mana/attribute values are correct across different race/class combinations, based on race bonus + class base values
- [x] The race/class line on the character card is shown with the localized name ("Elf · Wizard" etc., old bug #3 fixed)

## Chat (GM)
- [x] When a message is sent, both the player message and the GM response appear in the chat stream
- [x] Empty messages can't be sent
- [x] Keywords like "attack" / "look" / "talk" trigger different flavor-text categories
- [x] Previous chat history comes back after a page refresh (Bug #4 fixed, the character screen is now reached)
- [x] **(Phase 3-D)** A dice roll summary appears under every GM message (e.g. "Strength check: 14+2=16 (DC 12) — Success")

## Tactical grid
- [x] The map, obstacles, loot, and two tokens (player + goblin) render correctly
- [x] **(Phase 3-C)** Movement allowance increased to 5 tiles — range checks work accordingly
- [x] Clicking a cell out of range shows an error message, the token doesn't move
- [x] Clicking a blocked cell shows an error message
- [x] Clicking an empty in-range cell moves the token there
- [x] Moving onto a cell with loot picks up the loot (disappears from the map)
- [x] "End Turn" moves to the next token; once all tokens complete their turn, the round counter increments
- [x] Clicking the grid during the enemy's turn is blocked: an "It's not your turn." error is shown, the grid visually becomes inactive (`grid-disabled`), no request goes to the backend (Bug #5 fixed — PM decision: block)
- [x] Once it's the player's turn again, the block is lifted, movement works normally
- [x] **(Phase 3-C)** The scene header has an "Action: ✓/✗ · Bonus: ✓/✗" indicator
- [x] **(Phase 3.5 Bug A, fixed — commit eb04d66)** When an Action is spent via Use/Throw, the indicator now switches to ✗ INSTANTLY (thanks to `sceneRefreshTick` in App.tsx, TacticalGrid re-fetches the scene) — re-verified live in the browser.
- [x] When the turn returns to the player via end-turn, Action/Bonus Action reset to ✓

## Inventory
- [x] Every item row has Use / Equip(-Unequip) / Drop / Throw buttons (Bug #2 fixed)
- [x] Using a potion increases HP (up to max), the item is removed from inventory (Bug #1 fixed — Turkish "İ" regex issue)
- [x] The equip toggle correctly shows/removes the "equipped" label, the button text switches between Equip↔Unequip, does NOT consume an Action
- [x] Dropping an item removes it from inventory and adds it to the scene's loot list, does NOT consume an Action
- [x] **(Phase 3-E, redesigned)** Throw is no longer an X/Y form — clicking "Throw" switches the grid to target-selection mode ("Select throw target"), clicking a cell throws it, clicking "Throw" again (now "Selecting Target...") cancels it
- [x] **(Phase 3-C)** Use and Throw require the player's turn AND an available Action — when the Action is used up, a second use/throw is rejected with "You have no Action left this turn."

## General / error conditions
- [ ] If the frontend loads while the backend is down, is a meaningful error shown to the user (currently: if `getCharacterOptions` is rejected, the form stays empty, an error message is shown but race/class options never load) — **not included in Phase 1.5 scope, may be revisited later**
- [x] No unexpected errors/warnings in the browser console (DevTools > Console) — verified during regression QA
- [x] Character and inventory state is preserved after a page refresh (F5 / new tab) (Bug #4 fixed)

## Phase 2 — AI Game Master (Gemini)

Behavior verified by automated tests (`backend/tests/aiGmFallback.test.js`, `rateLimiter.test.js`), no real key required:
- [x] With `GEMINI_API_KEY` unset, the chat endpoint works without error, `gmMessage.source` returns `"mock"`
- [x] If the Gemini call errors/times out, the request still returns 201 successfully, the user sees no error, `source: "mock"`
- [x] When the rate limit (hourly counter) is exceeded, no request goes to Gemini at all, `source: "mock"`
- [x] When Gemini returns a successful response, `source: "ai"` and the real narration text is returned to the user
- [x] Rate limiter: accept/increment within limit, reject over limit, reset when the window fills, default limit (30) — all verified by unit tests

**QA with a real key — COMPLETE (2026-08-22).** The user's previous key had hit a billing/quota block on the Google Cloud project side (`429 "Your prepayment credits are depleted"`); this wasn't something fixable on the code side (verified live independently by both tester and coder — the fallback worked flawlessly in both cases). After the user provided a new key from a different Google Cloud project, all items were verified:
- [x] With an invalid/erroring/quota-exceeded key, the backend doesn't crash, silently falls back to mock — verified live with a real 429 error (backend log: "AI GM call failed, falling back to mock: ... 429 Too Many Requests ...")
- [x] A "GM (mock)" label appears on mock messages in the frontend — verified live in the browser, no console/page errors
- [x] Entering a valid key into `backend/.env` returns `source: "ai"` on the first chat message — also verified with a 3-turn chat via curl
- [x] The AI's narration is atmospheric and a few sentences long — observed in a real 3-turn chat (dungeon/chest theme), tone consistent and atmospheric
- [x] The AI gives references appropriate to the character name/race/class — tested with an Elf/Wizard character, responses included race/class-specific details like "your sharp elven eyes" and "the shadow of your staff" (not a generic template, genuinely context-aware)
- [x] Consistent references to previous messages across multi-turn chats — responses in turns 2 and 3 directly referenced the chest introduced in turns 1 and 2 (proof the AI genuinely uses the `recentMessages` context)
- [x] The AI does NOT change game state (HP, inventory, position) — character (HP/mana/inventory) and scene (token positions/loot/round) state were compared before/after a 3-turn chat, no field changed
- [x] When the hourly limit is exceeded mid real-AI-flow, it automatically falls back to `source: "mock"` — tested live with `AI_HOURLY_LIMIT=2`: 1st and 2nd requests `source: "ai"`, 3rd and 4th requests exactly as expected `source: "mock"`; the "(mock)" label appeared correctly in the browser, no console errors

**Phase 2 fully closed — no known open items.**

## Phase 3 — Character creation, BG3-inspired combat system, rich AI narration

Behavior verified by automated tests (`backend/tests/dice.test.js`, `actionResolver.test.js`, `characterIntro.test.js`, the Phase 3-C tests in `scene.test.js`; `frontend/src/components/TacticalGrid.test.tsx`, `ChatPanel.test.tsx`, `CharacterCreation.test.tsx`):
- [x] D20 dice roll (`rollD20`) is always in the 1-20 range, edge values (Math.random 0 and ~1) work correctly
- [x] `/character/roll-stats` applies the race bonus correctly, returns 400 for an invalid race
- [x] If valid attributes are sent to `/character/create`, the server doesn't roll its own dice (uses them as-is); if missing/invalid, the server rolls its own
- [x] `/character/intro`: nonexistent character returns 404; on AI success → `source:"ai"`; on AI error/no key → silently falls back to mock opening; the generated message is added to chat history as the first GM message
- [x] `actionResolver`: nat20 is always a critical success, nat1 is always a critical failure (even if the total beats/misses the DC), DC 12 comparison is correct
- [x] Action economy: Use/Throw consume an Action and return 400 when exhausted; Equip/Unequip/Drop remain free (PM-approved scope); on end-turn, the new active token's Action/Bonus Action are reset
- [x] The `gmMessage.roll` field is populated in every chat response, shown in ChatPanel

**End-to-end browser regression (Playwright, 2026-08-22) — COMPLETE:** Create character (name → roll animation → D20 result → appearance) → AI/mock opening story screen → "Continue" to the game screen → send an attack message (roll result appeared in chat) → use item (consumed Action, backend correctly rejected the second use) → "End Turn" twice (Action reset) → throw by clicking on the grid (worked, Action consumed again and the indicator updated correctly this time). No console/page errors.

2 findings identified, and **both were fixed and verified in Phase 3.5** (commit eb04d66, details in TASKS.md):
1. ~~The Action indicator didn't update instantly after CharacterCard-triggered actions~~ → fixed, verified live (see the "Tactical grid" section above)
2. ~~The `ara` ("search"/"between") keyword in `actionResolver` was matching the wrong stat in words like "duvara" (to the wall), "kaçarak" (fleeing) due to an unanchored regex~~ → fixed, verified via the `WORD_START` word boundary + a test

Real Gemini AI content couldn't be re-verified this round (quota was exhausted, 429) — the fallback path worked flawlessly, but Phase 3's "5 senses" + roll-contextual narration quality hasn't yet been visually confirmed with a real AI response; should be retried with a key that has quota available.

**Phase 3 + Phase 3.5 closed — no known open bugs** (the mock+outcome tone note is on record, low priority, not a blocker).

## Phase 4 — Movement bugs, equipment slots, simple enemy AI, BG3 visual style

Behavior verified by automated tests: backend **138/138**, frontend **38/38**, tsc+vite build clean.

- [x] Even if the target cell is empty, movement is rejected if the path crosses an obstacle in between ("The path is blocked by an obstacle.") — Bresenham path check
- [x] When the total distance of consecutive moves in the same turn (`movementLeft`) exceeds the budget it's rejected, accepted if within it, reset to `speed` on end-turn
- [x] The "Movement: remaining/max" indicator in the scene header works correctly
- [x] Equipment: every item in inventory is assigned the correct slot (Short Sword→Hand, Leather Armor→Chest, Potion→none); an item without a slot can't be equipped (400); equipping a new item in the same slot automatically unequips the old one (paper-doll swap)
- [x] CharacterCard shows a 6-slot (Head/Chest/Arms/Hand/Legs/Feet) paper-doll view under the "Equipment" heading — equipped items shown in the correct slot with a gold frame, empty slots show "(empty)"
- [x] Simple enemy AI: when the enemy's turn comes, it resolves automatically INSIDE the `End Turn` call — if not adjacent, it moves toward the player with a "X is approaching you." message; if adjacent, it attempts an attack with D20+2 vs DC12 (on hit, d6 damage + HP decreases, a message on miss), the turn immediately returns to the player. NO additional AI/LLM call, fully deterministic.
- [x] Enemy messages are added to chat history with `source:"mock"`, shown in ChatPanel
- [x] BG3 visual theme: Cinzel/Spectral fonts load correctly, bronze/gold-accented panels, good contrast, no readability issues, no broken layout — verified visually in the browser (Playwright)

- [x] **Panel layout fixed (commit 673f7f0) and verified:** Left=character, center=Adventure Log (chat, wide column), right=tactical map (380px) — the layout approved in Phase 3-B/4-B is now verified in the browser (Playwright DOM order + screenshot).

**Phase 4 FULLY CLOSED** — no known open items (the mock+outcome tone contradiction note is low priority, not a blocker).

## Phase 5 (items 1-2) — Melee mechanics + auto-narrator after movement

Behavior verified by automated tests: backend **159/159**, frontend **44/44**, tsc+vite build clean.

- [x] Clicking an adjacent enemy token attacks (BG3-style, no separate button); out of range (not adjacent) returns 400
- [x] Attack turn/Action-availability check: 400 when it's not the player's turn or the Action is used up
- [x] D20 + the character's class-based primary attribute modifier (fighter→STR, wizard→INT, etc.) vs DC 12; nat1 is always a miss, nat20 is a crit (the sum of two d6 dice deals damage)
- [x] A successful hit reduces the target's HP, consumes the Action; when HP hits 0 the target is removed from the scene, a "defeated" narration is added, attacking a dead target again is rejected
- [x] The attack outcome (AI/mock) is added to chat; character/scene state is updated in the frontend
- [x] The token tooltip in the grid now shows HP info; while it's the player's turn, a "You can attack by clicking an adjacent enemy." hint is shown (hidden in throw mode)
- [x] After every successful move, a short AI/mock narration is automatically generated and added to chat; a failed move (out of range/blocked) does NOT generate narration
- [x] The fallback principle is preserved (`services/narrationService.js` — shared by chat/attack/move): no key/error/rate-limit → silently falls back to mock

**End-to-end live browser verification (Playwright, 2026-08-22):** Create character → move (narration dropped into chat: "For a moment there's silence, then a muffled roar is heard in the distance.") → wait for the enemy to approach with a few "End Turn"s → once adjacent, the enemy auto-attacked (4 damage, HP 12→8, "The Goblin hits you! You took 4 damage. (18+2=20 vs 12, HP: 8/12)") → clicked the adjacent enemy to counter-attack (Action switched to ✗, result dropped into chat). No console/page errors.

**Phase 5 items 1-2 CLOSED** — no known open bugs.

## Phase 5 item 3 — SS13-style iconized inventory/equipment

Behavior verified by automated tests: backend **165/165**, frontend **49/49**, tsc+vite build clean.

- [x] The 13 SS13 slots (head/mask/glasses/ears/neck/back/armor/outer clothing/gloves/belt/shoes/accessory/hand) render with correct labels
- [x] Every item is assigned the correct `icon` field based on its slot when the character is created (`/icons/<slot>.png`); weapons in the "hand" slot have no icon in the asset set, `icon: null` is returned (frontend uses the ⚔ emoji fallback)
- [x] A filled slot is shown with its icon + a gold "filled" border, an empty slot shows a "·" placeholder
- [x] Clicking a filled slot unequips the item (same `equipItem`/toggle logic — swap is already handled by the old item auto-unequipping when a new one is equipped in the same slot), an empty slot can't be clicked (disabled)
- [x] Every item (if it has an icon) shows a small thumbnail in the inventory list

**Visual QA in the browser (Playwright) — COMPLETE (2026-08-22), critical because the coder had never seen a live render:** the 13-slot paper-doll rendered correctly in a 3-column layout, all icons actually loaded (in the DOM, `naturalWidth: 32`, `complete: true` — no broken/placeholder img), the icon in the "Armor" slot was recognizable as a clear armor/vest sprite in a close-up screenshot (NO error/broken image), the "Hand" slot correctly showed the ⚔ emoji fallback, clicking a filled slot successfully unequipped the item. **The CC BY-SA 3.0 attribution note genuinely appears at the bottom of the page**: "Icons from the /tg/station project, licensed under CC BY-SA 3.0 (github.com/tgstation/tgstation)." No console/page errors.

**Phase 5 (items 1, 2, 3) FULLY CLOSED** — no known open bugs.

## Phase 6-A — Session isolation (multi-user)

Behavior verified by automated tests: backend **175/175**, frontend **57/57**, tsc+vite build clean.

- [x] On first visit, every browser generates its own `X-Session-Id` and saves it to `localStorage`; the same id is sent on all subsequent requests
- [x] Two different sessions have completely independent character/scene/chat — neither sees/affects the other at all
- [x] Old requests without an `X-Session-Id` header (curl etc.) fall back to the `"default"` session, backward compatibility is preserved
- [x] The rate limiter is deliberately GLOBAL (not per-session, a single app-wide quota — PM decision)

**Real multi-user browser test (Playwright, two separate browser contexts, 2026-08-22) — COMPLETE:** Two independent "users" (isolated localStorage) created characters, chatted, and moved on the grid at the same time — neither saw/affected the other's name, chat, or scene state. Different session ids were verified. No console errors.

**Known architecture note (not a bug, on record):** The `item/use|equip|drop|throw` and `/attack` endpoints don't verify that the given `characterId` actually belongs to that session — they only check whether it exists in the `characters` Map. Since nanoids are unpredictable, the practical risk is low; documented with a test (`sessionIsolation.test.js`).

**Phase 6-A FULLY CLOSED** — no known open bugs.

## Phase 6-B — SQLite persistence

Behavior verified by automated tests: backend **184/184** (test runs automatically use the `:memory:` DB, never touch the real `game.db`), tsc/build not needed since this is backend-only.

- [x] Character/scene/chat are also written to SQLite at every mutation point (create/move/end-turn/attack/item actions/chat/intro)
- [x] At server startup (`loadAll()`), everything in the DB is restored into the in-memory Maps
- [x] Works without error when the DB is empty or a session has no active character (`active_character_id` NULL)

**Live restart test with a real file DB (2026-08-22) — COMPLETE, not the `:memory:` used by the test suite, the real `game.db`:** Started the backend → created a character → moved on the grid → chatted → genuinely terminated the backend process with `taskkill` and restarted it. After restart: character (name/HP/inventory) identical, the player token at exactly the position I'd moved to (movementLeft correctly reduced), all messages in chat history came back intact.

**Phase 6-B FULLY CLOSED** — no known open bugs.

## Known limitations (not bugs, on record)
- There's no separate "shield" slot in the SS13 slot list — the Shield item is assigned to the closest equivalent, the "back" slot, a PM/coder decision, behaves consistently.
- Weapons (hand slot) have no icon in the tgstation asset set — the frontend uses a text/emoji fallback (⚔), not out of scope but visually different from other slots.
- `frontend/src/data/dndNames.ts` is a static copy that must be kept manually in sync with the backend's `data/dnd.js` — if the race/class list changes, both must be updated.
- The Action economy check is applied in the backend at `/scene/item/use` and `/scene/item/throw`; grid movement (`/scene/move`) is managed from a separate source (movementLeft) — PM-approved scope, not a bug.
- Enemy AI is entirely scripted/deterministic (greedy movement + simple D20 attack) — complex strategy, cover/elevation mechanics, and AI visual generation were left out of Phase 4's scope (user decision).

## Phase 6-C — Game loop (death/leveling/spells), backend+frontend

Behavior verified by automated tests: backend **216/216**, frontend **73/73**, tsc+vite build clean.

- [x] 20 XP per kill, threshold level×50, on level-up HP.max/mana.max +2 (fully restored) + primary attribute +1
- [x] "Heal" (self-targeted) and "Fireball" (ranged, target-select mode) spells work correctly with mana/range/damage logic
- [x] Spell buttons are disabled when mana is insufficient; the "Spells" section doesn't appear at all for classes with `mana.max===0`
- [x] When `hp.current<=0`, GameOverScreen is shown, combat effectively stops (attack/cast/item rejected with 400)
- [x] "Restart" → `/character/reset` → returns to the character creation screen, the old character record stays in the DB (only the session link is severed)

**Bug found (fixed immediately by the coder, commit `a2d6bab`):** While in spell target-select mode, clicking a non-enemy cell silently moved the player (`moveToken` was being called instead of `castSpell`). Caught by a regression test, fixed and verified in the same session.

**Critical process finding (not a code bug):** At the start of QA, the running backend dev server (`node server.js`, without watch) had never loaded the coder's Phase 6-C routes (`/scene/cast`, `/character/reset`) — it was an old process that hadn't been restarted. `/scene/cast` and `/character/reset` returned 404 "Cannot POST", even though the backend test suite (which sets up its own Express app instance) was green at 216/216. Restarting with `taskkill`+`npm run dev` fixed it. **Before closing out a major phase, it's necessary to verify the dev server has genuinely been restarted — "tests are green" alone isn't enough.**

**End-to-end live browser QA (Playwright, against a restarted backend, 2026-08-22) — COMPLETE:** Create a wizard → cast Heal (mana 12→8, HP updated, narration dropped into chat) → enter Fireball target-select mode (the "Select spell target" indicator on the grid is correct) → reduce HP to 0 via the turn cycle → **GameOverScreen rendered correctly** → **successfully returned to the Character Creation form** via "Restart". All console errors are expected ones (400 = out-of-range/rejected requests after HP-0, a few startup 404s) — no real errors.

**Phase 6-A rejection test with two separate sessions (against a restarted backend) — COMPLETE:** two independent browser contexts stayed completely isolated, different `X-Session-Id`s verified.

**"When one dies and resets, the other shouldn't be affected" scenario (curl, real `game.db`) — COMPLETE:** A was reset via `/character/reset`, B's character (name/HP/inventory) remained accessible completely unaffected.

**Final restart verification with a real file DB (not `:memory:`, real `game.db`) — COMPLETE:** A character was created, the backend was genuinely terminated with `taskkill` and restarted, the character (name/HP/inventory) came back identically.

**Phase 6 (A+B+C) FULLY CLOSED** — no known open bugs. Test data created during QA was cleaned up from the real `game.db`.

## Phase 7 — Content variety + Postgres abstraction + Render deploy prep

Behavior verified by automated tests: backend **237/237**, frontend **75/75**, tsc+vite build (default + with `VITE_API_BASE` override) clean.

- [x] When an encounter is cleared (`/attack` or `/cast`), it automatically advances to the next area, progress (`encounterIndex/totalEncounters`) is written to the DB and preserved after a restart, the frontend correctly shows "Encounter: N/M"
- [x] In a multi-enemy encounter, the transition only triggers once the LAST enemy dies (not yet on the first enemy's death)
- [x] Behavior never changed while `DATABASE_URL` is absent (SQLite, including tests); with `DATABASE_URL`+`VITEST` it's still SQLite too (test isolation preserved); with `DATABASE_URL` alone, the Postgres engine is selected and doesn't crash at module import time
- [x] A real server-start attempt with an unreachable Postgres URL exits cleanly with a clear error (ECONNREFUSED), doesn't hang — independently re-verified
- [x] When the `VITE_API_BASE` build-time env is provided, the full backend URL is embedded into the bundle; when not provided, the default `/api` proxy behavior isn't broken — verified with two real `vite build` runs
- [x] The `healthCheckPath` (`/api/health`) in `render.yaml` genuinely exists and works, no secrets are in any file

**Note:** There's no real Postgres/Render environment — the Postgres connection and the `fromService` schema match in Render were verified via dry-run/mock; the actual deploy attempt will be done separately with the PM+user (not within this tester's/coder's authority).

**Phase 7 (A+B+C) FULLY CLOSED** — no known open bugs.

## Out of scope (intentionally absent, do not report as a "bug")
- A real LLM-based GM (Gemini is used if available, otherwise rule-based/template text — see Phase 2)
- Login/account system (session isolation exists — Phase 6-A — and persistence exists — Phase 6-B, SQLite — but there's no user account/password/login flow, sessionId is an anonymous localStorage-based identity)
- Scene visuals (no static placeholders, grid only) and AI-generated visuals/portraits
- Combat mechanic depth (cover, elevation, throw range, etc.)
