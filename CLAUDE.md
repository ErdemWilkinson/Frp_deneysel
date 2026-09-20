# CLAUDE.md

General instructions for every Claude Code session working in this repo.

## Project
See [PROJECT.md](./PROJECT.md) — concept, scope decisions, stack.
See [TASKS.md](./TASKS.md) — current task list and statuses.
See [AGENTS.md](./AGENTS.md) — session roles and coordination rules.

## Rules
- The `C:\Users\erdem\OneDrive\Masaüstü\FRP` folder is **concept reference only**. Code is not to be copied verbatim from there.
- Scope: for now, **D&D universe only**. Additional settings like Star Wars/Naruto will not be added (unless the user says otherwise).
- The AI Game Master is currently **rule-based/mock** — real LLM integration is a separate phase, not started without user approval.
- Major architecture/scope decisions are referred to the PM session, not asked directly to the user (the PM already coordinates with the user).
- Before committing, check `git status` to see what's staged, so unnecessary/large files (e.g. `node_modules`) aren't committed.

## Running
- Backend: `cd backend && npm install && npm start`
- Frontend: `cd frontend && npm install && npm run dev`
(Details will be updated as the project progresses.)
