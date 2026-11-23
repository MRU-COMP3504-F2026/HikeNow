# Hike Now!

Hike Now! is a web app where hikers discover trails, leave reviews (with tags, equipment and photos),
follow other hikers and chat with them (direct messages, group chats and hike proposals).

**Stack:** Next.js 16 (App Router, React 19, TypeScript, Tailwind 4) · Server Actions · Drizzle ORM ·
PostgreSQL on Supabase · Vitest + Testing Library · GitHub Actions.

**Where to find what**

| You are... | Read |
|---|---|
| A user who wants to try the app | [Live demo](#live-demo), [Browser and device requirements](#browser-and-device-requirements), [Operational features](#operational-features-first-prototype), [Chats, follows and message requests](#chats-follows-and-message-requests), [Work in progress](#work-in-progress-wip), [How to report a bug](#how-to-report-a-bug), [Known bugs](#known-bugs) |
| A developer who wants to contribute | [Quick start](#quick-start), [Build, test and run](#build-test-and-run), [Directory structure](#directory-structure), [Security, accounts and data notes](#security-accounts-and-data-notes), [Development process](#development-process), [Deployment](#deployment) |

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

## Browser and device requirements

Hike Now! is a web application: there is nothing to install to use it and no mobile app to download.

| Requirement | Details |
|---|---|
| Browser | A current version of **Chrome, Edge, Firefox or Safari**, with **JavaScript and cookies enabled** (login uses an HTTP-only session cookie). |
| Mobile and tablet | Works in the browser of a phone or tablet (iOS Safari, Android Chrome). The layout is responsive and the navbar adapts to small screens. |
| Connection | An internet connection is needed (trails, reviews, photos and chats are stored in the cloud). Chats refresh every 10 seconds while the page is open. |
| HTTPS | The hosted app is served over HTTPS (required in production because the session cookie is marked `Secure`). Locally, `http://localhost:3000` works. |
| Photos | Review photos must be JPEG, PNG, WebP or GIF, up to 6 MB each. |

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

The migration [`0007_hike_dates.sql`](./hike-now/app/db/migrations/0007_hike_dates.sql) (hike date on reviews) has no
npm script yet: on a fresh database, run it in the Supabase SQL editor or with
`psql "$DATABASE_URL" -f app/db/migrations/0007_hike_dates.sql`.

### Security, accounts and data notes

These notes come from the app's implementation and matter mostly when deploying or reviewing the project.

**Authentication and sessions**

- Passwords are hashed with salted scrypt. Login uses an HTTP-only session cookie, `Secure` in production (HTTPS required).
- Sessions last seven days, are stored only as SHA-256 token hashes, and are revoked on logout or replaced on login.
- Login and sign-up are limited to ten attempts per email per 15 minutes, using atomic database counters shared by all instances.
- This is application authentication, **not** a Supabase Auth JWT: it does not change `auth.uid()` and does not authenticate
  the optional Supabase client. `DATABASE_URL` must be a **server-only** connection; never expose it with a `NEXT_PUBLIC_` prefix.
- `npm run db:auth` is transactional and safe to rerun. Rerun it periodically to purge expired sessions and rate-limit records.
  Emails that differ only in case must be resolved before the first run, and unsupported legacy password hashes abort the
  setup instead of being overwritten.
- Public hiker data only exposes id, email, chosen name, bio and join date. Supabase anon/authenticated access to the password
  column and to sessions is removed by the setup.
- Signed-out visitors are redirected to `/login` when they open chats, the following feed or a review form, or try to follow
  someone. Trails, reviews and other hikers' profiles stay public. Sessions are re-checked on every action.
- Before a public deployment, configure ingress rate limiting for authentication requests and add email verification and
  account recovery.

**Profiles and accounts**

- Run `npm run db:profiles` **before** deploying the updated app. It is safe to rerun. Accounts and reviews created before it
  have no date: they show "Not recorded" and legacy reviews are listed after dated ones.
- A chosen name (up to 50 characters) appears on profiles, reviews, search and chats; leaving it blank falls back to the name
  derived from the email. The bio (up to 500 characters, line breaks allowed) is stored in `hiker.description`.
- Account deletion is only offered on your own dashboard and requires your current password. It cascades to reviews,
  memberships, follows and sessions. Uploaded photos in Supabase Storage are **not** deleted by the cascade and need a separate
  cleanup policy.

**Reviews and photos**

- Reviews are always tied to a specific trail: unknown trail IDs return 404 and `/reviews/new` redirects to `/reviews`.
- The server derives the review owner from the session (never from a client-sent ID); editing and deleting also require ownership.
- Photos use Supabase Storage with presigned uploads: a Server Action signs a path under `reviews/<hiker-id>/`, the browser
  uploads the file directly to the public `hike-reviews` bucket, and the review stores the public URL once the server confirms
  the object exists. Create the bucket and its policy once per Supabase project with `npm run db:review-photos`.

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
| Chats | `/chats` | Direct messages, message requests (accept / delete / block), group chats (2–14 invitees), @ mentions limited to other participants in the current chat, floating button-anchored hike pickers with name/location search for trail shares and hike proposals with RSVPs (no page resizing), auto-refresh every 10 s. Who can chat with whom: see [Chats, follows and message requests](#chats-follows-and-message-requests). |
| Light/dark theme | Navbar | Theme toggle. |
| Trail sorting | `/` | Sort trails by difficulty, length or name, and clear the sort. |
| Hike date and date filter | `/reviews/[id]`, review form | Reviews record the date of the hike and are shown newest first; they can be filtered by period. |

### Chats, follows and message requests

Chats are built around the follow relationship. In short: **a conversation only flows normally between
mutual followers** (both hikers follow each other); otherwise the recipient has to accept it first.

| Situation | What happens |
|---|---|
| You follow a hiker | A **Message** button appears on their profile, and they show up in the **New chat** picker (the picker only lists hikers you follow). |
| You do **not** follow a hiker | You cannot start a conversation with them. |
| You follow each other (mutual followers) | The chat goes straight to **Messages** and both of you can write freely. |
| You follow them, but they do not follow you back | They receive your message in **Requests** and can **Accept**, **Delete** (hide it for their account) or **Block**. Messages stay as a request until they accept or follow you back. |
| Someone who does not follow you, and whom you do not follow, writes to you | Not possible: they would first have to follow you. |
| You unfollow someone | Conversations that were already accepted stay usable; new conversations are not possible. |
| Blocking | Blocking stops **both** participants from sending further messages. Unblocking is not exposed yet (see [Work in progress](#work-in-progress-wip)). |

**Group chats**

- Open **New chat** and select one recipient for a direct chat (an existing conversation is reused), or 2-14 recipients
  for a group (3-15 members including you). Group names are optional; the members' names are used by default.
- You must follow every hiker you invite. Invitees who follow the creator see the group in **Messages**; the others see a
  request they can accept or decline (following the creator later moves the invitation to Messages).
- Group messages show their sender, and hike proposals collect each member's RSVP.
- Leaving is permanent and only affects that group. Adding members or rejoining a group is not supported yet.

**Messages and reliability**

- Text messages are 1-4000 characters. Trail shares, hike proposals and RSVPs are saved on the server.
- Chats refresh every 10 seconds while the page is visible, and immediately when you return to the page or reconnect.
- All reads and writes require a valid session and only participants can open a chat.
- A failed message keeps its draft. Delivery is retried with the same message ID, so a lost response cannot create
  duplicates. After a longer outage, attempts are retried every 10 seconds while the chat is open.
- Drafts are stored in the browser's local storage (per account and conversation) until the server confirms delivery.
  On a shared computer, clear the site data to remove them.
- Deleting an account removes its direct conversations and authored messages; group chats stay available to the
  remaining members.

**Demo of a full vertical slice (UI → server → database → UI):**
1. Open `/login`, create an account (a row is written to `hiker`; a session is stored in `hiker_session`).
2. Open `/`, choose a trail and go to its review page, then submit a review (a row is written to `review`).
3. Open `/profile`: the review you just created is read back from the database and listed there.

### Work in progress (WIP)

These features are planned for the final release but are **not available yet**:

| Feature | Status |
|---|---|
| Trail status (mark a trail as started, completed or withdrawn) | WIP |
| Total distance hiked on the profile (distance tracking) | WIP |
| Trail landmarks on reviews (picker in the review form and badges on review cards) | WIP |
| Sorting reviews alphabetically, by length and by difficulty | WIP |
| Email verification and account recovery | WIP |
| Unblocking users in chats | WIP |
| Adding members to an existing group chat | WIP |

The weather integration was removed from the plan because it does not fit the project's budget ($0).

---

## How to report a bug

Report bugs with our **bug report form** on GitHub: [**Report a bug**](https://github.com/MRU-COMP3504-F2026/HikeNow/issues/new?template=bug_report.yml).
The form opens with every field we need already in place and adds the `bug` label for you, so you only have to fill it in.
If the link does not open the form, go to *Issues → New issue → Bug report*.

A good report lets someone else reproduce the problem without asking you questions. The form asks for:

1. **Title:** one line that says what is broken (for example "Review photo preview covers the navbar").
2. **What happened** and **what you expected to happen**.
3. **Steps to reproduce:** numbered steps, starting from a page or from the demo account.
4. **Where:** page URL (for example `/reviews/12`) and whether you used the live demo or a local build.
5. **Environment:** browser and version, operating system, desktop or phone/tablet.
6. **Evidence:** a screenshot or short screen recording, and any error message (browser console, red error box).
7. **How often** it happens (always, sometimes, once) and how serious it is (blocks you, annoying, cosmetic).

Do not include passwords, session cookies or the contents of your `.env` file. The demo account is safe to mention.
The form is defined in [`.github/ISSUE_TEMPLATE/bug_report.yml`](./.github/ISSUE_TEMPLATE/bug_report.yml).

More on writing good bug reports: [Bug Writing Guidelines (Mozilla)](https://developer.mozilla.org/en-US/docs/Mozilla/QA/Bug_writing_guidelines)
and [How to Write a Good Bug Report (marker.io)](https://marker.io/blog/how-to-write-bug-report).

## Known bugs

**There are no known open bugs in this release.** Missing functionality is listed under
[Work in progress](#work-in-progress-wip); bugs that were already fixed are listed under
[Notable bug fixes](#notable-bug-fixes). Open bugs, if any are found later, are tracked in the
[GitHub issue tracker](https://github.com/MRU-COMP3504-F2026/HikeNow/issues?q=is%3Aissue+label%3Abug).

**Known limitations** (missing features, setup gaps and security notes that are not bugs) are logged as issues with the
[`limitation` label](https://github.com/MRU-COMP3504-F2026/HikeNow/issues?q=is%3Aissue+label%3Alimitation).

---

## Directory structure

```text
HikeNow/
├── .github/workflows/ci.yml   # CI: install, lint, test and build on every push and pull request
├── P02-Team Contract          # team contract (course deliverable)
├── README.md                  # this file: user manual and developer guide
└── hike-now/                  # the Next.js application: run every npm command from here
    ├── app/
    │   ├── actions/           # Server Actions with the database logic (auth, account, profile, reviews,
    │   │                      #   hikes, follows, chats, group chats, members) and their tests
    │   ├── components/        # reusable React components (navbar, cards, forms, chat UI, filters) and tests
    │   ├── hooks/             # custom React hooks (useFollow, useChats, ...) and tests
    │   ├── lib/               # helpers without UI: password hashing, sessions, rate limiting, validation,
    │   │                      #   review tags and dates, hiker search, and tests
    │   ├── db/                # Drizzle schema (schema.ts), database connections and SQL migrations/
    │   ├── chats/             # /chats page and its helpers (types, constants, utils)
    │   ├── feed/ login/ profile/ reviews/ search/   # one folder per route, each with its page.tsx
    │   ├── layout.tsx         # root layout (navbar, footer, theme)
    │   └── page.tsx           # home page: trail browsing
    ├── scripts/               # one-off database setup scripts (db:auth, db:profiles, db:chats, db:review-photos)
    ├── .env.example           # template for the environment variables (copy to .env)
    ├── package.json           # dependencies and npm scripts (dev, build, lint, test, db:*)
    └── eslint / tsconfig / next / vitest config files
```

Tests live **next to the code they test** (`*.test.ts` / `*.test.tsx`); see [Tests](#tests).
Documentation lives in this README; the weekly reports and the living document are in the team's
[shared Google folder](https://drive.google.com/drive/folders/1Eg1H2vX3lAmY02DvXf1szu-1euWe6Js_?usp=sharing).

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

### Deployment

The live demo ([hike-now.vercel.app](https://hike-now.vercel.app/)) is hosted on **Vercel**, which is connected to this
GitHub repository. Deploying is automatic; nothing is run by hand.

| Item | Setting |
|---|---|
| Vercel project | `HikeNow`, linked to the `MRU-COMP3504-F2026/HikeNow` repository |
| Production branch | `main`: every merge into `main` triggers a new production deployment |
| Preview deployments | Vercel builds a preview for every pull request and branch push |
| Root directory | `hike-now` (the app is in a subfolder of the repository) |
| Build command | `npm run build` (Next.js default) |
| Environment variables | `DATABASE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, set in Vercel under *Settings → Environment Variables* (the same three variables as in [Environment variables](#environment-variables)) |

**To deploy a change**

1. Open a Pull Request and wait for the `validate` CI job to pass (see [Continuous integration](#continuous-integration)).
2. Merge the Pull Request into `main`. Vercel starts the production deployment on its own.
3. If the change adds a database migration, apply it to the shared Supabase project **before** merging
   (see [Database setup](#database-setup)). Migrations are never run by CI or by Vercel.
4. Check the result: open the live demo, log in with the demo account, and post a review.

**If a deployment fails or breaks the app:** in Vercel open *Deployments*, pick the last good deployment and choose
*Promote to Production* (instant rollback), then fix the problem in a new Pull Request.

**Production notes:** the session cookie is `Secure`, so production must be served over HTTPS (Vercel does this by
default), and the build needs internet access to download the fonts. Rate limiting at the network level for the login
endpoint is not configured yet (see the known limitations).

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
