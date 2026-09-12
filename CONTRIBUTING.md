# Contributing — Auralis Team Rules

> Rules reference for the 3-person hackathon team.
> Read once, then ctrl-F at 1 AM when you need a specific rule.

---

## 1. Branching Model

- **`main`** = demo-ready at all times. Nobody commits directly to `main`.
- **`dev`** = integration branch. Nobody commits directly to `dev` either — everything goes through a PR, including solo work.
- Branch off `dev` for every task:
  - `feat/<short-name>` for new work (e.g. `feat/sgp4-propagator`, `feat/globe-conjunction-rings`)
  - `fix/<short-name>` for bug fixes (e.g. `fix/ws-heartbeat-timeout`)
- **Keep branches short-lived** — a day or two max. The longer a branch lives, the worse the merge.
- **Rebase early, rebase often**:
  - `git pull origin dev --rebase` before starting any new branch.
  - Rebase onto `dev` periodically while a branch is open, so conflicts surface small and early instead of all at once at the end.

---

## 2. Ownership Boundaries

Each top-level folder has one owner. The owner reviews and merges changes to that folder.

| Folder / File | Owner | Brief |
|---|---|---|
| `app/` | Frontend person | [BRIEF_FRONTEND.md](./BRIEF_FRONTEND.md) |
| `components/` | Frontend person | [BRIEF_FRONTEND.md](./BRIEF_FRONTEND.md) |
| `lib/` | Frontend person | [BRIEF_FRONTEND.md](./BRIEF_FRONTEND.md) |
| `types/` | Frontend person | [BRIEF_FRONTEND.md](./BRIEF_FRONTEND.md) |
| `public/` | Frontend person | [BRIEF_FRONTEND.md](./BRIEF_FRONTEND.md) |
| `backend/` | Backend person | [BRIEF_BACKEND.md](./BRIEF_BACKEND.md) |
| `data/` | Data person | [BRIEF_DATA.md](./BRIEF_DATA.md) |
| `INTERFACE_CONTRACT.md` | All three (see §3) | [INTERFACE_CONTRACT.md](./INTERFACE_CONTRACT.md) |
| `package.json` | All three (see §3) | — |
| Root configs (`tsconfig.json`, `next.config.ts`, `eslint.config.mjs`, `postcss.config.mjs`) | Frontend person (primary), others consult | — |

**Rule:** If your change touches a file outside your own module, get a review from the person who owns it before merging — even if the PR is small.

---

## 3. Shared Files (Conflict Zone)

These files are touched by multiple people and cause the worst merge conflicts:

- `package.json` / `package-lock.json`
- `INTERFACE_CONTRACT.md`
- Shared type definitions (`types/contract.ts`, `backend/types/`)
- Root config files (`tsconfig.json`, `next.config.ts`)

**Rules:**

1. **Heads-up first.** Before changing any shared file, tell the team in chat. Don't surprise anyone.
2. **Standalone PR.** Land the shared-file change in its own small, isolated PR — not bundled with feature work.
3. **Merge immediately.** Don't let the PR sit. Merge it into `dev` as soon as it's reviewed.
4. **Everyone rebases right after.** Once the shared-file PR lands, all open branches rebase onto `dev` immediately — before writing more code.
5. **No parallel edits.** Don't let three people independently add dependencies or shared types in parallel branches. One at a time, sequentially.

---

## 4. Review & Merge Rules

- **One review** (can be quick — a glance is fine for small PRs) before merging any PR into `dev`.
- **Merge `dev` → `main` only at agreed demo/checkpoint milestones**, not continuously. Coordinate in chat before merging to `main`.
- If a PR breaks `dev` (build fails, runtime crash), fix it or revert it immediately — don't leave `dev` broken for the next person.

---

## 5. AI-Assisted Changes (Antigravity / Coding Agents)

The frontend layout, component structure, and visual design are **FINAL** for this hackathon unless a task explicitly asks for a redesign. These rules apply to any AI-generated code:

### What agents CAN do
- Update text, labels, copy, and placeholder content
- Wire up data from mock API or live backend
- Fix bugs in logic, data flow, or state management
- Add new functionality within existing component boundaries

### What agents MUST NOT do (unless the task explicitly says "redesign")
- Change layout or component structure
- Alter spacing, padding, margins, or grid definitions
- Modify color tokens, theme variables, or CSS custom properties
- Restructure the component tree or move components between files
- Change font sizes, weights, or typography tokens
- Add or remove animations/transitions

### Ambiguity rule
If a task's instructions are ambiguous about whether a visual change is wanted, the agent should **default to NOT changing the design** and leave a comment or note explaining what it skipped and why. Guessing wrong and breaking the design costs more time than leaving a TODO.

### What counts as "explicitly asking for a redesign"
The prompt must unambiguously say something like "redesign the layout," "restyle this page," "change the visual design," or "rebuild the component structure." Phrases like "update," "fix," "wire up," or "improve" do **not** imply visual changes.

---

*When in doubt: ask in chat, keep your branch small, and don't touch what isn't yours.*
