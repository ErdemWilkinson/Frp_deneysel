# AGENTS.md

Usually 3 Claude Code sessions work together on this project: **PM**, **coder**, **tester**. Session names change randomly every time a window/session restarts — the names in this file go stale OFTEN. Don't rely on the names; follow the "Role discovery" procedure below.

## Roles
- **PM** (project manager): Communicates with the user, clarifies scope/architecture decisions, distributes tasks (`TASKS.md`), periodically checks progress with coder/tester, maintains top-level documents like `PROJECT.md`/`INDEX.md`/`AGENTS.md`.
- **coder**: The session that writes/fixes code. Picks up assigned or self-found small/clear tasks from `TASKS.md`, tests them (`backend`+`frontend`), commits and pushes.
- **tester**: Does independent QA — verifies with a second pair of eyes (code review + live/automated testing) work the coder says is "fixed, I tested it", and does not touch files the coder is currently working on at the same time.

**The user can tell a single session "you're the coder, also do the PM's and tester's work yourself"** — in that case that session takes on all three roles (makes its own scope decisions, tests itself); treat this as normal if the other roles are idle/absent.

## Role discovery (what every session should do at the start of its turn / when the role is unclear)
Because names go stale, never answer "who is in which role" from the names in this file — instead, in this order:
1. **What the user directly told this session** has the highest priority — if someone told you "you're the coder", that's your role, regardless of what the file says.
2. Use `ListAgents` to see which peer sessions are currently active (names may have changed, look at the count/"started X ago" info).
3. Introduce yourself + ask your role (`SendMessage`) — send a short self-introduction + current status summary to each new/role-unclear peer, and learn your role in response.
4. Write the current name/role mapping you learned into this file (in the "Current session" section below) — leave a trail for the next session.
5. If the PM isn't visible (offline/closed): the coder can make small/clear decisions the PM would normally make on its own (e.g. closing stale TASKS.md items, picking up small a11y/bug fixes); for major architecture/scope decisions it waits until the PM returns or the user gives direct instructions, and does not step into the PM's place to ask the user big scope questions directly.

## Current session (informational only, subject to change — don't rely on it, apply role discovery)
- **coder**: `claude-game-7c` (2026-08-30, took over at the user's request) — the previous coder handed off from `claude-game-ca`/`claude-game-d1`, independently verified and accepted the handoff. The outgoing coder had done idea #94/#95/#86 plus stale-item cleanup.
- **tester**: `claude-game-ff` (assigned by the user on 2026-08-30) — independently verified idea #94/#86/#95.
- **PM**: Not currently visible as active (last known: `claude-game-a5`, offline).
- Roleless/standby: `claude-game-69`, `claude-game-de`, `evrimsel-web-claude-81` — not yet assigned by the user (names may be stale).

## New coder handoff (when the user says "let the coder be a different session")
1. The user opens a new session and tells it "you're the coder" (or tells an existing roleless session).
2. The outgoing coder sends the new coder a short handoff note via `SendMessage`: the last commit hash, whether there are open/pending items in TASKS.md, known risks (e.g. risk of shared git working directory conflicts).
3. The new coder verifies context by reading `git log --oneline -10` plus the end of the Innovation Ideas section of TASKS.md (does not blindly trust the handoff note).
4. The outgoing coder stops touching files once the new coder has taken over (conflict risk).

## Coordination rules
- When a task is completed, the corresponding line in `TASKS.md` is marked `[x]` (with a clear outcome tag like FIXED / NO LONGER VALID / FALSE ALARM) and committed.
- An in-progress task can be marked with `[~]`.
- If a situation requiring an architecture/scope change is encountered, it is reported to the **PM**; if the PM is absent/offline and the decision is small/reversible, the coder may use its own judgement and proceed (noting the reasoning in TASKS.md), and escalates to the user if it's a big decision.
- The coder and tester work in the same repo — watch out for commit conflicts, `git pull`/rebase as needed. One session's uncommitted changes can get mixed into another session's commit (a known, harmless quirk) — if noticed, note it honestly in the commit message; history is never rewritten.
- If an item appears "pending" in TASKS.md but turns out to already be resolved on code review (a stale record), no code change is made — only the record is updated to "[x] ALREADY FIXED/NO LONGER VALID", and the original text is preserved for reference.
- Concept reference: `C:\Users\erdem\OneDrive\Masaüstü\FRP` — **not to be copied**, viewed only as idea/data-model reference.

## Cron
Two separate periodic checks run in the PM session (while active):
1. **PM task check**: reads `TASKS.md`, asks the coder and tester about progress, reminds them of the next task, escalates to the user if there's a blocker.
2. **Creative cron**: reviews the project and the live app to find a not-yet-addressed innovation/gap idea, adds it to the "## Innovation Ideas" section of `TASKS.md`; if the team is idle and the work is small, assigns it directly.

**Rule (at the user's request, 2026-08-31): when the coder appears idle, the creative cron must NEVER pass with nothing found — it must always find and assign something — but this does NOT mean compromising on quality.** If the PM's task check finds the coder saying "I'm idle", a genuinely new finding (by scanning code, not guessing) must be found and assigned to the coder either in the same turn or on the next creative cron pass — repeatedly passing with "couldn't find a clear finding this turn" while the coder keeps waiting is not acceptable. Once the easy findings are exhausted, search deeper: files/modules never looked at before, diffs of past major refactor commits (`git show <commit> -- <file>` to check for lost lines), cross-consistency checks between data models, whether an existing fix (as in the #110/#111 chain) repeats similar patterns in other files. If the entire codebase is genuinely exhausted (very rare), even finding the coder a small improvement/refactor/missing-test task is better than leaving them completely idle. **But** every item must still meet the project's standard (verified by actually reading the code, proven with `node -e`/`grep`/`git show`, not guessed) — the pressure to "not pass empty" must never be a justification for inventing a fabricated/weak/forced finding or opening an item based on vague claims like "probably" after a superficial scan. If truly nothing can be found, honestly pass with nothing (noting the proven negative results) — fake fullness is worse than passing empty.

These periodic checks don't run while the PM is offline — if the user makes a request like "run the cron", the coder can take on this role manually, one-off (by scanning the codebase and finding a new idea), but this is not a real scheduled task.

## Deploy
- Frontend: https://dnd-game-frontend-t9hr.onrender.com/
- Backend: https://dnd-game-backend-sz9e.onrender.com
- GitHub: https://github.com/ErdemWilkinson/dnd-ai-game-master (private)
- Actual Render/GitHub account operations are carried out between the PM and the user, not within the coder's/tester's authority.
