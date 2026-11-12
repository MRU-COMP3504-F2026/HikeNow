# Hike Now!

Hike Now! is a web app where hikers discover trails, leave reviews (with tags, equipment and photos),
follow other hikers and chat with them (direct messages, group chats and hike proposals).

**Stack:** Next.js 16 (App Router, React 19, TypeScript, Tailwind 4) · Server Actions · Drizzle ORM ·
PostgreSQL on Supabase · Vitest + Testing Library · GitHub Actions.

## Team and project links

- [Discord Server](https://discord.gg/RmHTHj5gZ9)
- [Shared Google Folder](https://drive.google.com/drive/folders/1Eg1H2vX3lAmY02DvXf1szu-1euWe6Js_?usp=sharing)
- [Product Backlog (GitHub Projects)](https://github.com/orgs/MRU-COMP3504-F2026/projects/4/views/1)
- Members: Osval Montesinos Valladares, Tadhg Dunlop, Jeremy Pacla, Jaime García Menéndez, Haniya Shareef

---

## Live demo

The app is deployed on Vercel: **https://hike-now.vercel.app/**

No installation is needed to try it. A public demo account is available for grading (no sign-up required):

- **Email:** `demo@hikenow.test`
- **Password:** `HikeNowDemo2026`

The sections below explain how to build, test and run the project locally.

---

## Quick start

The application lives in the [`hike-now/`](./hike-now) folder; every command below runs from there.

**Requirements:** Node.js **22.18 or newer** (includes npm) and Git. The app needs the team's Supabase
database (see [Environment variables](#environment-variables)).

```bash
git clone https://github.com/MRU-COMP3504-F2026/HikeNow.git
cd HikeNow/hike-now

npm ci                      # 1. install exact dependency versions
cp .env.example .env        # 2. then edit .env with the credentials provided (Windows: copy .env.example .env)
npm run dev                 # 3. start the app at http://localhost:3000
```

### Build, test and run

| Goal | Command (from `hike-now/`) | Notes |
|---|---|---|
| Install dependencies | `npm ci` | Reproducible install from `package-lock.json`. |
| Run in development | `npm run dev` | http://localhost:3000, hot reload. |
| Lint | `npm run lint` | ESLint. Must finish with 0 errors. |
| **Run the tests** | `npm test` | Vitest, single run. About 220 unit/component tests; needs **no** database or `.env`. |
| Tests in watch mode | `npm run test:watch` | For development. |
| Database integration tests (optional) | `CHAT_INTEGRATION=1 npm test -- app/actions/chats.integration.test.ts app/actions/group-chats.integration.test.ts` | Needs `.env` and the migrations applied. They create and remove their own test data. |
| **Production build** | `npm run build` | Needs `.env` and internet access (fonts are fetched from Google Fonts). |
| Run the production build | `npm run start` | After `npm run build`. |

### Environment variables

Copy [`hike-now/.env.example`](./hike-now/.env.example) to `hike-now/.env`. `.env` is git-ignored.

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Server-only PostgreSQL connection string (Supabase). Used by Drizzle and the migration scripts. |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (review photo uploads). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key (review photo uploads). |

> **Credentials for the grader:** the values for the shared team Supabase project are **not** stored in
> this repository (it would expose the database). They are posted in the team's
> [Discord server](https://discord.gg/RmHTHj5gZ9), in the **`#assets`** channel, with the three variables ready
> to use. If you can't find them, check the **pinned messages** of that channel. Copy them into `hike-now/.env`
> and skip the `cp .env.example .env` step.

### Database setup

The base tables (`hiker`, `hike`, `review`, `follow`, `group`, `member`) already exist in the shared
Supabase project and are **not** created by the migrations. On the shared project the migrations below
are already applied, and they are safe to re-run (idempotent and transactional). Only run them against a
new or fresh copy of the database:

```bash
npm run db:auth            # sessions, rate limiting, password hashing (needs Node 22.18+)
npm run db:profiles        # join dates, display names
npm run db:chats           # direct and group conversations, messages
npm run db:review-photos   # Supabase Storage bucket for review photos
```

---

## Operational features (first prototype)

| Feature | Where | What works |
|---|---|---|
| Trail browsing | `/` | Trails are read from the `hike` table (PostgreSQL) and shown as cards. |
| Reviews | `/reviews`, `/reviews/[id]`, `/reviews/[id]/new` | List reviews, create/edit/delete your own review for a trail, with predefined tags, equipment tags and optional photos. |
| Sign up / Log in / Log out | `/login` | Password hashing (scrypt), HTTP-only session cookie (7 days), rate limiting. Protected pages redirect to `/login`. |
| Profile dashboard | `/profile`, `/profile/[id]` | Join date, review history, edit display name and bio, delete account (password confirmation). |
| Follow hikers | Profile pages | Follow/unfollow persisted in PostgreSQL. |
| Following feed | `/feed` | Reviews from the hikers you follow. |
| Search | `/search` | Search hikers (by name or handle) and trails. |
| Chats | `/chats` | Direct messages, message requests (accept / delete / block), group chats (2–14 invitees), @ mentions limited to other participants in the current chat, floating button-anchored hike pickers with name/location search for trail shares and hike proposals with RSVPs (no page resizing), auto-refresh every 10 s. |
| Light/dark theme | Navbar | Theme toggle. |

**Demo of a full vertical slice (UI → server → database → UI):**
1. Open `/login`, create an account (a row is written to `hiker`; a session is stored in `hiker_session`).
2. Open `/`, choose a trail and go to its review page, then submit a review (a row is written to `review`).
3. Open `/profile`: the review you just created is read back from the database and listed there.

Not implemented yet: distance tracking, email verification/account recovery, unblocking users, adding
members to an existing group chat.

---

## Development process

### Version control
- Default branch: `main`. Work is done in short-lived branches named `feature/<ticket>-<name>`, `fix/<name>`
  or `docs/<name>`, and merged into `main` through a **Pull Request**.
- Commit messages: a short imperative summary that says *what* and *why*, referencing the backlog ticket
  when there is one (e.g. `Add useFollow hook for follow button state updates (T3)`).
  Avoid messages such as "fixed bug".

### Bug tracking and backlog
- Work items and bugs are tracked in [GitHub Projects](https://github.com/orgs/MRU-COMP3504-F2026/projects/4/views/1)
  and GitHub Issues. Reference the issue number in the branch name, commit or PR (`#109`).

### Notable bug fixes
Bugs are fixed on their own branch (or inside the feature branch that introduced them) and merged through a Pull Request.
This is a list of the main fixes found in the history of `main`:

| Commits | Date | Author | Fix |
|---|---|---|---|
| [`18a001b`](https://github.com/MRU-COMP3504-F2026/HikeNow/commit/18a001b) | 22 Oct | Osval | Fixed a typo in a column name in the database schema (`lenght` → `length`). |
| [`bd964f3`](https://github.com/MRU-COMP3504-F2026/HikeNow/commit/bd964f3), [`6c72853`](https://github.com/MRU-COMP3504-F2026/HikeNow/commit/6c72853) | 28 Oct | Osval | Added and then corrected `generateStaticParams` on `/reviews/[id]` so the production build no longer fails. |
| [`9282aec`](https://github.com/MRU-COMP3504-F2026/HikeNow/commit/9282aec), [`0cb5c94`](https://github.com/MRU-COMP3504-F2026/HikeNow/commit/0cb5c94) | 28-29 Oct | Osval | Fixed navbar links after the route changes and updated the navbar test accordingly. |
| [`fb9eeeb`](https://github.com/MRU-COMP3504-F2026/HikeNow/commit/fb9eeeb) | 31 Oct | Osval | Fixed the file path used to save temporary reviews. |
| [`e33daff`](https://github.com/MRU-COMP3504-F2026/HikeNow/commit/e33daff), [`f31a3d1`](https://github.com/MRU-COMP3504-F2026/HikeNow/commit/f31a3d1), [`0d6f39e`](https://github.com/MRU-COMP3504-F2026/HikeNow/commit/0d6f39e) | 2 Nov | Osval | Fixed type (`any`) issues and the new-review page on `/reviews/[id]`; resolved merge conflicts (`01e416d`). |
| [`299f3a8`](https://github.com/MRU-COMP3504-F2026/HikeNow/commit/299f3a8) | 2 Nov | Jaime | Trail images were read from the `landmarks` field instead of `photo`. |
| [`f1a94f2`](https://github.com/MRU-COMP3504-F2026/HikeNow/commit/f1a94f2) | 5 Nov | Tadhg | Typed the profile editor test fixture (`ProfileDetails`) after adding chosen names and bios. |
| [`04ec95b`](https://github.com/MRU-COMP3504-F2026/HikeNow/commit/04ec95b) | 7 Nov | Haniya | Fixed the light/dark theme toggle failing in the test environment. |
| [`2fcf164`](https://github.com/MRU-COMP3504-F2026/HikeNow/commit/2fcf164) | 7 Nov | Tadhg | The review form is now tied to a specific trail: `/reviews/new` redirects to `/reviews` and an unknown trail id returns 404. |
| [`737e2d7`](https://github.com/MRU-COMP3504-F2026/HikeNow/commit/737e2d7) | 9 Nov | Jaime | The review photo preview (and its remove button) was drawn on top of the navbar while scrolling because the sticky header had no `z-index`; the header now has `z-50`. |
| — | 9 Nov | Tadhg | Fixed a flaky profile-save error test by waiting for the async save to finish before retrying; verifies the name and bio remain intact after a failed save. |

From now on, commit messages and Pull Requests for fixes should say *what* was broken and reference the issue number (for example `Fix trail images using photo instead of landmarks (#NN)`).

### Continuous integration
[`.github/workflows/ci.yml`](./.github/workflows/ci.yml) runs the `validate` job on every **push** and
every **pull request**, from the `hike-now` directory, on Node.js 22:

1. `npm ci`: reproducible install; fails if `package-lock.json` is out of sync.
2. `npm run lint`
3. `npm test`
4. `npm run build`, using the repository secrets `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL` and
   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions).

Rules: no secrets in the repository (`.env*` is ignored, only `.env.example` is committed);
the `validate` job should pass before merging; database migrations are never run automatically by CI;
Vercel handles deployment separately.

### Tests
Tests are co-located with the code (`*.test.ts` / `*.test.tsx`) and cover server actions, hooks,
libraries and components. Test setup cleans the JSDOM document between tests.

**Adding new tests**

1. Add a file next to the feature using the naming convention `*.test.tsx`.
2. Import `describe`, `it`, and `expect` from `vitest`.
3. Render React components with `render` from `@testing-library/react`.
4. Query the component the way a user would, preferably with `getByRole`, `getByLabelText`, or `getByText`.
5. Add assertions for the required behavior, including important states and user interactions.
6. Mock Next.js-only dependencies when necessary. Existing tests mock `next/link`, `next/navigation`, and
   `next/font/google` so components can run in JSDOM.
7. Run the tests locally with `npm test`.
8. New tests will automatically be configured without the need to change CI config.

---

## Appendix: CI platform comparison

| Platform | Pros for HikeNow | Cons for HikeNow |
|---|---|---|
| **GitHub Actions** | Natural fit for a GitHub repository. Runs `npm ci`, lint, tests and build, and integrates with Vercel previews. | Workflow files and secrets need maintenance. |
| **GitLab CI/CD** | Integrated repository, CI and environments. | Less compelling when the code is hosted on GitHub; extra runner setup. |
| **Azure Pipelines** | Strong governance and approvals for Azure-centred teams. | Extra setup without an Azure DevOps environment; Vercel is the intended host. |

**Decision:** GitHub Actions for CI and Vercel for hosting.
