# Project: D&D AI Game Master (name not yet finalized)

## Concept
A single-player, chat-based D&D RPG simulator with a tactical grid.
- The player creates a character (race/class selection, name).
- The Game Master (GM) generates real AI narration via the Google Gemini API; if there's no key/an error/timeout/quota is exceeded, it silently falls back to rule-based mock text (see the "AI GM" note below).
- Character sheet: HP, mana, attributes, inventory (use/equip/drop/throw).
- Tactical grid map: token movement, obstacles, loot, turn-based system.
- The tactical grid automatically switches to a full-screen text/chat mode, visible only when an enemy is present (Phase 11).

## Scope decisions
- **D&D universe only** (Star Wars / Naruto NOT included — may be added later, but not now).
- **Reference**: the prototype in the `C:\Users\erdem\OneDrive\Masaüstü\FRP` folder was reviewed as concept inspiration.
  **NOT TO BE COPIED VERBATIM** — code will be written from scratch, clean. Idea/data-model reference only.
- AI GM: in Phase 1/1.5, **fake/rule-based** (random/template text). In Phase 2, real AI GM added via **Google Gemini API** (free tier) — chosen over the Claude API due to cost/bottleneck risk. If the rate limit is exceeded or the key is missing/errors, it automatically falls back to the mock GM (the flavor text from Phase 1) — AI is an "upper layer"; the game's core flow is never dependent on it.

## Stack
- Frontend: React + Vite (TypeScript)
- Backend: Node.js + Express
- Location: this repo root (`frontend/`, `backend/`)

## Roles
Current session names change frequently (each time a window is restarted) — see `AGENTS.md` for current names, not repeated here.
- **coder**: implementation
- **tester**: writing tests + QA
- **PM** (this session): task distribution, decision coordination, communication with the user

## Working arrangement
- Tasks are kept in `TASKS.md`, updated by the PM.
- The PM sends the coder and tester a progress/task reminder every 15 minutes (cron).
