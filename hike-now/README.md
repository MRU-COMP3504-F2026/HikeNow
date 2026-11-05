This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Authentication and database setup

The `/login` screen reuses the app's Login/Sign up tabs and shared styling.
It calls the server actions in `app/actions/auth.ts`; successful login or signup
sets an HTTP-only session cookie and navigates to the trails page. The navbar
shows the current account and provides Log out on desktop and mobile.

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

Public hiker actions return only id, email, and description. The setup also
removes Supabase anon/authenticated access to the password column and sessions.
Sessions expire after seven days, store only SHA-256 token hashes in PostgreSQL,
and are revoked on logout or replaced on login. Production requires HTTPS
because cookies are marked Secure.
Login/account creation is limited to ten attempts per normalized email per
15-minute window using atomic database counters shared across app instances.
Rerun `db:auth` periodically to remove expired sessions and rate-limit records.

This is application authentication, **not** a Supabase Auth JWT: it does not
change `auth.uid()` or authenticate the optional Supabase client. Chats and
review/follow controls that currently use mock behavior are otherwise unchanged.
Before public deployment, configure ingress rate limiting for authentication
requests and add account recovery/email verification as needed.

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
