# Frontend — D&D AI Game Master

React + TypeScript + Vite. Assumes the backend (`../backend`) is running on `http://localhost:3001`; the dev server proxies `/api` requests there (see `vite.config.ts`).

As of Phase 12 (2026-08), the old tactical-grid interface (clickable map, token movement, Action/Bonus
Action economy) was completely removed. The game is now a single **full-screen chat** (`ChatPanel`) — the player
types what they want to do in natural language, and the backend resolves the mechanical outcome. The character/inventory is now
a "read-only" card (`CharacterCard`) — it contains no buttons/clicks, all actions go through chat.

## Setup

```bash
cd frontend
npm install
```

## Running

```bash
npm run dev      # http://localhost:5173, the backend also needs to be running
npm run build    # type check (tsc -b) + production build -> dist/
npm run preview  # previews the build output locally
```

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `VITE_API_BASE` | No | Build-time. If not set, `/api` is used (for the local dev proxy). In production (e.g. Render Static Site, a different origin from the backend) the backend's full URL must be given, e.g. `VITE_API_BASE=https://dnd-game-backend.onrender.com/api npm run build` |

## Structure

- `src/types.ts` — types shared with the backend (Character, ChatMessage, ...)
- `src/api.ts` — `/api/*` fetch wrappers, distinguishes `NetworkError` (connection failure) from normal HTTP errors
- `src/App.tsx` — manages the flow between screens (loading → character creation → opening narration → game → game over), fetches the session's active character from the backend
- `src/components/`
  - `CharacterCreation.tsx` — name + race + class + appearance selection form, dice roll
  - `IntroScreen.tsx` — full-screen interstitial shown after character creation, displaying the AI/mock opening narration
  - `HeaderHud.tsx` — always-visible short HP/Mana/Level strip in the header (screen reader updates via `aria-live`)
  - `CharacterCard.tsx` — overlay opened via the 🎒 button: HP/mana/XP bars, attributes, paper-doll equipment view, inventory list — **entirely read-only**, contains no buttons/actions (attack/spell/item use-equip-drop-pickup is now done via natural language in chat)
  - `ChatPanel.tsx` — the GM chat stream, the player's only interaction surface (typing and sending messages)
  - `HelpModal.tsx` — "How to Play?" help window (auto-opens once on the first game screen, marked in `localStorage`) — explains freeform chat examples
  - `GameOverScreen.tsx` — summary screen shown when the character dies (level, XP), restart
  - `ErrorBoundary.tsx` — general error boundary that catches unexpected render errors and offers to reload the page

## Architecture notes

- There is NO grid/token/scene state — the main view is always the full-screen chat (`ChatPanel`), `App.tsx`
  does not manage another "mode" (combat/text). The backend's freeform enemy/encounter state
  never leaks to the frontend; the player only learns about it from the narration in chat messages.
- The character panel (`CharacterCard`) is not a permanently visible panel — it's a read-only overlay
  opened/closed via the 🎒 button in the top bar — to see HP/Mana at all times, `HeaderHud`
  is used separately (fixed in the header, visible even when `CharacterCard` is closed).
  - "No menu/buttons" design decision (PM-approved): this used to have Use/Equip/Drop/Throw/Select-spell
    buttons and drag-and-drop equipping; all of it was removed in Phase 12-C-prep 2 — a freeform
    equivalent for throwing items (`throw`) was deliberately not added (an acceptable
    loss), while dropping (`drop`) was later added to chat.
- After each message, `ChatPanel` passes the updated `character` object returned by the backend up to
  `App.tsx` via the `onCharacterChange` callback — `App.tsx` keeps it in state and passes it as a prop
  to `HeaderHud`/`CharacterCard` (no separate polling/refetch — the chat response already contains the updated character).
- To guard against the possibility that the first request can take 30-60s on Render's cold start, a few automatic retries happen on connection errors while fetching the initial character (with "connecting" feedback to the user).

## Tests / lint

```bash
npm test         # vitest run
npm run lint     # oxlint
```
