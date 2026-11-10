This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Authentication and database setup

The `/login` screen reuses the app's Login/Sign up tabs and shared styling.
It calls the server actions in `app/actions/auth.ts`; successful login or signup
sets an HTTP-only session cookie and navigates to the trails page. The navbar
shows the current account, links to its profile dashboard, and provides Log out
on desktop and mobile.

Set `DATABASE_URL` in `.env` to a **server-only PostgreSQL connection** with
permission to access the existing tables and bypass their RLS policies (the
existing Drizzle actions use this connection, not Supabase Auth).
Never expose this URL with a `NEXT_PUBLIC_` prefix.

After installing dependencies, run the additive authentication setup once:

```bash
# Requires Node.js 22.18+ for the setup script's TypeScript import.
npm run db:auth
```

This creates `hiker_session`, adds a case-insensitive email unique index, and
hashes legacy plaintext passwords in `hiker.password` using salted scrypt.
It is transactional and safe to rerun. Existing email duplicates differing
only in case must be resolved first; unsupported legacy hashes abort the setup
rather than being silently overwritten.

Public hiker actions return only id, email, chosen name, bio (description), and join date. The setup also
removes Supabase anon/authenticated access to the password column and sessions.
Sessions expire after seven days, store only SHA-256 token hashes in PostgreSQL,
and are revoked on logout or replaced on login. Production requires HTTPS
because cookies are marked Secure.
Login/account creation is limited to ten attempts per normalized email per
15-minute window using atomic database counters shared across app instances.
Rerun `db:auth` periodically to remove expired sessions and rate-limit records.

This is application authentication, **not** a Supabase Auth JWT: it does not
change `auth.uid()` or authenticate the optional Supabase client.
Signed-out visitors are redirected to `/login` when opening chats, the
following feed, or a review form, or when attempting to follow someone.
Chat actions and follow controls recheck the session when used, including
after a session expires; review and account mutations also redirect if the
session has ended.
Public trails, reviews, and other hikers' profiles remain accessible.
Before public deployment, configure ingress rate limiting for authentication
requests and add account recovery/email verification as needed.

### Profile dashboard and reviews

After the authentication setup, run the additive profile migration:

```bash
npm run db:profiles
```

This adds join dates for new accounts, creation dates for new reviews, and an
optional `display_name` column for chosen names.
Existing dates remain unknown: legacy accounts display "Not recorded", and
legacy reviews are listed after dated reviews. The migration is transactional
and safe to rerun; deploy it before starting the updated application.
Cached profile and review reads return dates as ISO strings so their types
remain consistent across cache hits. Session reads wait for a real request
before checking expiry; they are not evaluated during prerendering.

Click the avatar or email in the navbar to open `/profile`, which redirects to
your dashboard. It shows the join date and complete review history, newest
first, with links to the reviewed trails. Distance tracking is deferred.
Select **Edit profile** on your dashboard to set a name (up to 50 characters)
and a bio (up to 500 characters, line breaks allowed). The server saves them
only for the signed-in hiker. A chosen name is shown on profiles, reviews,
search, and chats; leaving it blank restores the name derived from your email.
The bio is stored in the existing `hiker.description` column.
Review forms require login; the server derives ownership from the session,
never from a client-provided hiker ID. Review updates and deletion also require
ownership. Failed saves display an error instead of a success confirmation.
Optional photo uploads still require the configured Supabase storage bucket.

Only your own dashboard shows account deletion. You must confirm with your
current password. Database foreign keys cascade deletion to reviews,
memberships, follows, and every session; the browser cookie is cleared and you
are redirected to login. Uploaded storage objects are not deleted by database
cascades and require a separate storage retention/cleanup policy.

### Following, direct messages, and group chats

Before deploying the chat changes, run the additive, transactional migration:

```bash
npm run db:chats
```

It creates private conversations, per-hiker request/read/block state, and messages,
and upgrades existing direct conversations for group chats without replacing them.
It is safe to rerun and uses the same server-only database connection as authentication.
No mock conversations are imported. Deleting an account removes its direct
conversations and authored messages; group chats remain available to their other members.

Follow on a public profile now saves the relationship to PostgreSQL. Following
shows a Message button; click it to open the existing conversation or create one.
Chats also offers conversation starters for the hikers you follow.
New conversations require following the recipient. Existing accepted conversations
remain usable after unfollowing. Incoming messages appear in Requests unless you
follow the sender or previously accepted the conversation. Accept, Delete (hide for
your account), and Block are persisted; blocking prevents both participants sending
further messages. Unblocking is not yet exposed.

Choose **New chat** in Chats to open the recipient picker. Search the hikers
you follow by name or handle, use **+** to add them to **To**, and remove
recipients before starting if needed. Select one recipient for a direct chat
(reusing an existing conversation), or 2-14 for a group (3-15 members including
you). Group names are optional; by default the selected hikers' names are used.
Each group is saved separately,
even when it has the same members as another group. Invitees who follow the
creator see the group in Messages; others see a request that they can accept
or decline. Following the creator later also moves the invitation to Messages.
Group messages identify their sender, and hike proposals collect each member's
RSVP. Group members can leave after confirmation; declining or leaving affects
only that group and does not stop the remaining members from chatting. Leaving
is permanent for that group; adding members or rejoining an existing group is
not yet supported.

Text messages (1-4000 characters), trail shares, hike proposals, and individual RSVPs
are saved server-side. Trail cards use actual database trails. Chats refreshes every
10 seconds while the page is visible, so incoming messages appear without reloading.
All reads and mutations require a valid session; only participants can access a chat.
Failed actions display an error and failed message saves retain the draft.
Confirmed outgoing messages are reconciled by ID rather than discarded by older
refresh responses or server-rendered snapshots. Failed delivery requests retry
twice with the same message ID, so a response lost after a database commit cannot
create a duplicate. Text drafts and their delivery IDs are saved in this browser,
separately for each account and conversation, and restored when reopening a chat.
They are removed only after the server acknowledges delivery. After a sustained
outage, the error remains visible and attempted text messages retry every ten
seconds while their chat is open and visible, and immediately on reconnecting.
Reopening the chat restores the pending attempt and resumes retries; unsent text
that was never submitted is not sent automatically. Editing a pending draft
stops its automatic retries and starts a new draft. Delivery still requires a
valid session, connectivity, and an unblocked conversation; an unsent draft is
never presented as a delivered message.
Drafts contain message text in browser local storage, so use a trusted browser
and clear site data to remove retained drafts from a shared device.
Returning to the page or reconnecting also refreshes incoming messages immediately.

Run the optional PostgreSQL integration tests with `CHAT_INTEGRATION=1 npm test --
app/actions/chats.integration.test.ts app/actions/group-chats.integration.test.ts`
after applying the migration. They create isolated test accounts/trails, exercise
direct and group conversations, and remove only their own fixtures afterward.
The regular `npm test` run skips these database tests.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

### Review photos

Start a review from a specific trail's review page. The form is locked to that
trail; unknown trail IDs return 404, and `/reviews/new` redirects to `/reviews`.

Review photos use Supabase Storage standard uploads with presigned URLs: a signed-in
hiker's Server Action signs an upload path under `reviews/<hiker-id>/`, the browser uploads
the file straight to the public `hike-reviews` bucket, and the review stores the photo's
public URL after the server confirms the object exists. Create the bucket (JPEG, PNG, WebP,
or GIF, up to 6MB) and its upload policy once per Supabase project:

```bash
npm run db:review-photos
```
